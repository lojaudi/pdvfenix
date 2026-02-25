import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderWithItems {
  id: string;
  channel: string;
  table_number: number | null;
  customer_name: string | null;
  status: string;
  payment_method: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(id, product_name, quantity, unit_price)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrderWithItems[];
    },
  });
}
