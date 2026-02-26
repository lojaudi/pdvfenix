import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DbCategory = {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
};

export type DbProduct = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  stock_qty: number;
  in_stock: boolean;
  image_url: string | null;
};

export function useProducts() {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [catRes, prodRes] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products").select("*").order("name"),
    ]);

    if (catRes.data) setCategories(catRes.data as DbCategory[]);
    if (prodRes.data) setProducts(prodRes.data as DbProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime stock updates
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setProducts((prev) =>
              prev.map((p) => (p.id === (payload.new as DbProduct).id ? (payload.new as DbProduct) : p))
            );
          } else {
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { categories, products, loading, refetch: fetchData };
}
