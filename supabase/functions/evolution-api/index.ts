import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getEvolutionConfig(supabase: any) {
  const keys = ["evolution_api_url", "evolution_api_key", "evolution_instance_name"];
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", keys);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => {
    map[r.key] = r.value;
  });
  return {
    url: map.evolution_api_url || "",
    apiKey: map.evolution_api_key || "",
    instanceName: map.evolution_instance_name || "",
  };
}

async function evolutionFetch(baseUrl: string, apiKey: string, path: string, options: RequestInit = {}) {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Evolution API [${res.status}]: ${JSON.stringify(body)}`);
  }
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { action, ...params } = await req.json();
    const config = await getEvolutionConfig(supabase);

    if (!config.url || !config.apiKey) {
      return json({ error: "Evolution API não configurada" }, 400);
    }

    switch (action) {
      case "create-instance": {
        const instanceName = params.instanceName || config.instanceName;
        if (!instanceName) return json({ error: "Nome da instância não informado" }, 400);
        const result = await evolutionFetch(config.url, config.apiKey, "/instance/create", {
          method: "POST",
          body: JSON.stringify({
            instanceName,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
          }),
        });
        return json(result);
      }

      case "get-qrcode": {
        const instanceName = params.instanceName || config.instanceName;
        if (!instanceName) return json({ error: "Nome da instância não informado" }, 400);
        const result = await evolutionFetch(config.url, config.apiKey, `/instance/connect/${instanceName}`);
        return json(result);
      }

      case "instance-status": {
        const instanceName = params.instanceName || config.instanceName;
        if (!instanceName) return json({ error: "Nome da instância não informado" }, 400);
        const result = await evolutionFetch(config.url, config.apiKey, `/instance/connectionState/${instanceName}`);
        return json(result);
      }

      case "send-message": {
        const { phone, message, instanceName: inst } = params;
        const instanceName = inst || config.instanceName;
        if (!instanceName || !phone || !message) {
          return json({ error: "Campos obrigatórios: phone, message" }, 400);
        }
        // Format phone: remove non-digits, ensure country code
        const cleanPhone = phone.replace(/\D/g, "");
        const result = await evolutionFetch(config.url, config.apiKey, `/message/sendText/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            number: cleanPhone,
            text: message,
          }),
        });
        return json(result);
      }

      case "notify-drivers": {
        // Send WhatsApp to all available drivers about a ready delivery
        const { orderId } = params;
        if (!orderId) return json({ error: "orderId obrigatório" }, 400);

        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceKey);

        // Get order + delivery details
        const { data: delivery } = await adminClient
          .from("delivery_details")
          .select("*, orders!delivery_details_order_id_fkey(id, total, customer_name, order_items(product_name, quantity))")
          .eq("order_id", orderId)
          .maybeSingle();

        if (!delivery) return json({ error: "Entrega não encontrada" }, 404);

        // Get available drivers
        const { data: drivers } = await adminClient
          .from("delivery_drivers")
          .select("name, phone")
          .eq("is_available", true);

        if (!drivers || drivers.length === 0) {
          return json({ message: "Nenhum entregador disponível" });
        }

        const order = delivery.orders as any;
        const items = order?.order_items?.map((i: any) => `  ${i.quantity}x ${i.product_name}`).join("\n") || "";
        const customerName = order?.customer_name || "Cliente";
        const total = `R$ ${(order?.total || 0).toFixed(2)}`;
        const fee = `R$ ${(delivery.delivery_fee || 0).toFixed(2)}`;

        const msg =
          `🛵 *Nova entrega disponível!*\n\n` +
          `👤 *Cliente:* ${customerName}\n` +
          `📍 *Endereço:* ${delivery.delivery_address}\n` +
          `📞 *Telefone:* ${delivery.customer_phone}\n\n` +
          `📦 *Itens:*\n${items}\n\n` +
          `💰 *Total:* ${total}\n` +
          `🚚 *Taxa de entrega:* ${fee}\n\n` +
          `Acesse o painel para aceitar a entrega!`;

        const results = [];
        for (const driver of drivers) {
          try {
            const cleanPhone = driver.phone.replace(/\D/g, "");
            if (cleanPhone.length < 10) continue;
            await evolutionFetch(config.url, config.apiKey, `/message/sendText/${config.instanceName}`, {
              method: "POST",
              body: JSON.stringify({ number: cleanPhone, text: msg }),
            });
            results.push({ driver: driver.name, status: "sent" });
          } catch (err) {
            results.push({ driver: driver.name, status: "error", error: String(err) });
          }
        }

        return json({ results });
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    console.error("Evolution API error:", err);
    return json({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
  }
});
