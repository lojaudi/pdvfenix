import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useKitchenRealtime } from "@/hooks/useKitchenRealtime";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Loader2, ChefHat, CheckCircle2, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface KitchenOrder {
  id: string;
  channel: string;
  table_number: number | null;
  customer_name: string | null;
  status: string;
  total: number;
  created_at: string;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number; notes: string | null }[];
}

const channelLabels: Record<string, string> = {
  balcao: "Balcão",
  garcom: "Garçom",
  delivery: "Delivery",
};

const QUERY_KEY = ["kitchen-orders"];

export default function KitchenPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  useKitchenRealtime(QUERY_KEY);

  const { data: orders, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, channel, table_number, customer_name, status, total, created_at, order_items(id, product_name, quantity, unit_price)")
        .in("status", ["preparando"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as KitchenOrder[];
    },
  });

  const markReady = async (order: KitchenOrder) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "pronto" as any })
      .eq("id", order.id);
    if (error) {
      toast.error("Erro ao marcar como pronto");
    } else {
      toast.success("Pedido marcado como Pronto! ✅");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });

      // Notify drivers for delivery orders
      if (order.channel === "delivery") {
        try {
          await supabase.functions.invoke("evolution-api", {
            body: { action: "notify-drivers", orderId: order.id },
          });
        } catch (err) {
          console.error("WhatsApp notification error:", err);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                Cozinha
              </h1>
              <p className="text-xs text-muted-foreground">
                {orders?.length || 0} pedido{(orders?.length || 0) !== 1 ? "s" : ""} em preparo
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-6">
        {(!orders || orders.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-4">
            <CheckCircle2 className="w-16 h-16 text-primary/30" />
            <p className="text-lg font-semibold">Nenhum pedido em preparo</p>
            <p className="text-sm">Novos pedidos aparecerão aqui automaticamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="border bg-card border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {channelLabels[order.channel] || order.channel}
                      </Badge>
                      {order.table_number && (
                        <span className="text-sm font-bold text-foreground">Mesa {order.table_number}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {order.customer_name && (
                    <p className="text-xs text-muted-foreground truncate">👤 {order.customer_name}</p>
                  )}

                  {/* Items - Large and clear for kitchen */}
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-primary text-base min-w-[2rem]">{item.quantity}x</span>
                        <span className="text-foreground font-medium">{item.product_name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Ready button - Large and prominent */}
                  <button
                    onClick={() => markReady(order)}
                    className={cn(
                      "w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                      "bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]"
                    )}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Marcar como Pronto
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
