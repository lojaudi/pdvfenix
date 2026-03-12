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

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) throw new Error("Sem permissão de administrador");

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, name } = payload;
      if (!email || !password || !name) throw new Error("Campos obrigatórios: email, password, name");

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (authError) throw authError;

      const userId = authData.user.id;

      // Profile is created by trigger, but upsert to be safe
      await supabaseAdmin.from("profiles").upsert({ user_id: userId, name, email });

      // Assign roles if provided
      if (payload.roles && payload.roles.length > 0) {
        const roleInserts = payload.roles
          .filter((r: string) => r !== "entregador")
          .map((role: string) => ({ user_id: userId, role }));
        if (roleInserts.length > 0) {
          await supabaseAdmin.from("user_roles").insert(roleInserts);
        }

        // Handle entregador - create delivery_drivers record
        if (payload.roles.includes("entregador")) {
          await supabaseAdmin.from("delivery_drivers").insert({
            name,
            phone: payload.phone || "",
            user_id: userId,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { userId, name, email, password } = payload;
      if (!userId) throw new Error("userId é obrigatório");

      const updateData: any = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      if (name) updateData.user_metadata = { name };

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
        if (error) throw error;
      }

      // Update profile
      const profileUpdate: any = {};
      if (name) profileUpdate.name = name;
      if (email) profileUpdate.email = email;
      if (Object.keys(profileUpdate).length > 0) {
        await supabaseAdmin.from("profiles").update(profileUpdate).eq("user_id", userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { userId } = payload;
      if (!userId) throw new Error("userId é obrigatório");
      if (userId === caller.id) throw new Error("Não é possível excluir a si mesmo");

      // Remove delivery_drivers record
      await supabaseAdmin.from("delivery_drivers").delete().eq("user_id", userId);
      // Remove roles
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      // Remove profile
      await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
      // Delete auth user
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_roles") {
      const { userId, roles, phone } = payload;
      if (!userId) throw new Error("userId é obrigatório");

      // Get current roles
      const { data: currentRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const currentRoleNames = (currentRoles || []).map((r: any) => r.role);
      const dbRoles = roles.filter((r: string) => r !== "entregador");
      
      // Remove roles not in new list
      const toRemove = currentRoleNames.filter((r: string) => !dbRoles.includes(r));
      for (const role of toRemove) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      }

      // Add new roles
      const toAdd = dbRoles.filter((r: string) => !currentRoleNames.includes(r));
      if (toAdd.length > 0) {
        await supabaseAdmin.from("user_roles").insert(
          toAdd.map((role: string) => ({ user_id: userId, role }))
        );
      }

      // Handle entregador
      const { data: existingDriver } = await supabaseAdmin
        .from("delivery_drivers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (roles.includes("entregador") && !existingDriver) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("name")
          .eq("user_id", userId)
          .maybeSingle();
        await supabaseAdmin.from("delivery_drivers").insert({
          name: profile?.name || "",
          phone: phone || "",
          user_id: userId,
        });
      } else if (!roles.includes("entregador") && existingDriver) {
        await supabaseAdmin.from("delivery_drivers").delete().eq("user_id", userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
