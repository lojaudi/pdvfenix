import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCatalogUnlocked() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "catalog_unlocked")
      .maybeSingle();
    setUnlocked(data?.value === "true");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const toggle = useCallback(async () => {
    const newValue = !unlocked;
    await supabase
      .from("app_settings")
      .upsert({ key: "catalog_unlocked", value: String(newValue) });
    setUnlocked(newValue);
  }, [unlocked]);

  return { unlocked, loading, toggle, refetch: fetch };
}
