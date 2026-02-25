import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
      setIsAdmin(!!data);
      setLoading(false);
    };
    check();
  }, []);

  return { isAdmin, loading };
}
