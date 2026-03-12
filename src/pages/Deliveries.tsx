import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Loader2, Clock, Bike, CheckCircle2, XCircle, Package, User, MapPin, Phone, Printer } from "lucide-react";
import { ReceiptPrint, triggerPrint, useReceiptSettings, type ReceiptData } from "@/components/pos/ReceiptPrint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

interface DeliveryWithOrder {
  id: string;
  order_id: string;
  delivery_address: string;
  customer_phone: string;
  delivery_fee: number;
  delivery_status: DeliveryStatus;
  notes: string | null;
  payment_on_delivery: boolean;
  driver_id: string | null;
  created_at: string;
  orders: {
    id: string;
    total: number;
    customer_name: string | null;
    status: string;
    order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
  };
  delivery_drivers: { id: string; name: string; phone: string } | null;
}

const STATUS_FLOW: DeliveryStatus[] = ["aguardando", "aceito", "saiu_para_entrega", "entregue"];

const statusConfig: Record<DeliveryStatus, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  aguardando: { label: "Aguardando", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
  aceito: { label: "Aceito", icon: Package, color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  saiu_para_entrega: { label: "Em Rota", icon: Bike, color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  entregue: { label: "Entregue", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
  cancelado: { label: "Cancelado", icon: XCircle, color: "text-destructive", bg: "bg-destructive/15 border-destructive/30" },
};

const QUERY_KEY = ["active-deliveries"];

export default function DeliveriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const handlePrintDelivery = (delivery: DeliveryWithOrder) => {
    const items = delivery.orders?.order_items?.map((item) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })) || [];

    // Add delivery fee as a line item
    if (delivery.delivery_fee > 0) {
      items.push({ product_name: "Taxa de entrega", quantity: 1, unit_price: delivery.delivery_fee });
    }

    setReceiptData({
      orderId: delivery.order_id,
      channel: "delivery",
      tableNumber: null,
      customerName: delivery.orders?.customer_name || null,
      waiterName: null,
      items,
      total: (delivery.orders?.total || 0) + delivery.delivery_fee,
      paymentMethod: delivery.payment_on_delivery ? "Pgto na entrega" : null,
      createdAt: delivery.created_at,
    });
    triggerPrint();
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("deliveries-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_details" }, () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: deliveries, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_details")
        .select("*, orders!delivery_details_order_id_fkey(id, total, customer_name, status, order_items(id, product_name, quantity, unit_price)), delivery_drivers!delivery_details_driver_id_fkey(id, name, phone)")
        .in("delivery_status", ["aguardando", "aceito", "saiu_para_entrega"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as DeliveryWithOrder[];
    },
  });

  const { data: drivers } = useQuery({
    queryKey: ["available-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_drivers")
        .select("id, name, phone")
        .eq("is_available", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const grouped = useMemo(() => {
    const map: Record<string, DeliveryWithOrder[]> = { aguardando: [], aceito: [], saiu_para_entrega: [] };
    deliveries?.forEach((d) => { if (map[d.delivery_status]) map[d.delivery_status].push(d); });
    return map;
  }, [deliveries]);

  const advanceStatus = async (delivery: DeliveryWithOrder) => {
    const idx = STATUS_FLOW.indexOf(delivery.delivery_status);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];

    const updateData: any = { delivery_status: next };
    if (next === "entregue") updateData.delivered_at = new Date().toISOString();

    const { error } = await supabase.from("delivery_details").update(updateData).eq("id", delivery.id);
    if (error) { toast.error("Erro ao atualizar"); return; }

    // Also update order status
    if (next === "entregue") {
      await supabase.from("orders").update({ status: "entregue" as any }).eq("id", delivery.order_id);
    }
    toast.success(`Entrega → ${statusConfig[next].label}`);
  };

  const assignDriver = async (deliveryId: string, driverId: string) => {
    const { error } = await supabase
      .from("delivery_details")
      .update({ driver_id: driverId, delivery_status: "aceito" as any })
      .eq("id", deliveryId);
    if (error) { toast.error("Erro ao atribuir entregador"); return; }
    toast.success("Entregador atribuído!");
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const cancelDelivery = async (delivery: DeliveryWithOrder) => {
    const { error } = await supabase
      .from("delivery_details")
      .update({ delivery_status: "cancelado" as any })
      .eq("id", delivery.id);
    if (error) { toast.error("Erro ao cancelar"); return; }
    await supabase.from("orders").update({ status: "cancelado" as any }).eq("id", delivery.order_id);
    toast.success("Entrega cancelada");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const displayStatuses: DeliveryStatus[] = ["aguardando", "aceito", "saiu_para_entrega"];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Entregas</h1>
            <p className="text-xs text-muted-foreground">Rastreamento em tempo real • {deliveries?.length || 0} entregas ativas</p>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayStatuses.map((status) => {
            const cfg = statusConfig[status];
            const Icon = cfg.icon;
            const list = grouped[status] || [];

            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                  <span className={cn("text-sm font-bold", cfg.color)}>{cfg.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">{list.length}</Badge>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {list.length === 0 && (
                    <div className="flex items-center justify-center h-[200px] rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                      Nenhuma entrega
                    </div>
                  )}
                  {list.map((delivery) => {
                    const canAdvance = STATUS_FLOW.indexOf(delivery.delivery_status) < STATUS_FLOW.length - 1;
                    const nextLabel = canAdvance
                      ? statusConfig[STATUS_FLOW[STATUS_FLOW.indexOf(delivery.delivery_status) + 1]]?.label
                      : null;

                    return (
                      <Card key={delivery.id} className={cn("border bg-card", cfg.bg)}>
                        <CardContent className="p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(delivery.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                            {delivery.payment_on_delivery && (
                              <Badge variant="outline" className="text-[10px]">Pgto na entrega</Badge>
                            )}
                          </div>

                          {/* Customer */}
                          {delivery.orders?.customer_name && (
                            <p className="text-xs text-foreground flex items-center gap-1.5">
                              <User className="w-3 h-3 text-muted-foreground" />
                              {delivery.orders.customer_name}
                            </p>
                          )}

                          {/* Address */}
                          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {delivery.delivery_address}
                          </p>

                          {/* Phone */}
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {delivery.customer_phone}
                          </p>

                          {/* Items */}
                          <div className="space-y-1">
                            {delivery.orders?.order_items?.map((item) => (
                              <div key={item.id} className="flex justify-between text-xs">
                                <span className="text-foreground">{item.quantity}x {item.product_name}</span>
                                <span className="text-muted-foreground">R$ {(item.quantity * item.unit_price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Total */}
                          <div className="flex justify-between items-center pt-2 border-t border-border">
                            <div>
                              <span className="text-[10px] text-muted-foreground block">Taxa: R$ {delivery.delivery_fee.toFixed(2)}</span>
                              <span className="text-xs font-bold text-foreground">Total</span>
                            </div>
                            <span className="font-mono text-sm font-bold text-primary">
                              R$ {((delivery.orders?.total || 0) + delivery.delivery_fee).toFixed(2)}
                            </span>
                          </div>

                          {/* Driver */}
                          {delivery.delivery_drivers ? (
                            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                              <Bike className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-xs font-semibold text-foreground">{delivery.delivery_drivers.name}</p>
                                <p className="text-[10px] text-muted-foreground">{delivery.delivery_drivers.phone}</p>
                              </div>
                            </div>
                          ) : (
                            <select
                              onChange={(e) => e.target.value && assignDriver(delivery.id, e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-xs"
                              defaultValue=""
                            >
                              <option value="" disabled>Atribuir entregador...</option>
                              {drivers?.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          )}

                          {/* Notes */}
                          {delivery.notes && (
                            <p className="text-[10px] text-muted-foreground italic bg-secondary/30 rounded p-2">📝 {delivery.notes}</p>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            {canAdvance && delivery.driver_id && (
                              <button
                                onClick={() => advanceStatus(delivery)}
                                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                              >
                                → {nextLabel}
                              </button>
                            )}
                            {delivery.delivery_status !== "saiu_para_entrega" && (
                              <button
                                onClick={() => cancelDelivery(delivery)}
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
    </div>
  );
}
