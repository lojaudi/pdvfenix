import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeOrdersWithSound } from "@/hooks/useRealtimeOrdersWithSound";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Loader2, Clock, ChefHat, CheckCircle2, Truck, XCircle, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ReceiptPrint, ReceiptData, useReceiptSettings, triggerPrint } from "@/components/pos/ReceiptPrint";

type OrderStatus = "aberto" | "preparando" | "pronto" | "entregue" | "pago" | "cancelado";

interface ActiveOrder {
  id: string;
  channel: string;
  table_number: number | null;
  customer_name: string | null;
  status: OrderStatus;
  payment_method: string | null;
  total: number;
  created_at: string;
  user_id: string | null;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
  profiles: { name: string; email: string | null } | null;
}

const STATUS_FLOW: OrderStatus[] = ["aberto", "preparando", "pronto", "entregue"];

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  aberto: { label: "Aberto", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
  preparando: { label: "Preparando", icon: ChefHat, color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  pronto: { label: "Pronto", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
  entregue: { label: "Entregue", icon: Truck, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
  pago: { label: "Pago", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/15 border-primary/30" },
  cancelado: { label: "Cancelado", icon: XCircle, color: "text-destructive", bg: "bg-destructive/15 border-destructive/30" },
};

const channelLabels: Record<string, string> = {
  balcao: "Balcão", garcom: "Garçom", delivery: "Delivery",
};

const paymentLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
  pix: "PIX",
  pix_maquina: "PIX Máquina",
};

const QUERY_KEY = ["active-orders"];

export default function ActiveOrdersPage() {
  const navigate = useNavigate();
  const { isAdmin, isKitchen } = useUserRole();
  const { data: receiptSettings } = useReceiptSettings();
  const [printData, setPrintData] = useState<ReceiptData | null>(null);
  useRealtimeOrdersWithSound(QUERY_KEY);

  const { data: orders, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(id, product_name, quantity, unit_price)")
        .in("status", ["aberto", "preparando", "pronto", "entregue"])
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch staff names
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
      })) as ActiveOrder[];
    },
  });

  const grouped = useMemo(() => {
    const map: Record<string, ActiveOrder[]> = {
      aberto: [], preparando: [], pronto: [], entregue: [],
    };
    orders?.forEach((o) => {
      if (map[o.status]) map[o.status].push(o);
    });
    return map;
  }, [orders]);

  const setTableAwaitingPayment = async (order: ActiveOrder) => {
    if (order.channel === "garcom" && order.table_number) {
      await supabase
        .from("tables")
        .update({ status: "aguardando_pagamento" as any })
        .eq("number", order.table_number);
    }
  };

  const freeTable = async (order: ActiveOrder) => {
    if (order.channel === "garcom" && order.table_number) {
      await supabase
        .from("tables")
        .update({ status: "livre" as any, current_order_id: null })
        .eq("number", order.table_number);
    }
  };

  const handlePrintOrder = async (order: ActiveOrder) => {
    let deliveryAddress = "";
    let customerPhone = "";
    let deliveryFee = 0;
    let changeFor = 0;
    let changeAmount = 0;
    let deliveryNotes = "";

    if (order.channel === "delivery") {
      const { data: dd } = await supabase
        .from("delivery_details")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      if (dd) {
        deliveryAddress = dd.delivery_address || "";
        customerPhone = dd.customer_phone || "";
        deliveryFee = dd.delivery_fee || 0;

        // Parse change info from notes
        const notesStr = dd.notes || "";
        const changeMatch = notesStr.match(/Troco para R\$\s*([\d.,]+)/);
        if (changeMatch) {
          changeFor = parseFloat(changeMatch[1].replace(",", ".")) || 0;
          changeAmount = changeFor - order.total;
          if (changeAmount < 0) changeAmount = 0;
        }
        // Extract user notes (remove change info)
        const userNotes = notesStr.replace(/\|?\s*Troco para R\$\s*[\d.,]+/g, "").replace(/\|?\s*Sem troco \(valor exato\)/g, "").trim().replace(/^\||\|$/g, "").trim();
        if (userNotes) deliveryNotes = userNotes;
      }
    }

    const receipt: ReceiptData = {
      orderId: order.id,
      channel: order.channel,
      tableNumber: order.table_number,
      customerName: order.customer_name,
      waiterName: order.profiles?.name || null,
      items: [
        ...order.order_items.map(i => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        ...(deliveryFee > 0 ? [{ product_name: "Taxa de Entrega", quantity: 1, unit_price: deliveryFee }] : []),
      ],
      total: order.total,
      paymentMethod: order.payment_method,
      createdAt: order.created_at,
      deliveryAddress,
      customerPhone,
      deliveryFee,
      changeFor: changeFor > 0 ? changeFor : undefined,
      changeAmount: changeAmount > 0 ? changeAmount : undefined,
      deliveryNotes: deliveryNotes || undefined,
    };

    setPrintData(receipt);
    setTimeout(() => triggerPrint(), 400);
  };

  const canUserAdvance = (order: ActiveOrder): boolean => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return false;
    const nextStatus = STATUS_FLOW[idx + 1];
    // Only kitchen or admin can accept orders (aberto→preparando) or mark as ready (preparando→pronto)
    if ((order.status === "aberto" && nextStatus === "preparando") || (order.status === "preparando" && nextStatus === "pronto")) {
      return isAdmin || isKitchen;
    }
    return true;
  };

  const advanceStatus = async (order: ActiveOrder) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[idx + 1];

    if (!canUserAdvance(order)) {
      toast.error("Apenas a Cozinha ou Admin pode realizar esta ação");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus as any })
      .eq("id", order.id);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      if (nextStatus === "entregue") await setTableAwaitingPayment(order);
      
      // When accepting an order (aberto → preparando), offer to print
      if (order.status === "aberto" && nextStatus === "preparando") {
        toast.success("Pedido aceito!", {
          action: {
            label: "🖨️ Imprimir",
            onClick: () => handlePrintOrder(order),
          },
          duration: 8000,
        });
      } else {
        toast.success(`Pedido movido para ${statusConfig[nextStatus].label}`);
      }

      // When a delivery order becomes "pronto", notify drivers via WhatsApp
      if (nextStatus === "pronto" && order.channel === "delivery") {
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

  const cancelOrder = async (order: ActiveOrder) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelado" as any })
      .eq("id", order.id);
    if (error) {
      toast.error("Erro ao cancelar pedido");
    } else {
      await freeTable(order);
      toast.success("Pedido cancelado");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Custom label for the advance button
  const getAdvanceLabel = (order: ActiveOrder): string | null => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
    if (order.status === "aberto") return "Aceitar Pedido";
    return statusConfig[STATUS_FLOW[idx + 1]]?.label || null;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Pedidos Ativos</h1>
            <p className="text-xs text-muted-foreground">Acompanhamento em tempo real • {orders?.length || 0} pedidos</p>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {STATUS_FLOW.map((status) => {
            const cfg = statusConfig[status];
            const Icon = cfg.icon;
            const list = grouped[status] || [];

            return (
              <div key={status} className="space-y-3">
                {/* Column header */}
                <div className="flex items-center gap-2 px-1">
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                  <span className={cn("text-sm font-bold", cfg.color)}>{cfg.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">{list.length}</Badge>
                </div>

                {/* Cards */}
                <div className="space-y-3 min-h-[200px]">
                  {list.length === 0 && (
                    <div className="flex items-center justify-center h-[200px] rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                      Nenhum pedido
                    </div>
                  )}
                  {list.map((order) => {
                    const advanceLabel = getAdvanceLabel(order);
                    const canAdvance = advanceLabel !== null;

                    return (
                      <Card key={order.id} className={cn("border bg-card", cfg.bg)}>
                        <CardContent className="p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {channelLabels[order.channel] || order.channel}
                              </Badge>
                              {order.table_number && (
                                <span className="text-xs font-semibold text-foreground">Mesa {order.table_number}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(order.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>

                          {/* Customer / Staff */}
                          {order.profiles && (
                            <p className="text-xs text-muted-foreground truncate">🧑‍🍳 {order.profiles.name || order.profiles.email}</p>
                          )}
                          {order.customer_name && (
                            <p className="text-xs text-muted-foreground truncate">👤 {order.customer_name}</p>
                          )}

                          {/* Payment info for delivery */}
                          {order.channel === "delivery" && order.payment_method && (
                            <p className="text-xs text-muted-foreground">
                              💳 {paymentLabels[order.payment_method] || order.payment_method}
                            </p>
                          )}

                          {/* Items */}
                          <div className="space-y-1">
                            {order.order_items.map((item) => (
                              <div key={item.id} className="flex justify-between text-xs">
                                <span className="text-foreground">{item.quantity}x {item.product_name}</span>
                                <span className="text-muted-foreground">R$ {(item.quantity * item.unit_price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Total */}
                          <div className="flex justify-between items-center pt-2 border-t border-border">
                            <span className="text-xs font-bold text-foreground">Total</span>
                            <span className="font-mono text-sm font-bold text-primary">R$ {order.total.toFixed(2)}</span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            {canAdvance && (
                              <button
                                onClick={() => advanceStatus(order)}
                                className={cn(
                                  "flex-1 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity",
                                  order.status === "aberto"
                                    ? "bg-green-600 text-white"
                                    : "bg-primary text-primary-foreground"
                                )}
                              >
                                {order.status === "aberto" ? "✓ " : "→ "}{advanceLabel}
                              </button>
                            )}
                            {/* Print button for non-aberto orders */}
                            {order.status !== "aberto" && (
                              <button
                                onClick={() => handlePrintOrder(order)}
                                className="py-2 px-3 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors"
                                title="Imprimir comanda"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {order.status !== "entregue" && (
                              <button
                                onClick={() => cancelOrder(order)}
                                className="py-2 px-3 rounded-lg bg-destructive/15 text-destructive text-xs font-semibold hover:bg-destructive/25 transition-colors"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Hidden receipt for printing */}
      {printData && (
        <ReceiptPrint
          data={printData}
          headerText={receiptSettings?.receipt_header}
          footerText={receiptSettings?.receipt_footer}
        />
      )}
    </div>
  );
}
