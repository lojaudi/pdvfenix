import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeOrdersWithSound } from "@/hooks/useRealtimeOrdersWithSound";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Loader2, Wallet, CheckCircle2, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { ReceiptPrint, triggerPrint, type ReceiptData } from "@/components/pos/ReceiptPrint";
import { toast } from "sonner";

import type { PaymentMethod } from "@/components/pos/PaymentDialog";

interface PendingOrder {
  id: string;
  channel: string;
  table_number: number | null;
  customer_name: string | null;
  status: string;
  total: number;
  created_at: string;
  user_id: string | null;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
  profiles: { name: string; email: string | null } | null;
}

const channelLabels: Record<string, string> = {
  balcao: "Balcão", garcom: "Garçom", delivery: "Delivery",
};

const QUERY_KEY = ["cashier-orders"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function buildReceiptData(order: PendingOrder, paymentMethod?: string): ReceiptData {
  return {
    orderId: order.id,
    channel: order.channel,
    tableNumber: order.table_number,
    customerName: order.customer_name,
    waiterName: order.profiles?.name || null,
    items: order.order_items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
    total: order.total,
    paymentMethod: paymentMethod || null,
    createdAt: order.created_at,
    paidAt: paymentMethod ? new Date().toISOString() : undefined,
  };
}

export default function CashierPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  useRealtimeOrdersWithSound(QUERY_KEY);

  const { data: orders, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(id, product_name, quantity, unit_price)")
        .in("status", ["entregue", "aberto", "preparando", "pronto"])
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data || []).map(o => o.user_id).filter(Boolean))] as string[];
      let profilesMap: Record<string, { name: string; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, email")
          .in("user_id", userIds);
        profiles?.forEach(p => { profilesMap[p.user_id] = { name: p.name, email: p.email }; });
      }

      return (data as any[]).map(o => ({
        ...o,
        profiles: o.user_id ? profilesMap[o.user_id] || null : null,
      })) as PendingOrder[];
    },
  });

  const pendingPayment = orders?.filter(o => o.status === "entregue") || [];
  const inProgress = orders?.filter(o => ["aberto", "preparando", "pronto"].includes(o.status)) || [];

  const handlePrintOrder = (order: PendingOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setReceiptData(buildReceiptData(order));
    triggerPrint();
  };

  const handlePayment = async (method: PaymentMethod, changeValue?: number) => {
    if (!selectedOrder) return;

    const { error } = await supabase
      .from("orders")
      .update({ status: "pago" as any, payment_method: method as any })
      .eq("id", selectedOrder.id);

    if (error) {
      toast.error("Erro ao registrar pagamento");
      return;
    }

    // Free table if garçom order
    if (selectedOrder.channel === "garcom" && selectedOrder.table_number) {
      await supabase
        .from("tables")
        .update({ status: "livre" as any, current_order_id: null })
        .eq("number", selectedOrder.table_number);
    }

    const changeMsg = method === "dinheiro" && changeValue ? ` • Troco: ${formatCurrency(changeValue)}` : "";
    toast.success(
      `Pagamento confirmado! ${formatCurrency(selectedOrder.total)} via ${method.toUpperCase()}${
        selectedOrder.table_number ? ` • Mesa ${selectedOrder.table_number} liberada` : ""
      }${changeMsg}`
    );

    setReceiptData(buildReceiptData(selectedOrder, method));
    triggerPrint();

    setSelectedOrder(null);
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
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
      <header className="border-b border-border px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors min-h-[44px]" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Caixa</h1>
              <p className="text-xs text-muted-foreground">
                {pendingPayment.length} aguardando pagamento • {inProgress.length} em andamento
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-8">
        {/* Awaiting Payment Section */}
        <section aria-label="Pedidos aguardando pagamento">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" aria-hidden="true" />
            <h2 className="text-sm font-bold text-foreground">Aguardando Pagamento</h2>
            <Badge variant="secondary">{pendingPayment.length}</Badge>
          </div>

          {pendingPayment.length === 0 ? (
            <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
              <CheckCircle2 className="w-5 h-5 mr-2 opacity-50" aria-hidden="true" />
              Nenhum pedido aguardando pagamento
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingPayment.map((order) => (
                <Card key={order.id} className="border bg-card border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {channelLabels[order.channel] || order.channel}
                        </Badge>
                        {order.table_number && (
                          <span className="text-sm font-bold text-foreground">Mesa {order.table_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handlePrintOrder(order, e)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Imprimir comanda ${order.table_number ? `Mesa ${order.table_number}` : ''}`}
                          title="Imprimir comanda"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(order.created_at), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {order.profiles && (
                      <p className="text-xs text-muted-foreground truncate">🧑‍🍳 {order.profiles.name || order.profiles.email}</p>
                    )}
                    {order.customer_name && (
                      <p className="text-xs text-muted-foreground truncate">👤 {order.customer_name}</p>
                    )}

                    <div className="space-y-1">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-foreground">{item.quantity}x {item.product_name}</span>
                          <span className="text-muted-foreground">{formatCurrency(item.quantity * item.unit_price)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-xs font-bold text-foreground">Total</span>
                      <span className="font-mono text-lg font-bold text-primary">{formatCurrency(order.total)}</span>
                    </div>

                    <button className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity min-h-[44px]">
                      💳 Receber Pagamento
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* In Progress Section */}
        <section aria-label="Pedidos em andamento">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-blue-500" aria-hidden="true" />
            <h2 className="text-sm font-bold text-foreground">Em Andamento</h2>
            <Badge variant="secondary">{inProgress.length}</Badge>
          </div>

          {inProgress.length === 0 ? (
            <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
              Nenhum pedido em andamento
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {inProgress.map((order) => (
                <Card key={order.id} className="border bg-card border-border/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {channelLabels[order.channel] || order.channel}
                        </Badge>
                        {order.table_number && (
                          <span className="text-xs font-semibold text-foreground">Mesa {order.table_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handlePrintOrder(order, e)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Imprimir comanda"
                          title="Imprimir comanda"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <Badge variant="secondary" className="text-[10px]">{order.status}</Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{order.order_items.length} itens</span>
                      <span className="font-mono text-sm font-bold text-primary">{formatCurrency(order.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedOrder && (
        <PaymentDialog
          total={selectedOrder.total}
          onConfirm={handlePayment}
          onClose={() => setSelectedOrder(null)}
          channel={selectedOrder.channel}
        />
      )}

      {/* Hidden receipt for printing */}
      {receiptData && <ReceiptPrint data={receiptData} />}
    </div>
  );
}
