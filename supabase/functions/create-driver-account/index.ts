import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Não autenticado");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Sem permissão");

    const { email, password, name, phone } = await req.json();
    if (!email || !password || !name || !phone) {
      throw new Error("Campos obrigatórios: email, password, name, phone");
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (authError) throw authError;

    const userId = authData.user.id;

    // Create profile
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      name,
      email,
    });

    // Assign attendant role so driver can view orders/items via RLS
    await supabaseAdmin.from("user_roles").upsert({
      user_id: userId,
      role: "attendant",
    }, { onConflict: "user_id" });

    // Create driver record linked to user
    const { data: driver, error: driverError } = await supabaseAdmin
      .from("delivery_drivers")
      .insert({ name, phone, user_id: userId })
      .select()
      .single();
    if (driverError) throw driverError;

    return new Response(JSON.stringify({ success: true, driver, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
