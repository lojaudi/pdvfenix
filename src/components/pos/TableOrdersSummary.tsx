import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TableOrdersSummaryProps {
  tableNumber: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface OrderWithItems {
  id: string;
  status: string;
  total: number;
  created_at: string;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
}

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  preparando: "Preparando",
  pronto: "Pronto",
  entregue: "Entregue",
};

export function TableOrdersSummary({ tableNumber }: TableOrdersSummaryProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["table-orders-summary", tableNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total, created_at, order_items(id, product_name, quantity, unit_price)")
        .eq("table_number", tableNumber)
        .eq("channel", "garcom")
        .in("status", ["aberto", "preparando", "pronto", "entregue"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as OrderWithItems[];
    },
    enabled: !!tableNumber,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Carregando pedidos...
      </div>
    );
  }

  if (!orders || orders.length === 0) return null;

  // Aggregate all items across orders
  const allItems: Record<string, { name: string; qty: number; total: number }> = {};
  orders.forEach((order) => {
    order.order_items.forEach((item) => {
      if (allItems[item.product_name]) {
        allItems[item.product_name].qty += item.quantity;
        allItems[item.product_name].total += item.quantity * item.unit_price;
      } else {
        allItems[item.product_name] = {
          name: item.product_name,
          qty: item.quantity,
          total: item.quantity * item.unit_price,
        };
      }
    });
  });

  const grandTotal = orders.reduce((sum, o) => sum + o.total, 0);
  const itemList = Object.values(allItems);

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            Pedidos da Mesa {tableNumber}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {orders.length} pedido{orders.length > 1 ? "s" : ""}
          </Badge>
        </div>
        <span className="font-mono text-sm font-bold text-primary">
          {formatCurrency(grandTotal)}
        </span>
      </div>

      <div className="space-y-1 max-h-32 overflow-y-auto">
        {itemList.map((item) => (
          <div key={item.name} className="flex justify-between text-xs">
            <span className="text-foreground">
              {item.qty}x {item.name}
            </span>
            <span className="text-muted-foreground">{formatCurrency(item.total)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {orders.map((order, i) => (
          <Badge key={order.id} variant="outline" className="text-[10px]">
            #{i + 1} • {statusLabels[order.status] || order.status}
          </Badge>
        ))}
      </div>
    </div>
  );
}
