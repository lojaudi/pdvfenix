import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "attendant" | "waiter" | "caixa" | "kitchen";

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setRole((data?.role as AppRole) ?? null);
      setLoading(false);
    };
    check();
  }, []);

  return { role, isAdmin: role === "admin", isWaiter: role === "waiter", isCashier: role === "caixa", loading };
}
