import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeOrdersWithSound } from "@/hooks/useRealtimeOrdersWithSound";
import { useCashSession } from "@/hooks/useCashSession";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Loader2, Wallet, CheckCircle2, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { ReceiptPrint, triggerPrint, useReceiptSettings, type ReceiptData } from "@/components/pos/ReceiptPrint";
import { CashSessionBanner } from "@/components/cashier/CashSessionBanner";
import { OpenCashDialog } from "@/components/cashier/OpenCashDialog";
import { CloseCashDialog } from "@/components/cashier/CloseCashDialog";
import { toast } from "sonner";

import type { PaymentMethod } from "@/components/pos/PaymentDialog";

interface RawOrder {
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

/** Consolidated bill for a table (or single order for balcão/delivery) */
interface ConsolidatedBill {
  /** All order IDs in this bill */
  orderIds: string[];
  channel: string;
  table_number: number | null;
  customer_name: string | null;
  waiterName: string | null;
  /** All items across all orders */
  items: { id: string; product_name: string; quantity: number; unit_price: number }[];
  /** Sum of all order totals */
  total: number;
  /** Earliest order time */
  created_at: string;
  /** Original orders for reference */
  orders: RawOrder[];
}

const channelLabels: Record<string, string> = {
  balcao: "Balcão", garcom: "Garçom", delivery: "Delivery",
};

const QUERY_KEY = ["cashier-orders"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function consolidateOrders(orders: RawOrder[]): { pending: ConsolidatedBill[]; inProgress: ConsolidatedBill[] } {
  const pendingOrders = orders.filter(o => o.status === "entregue");
  const progressOrders = orders.filter(o => ["aberto", "preparando", "pronto"].includes(o.status));

  const groupByTable = (list: RawOrder[]): ConsolidatedBill[] => {
    const tableGroups = new Map<string, RawOrder[]>();
    const standalone: RawOrder[] = [];

    for (const order of list) {
      if (order.channel === "garcom" && order.table_number != null) {
        const key = `mesa-${order.table_number}`;
        if (!tableGroups.has(key)) tableGroups.set(key, []);
        tableGroups.get(key)!.push(order);
      } else {
        standalone.push(order);
      }
    }

    const bills: ConsolidatedBill[] = [];

    // Grouped table bills
    for (const [, group] of tableGroups) {
      const allItems = group.flatMap(o => o.order_items);
      const total = group.reduce((s, o) => s + o.total, 0);
      const earliest = group.reduce((min, o) => o.created_at < min ? o.created_at : min, group[0].created_at);
      const waiter = group.find(o => o.profiles)?.profiles;

      bills.push({
        orderIds: group.map(o => o.id),
        channel: "garcom",
        table_number: group[0].table_number,
        customer_name: group[0].customer_name,
        waiterName: waiter?.name || null,
        items: allItems,
        total,
        created_at: earliest,
        orders: group,
      });
    }

    // Standalone orders (balcão, delivery, or garcom without table)
    for (const order of standalone) {
      bills.push({
        orderIds: [order.id],
        channel: order.channel,
        table_number: order.table_number,
        customer_name: order.customer_name,
        waiterName: order.profiles?.name || null,
        items: order.order_items,
        total: order.total,
        created_at: order.created_at,
        orders: [order],
      });
    }

    return bills.sort((a, b) => a.created_at.localeCompare(b.created_at));
  };

  return {
    pending: groupByTable(pendingOrders),
    inProgress: groupByTable(progressOrders),
  };
}

function buildReceiptData(bill: ConsolidatedBill, paymentMethod?: string): ReceiptData {
  return {
    orderId: bill.orderIds.length === 1 ? bill.orderIds[0] : bill.orderIds.map(id => id.slice(0, 6)).join("/"),
    channel: bill.channel,
    tableNumber: bill.table_number,
    customerName: bill.customer_name,
    waiterName: bill.waiterName,
    items: bill.items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
    total: bill.total,
    paymentMethod: paymentMethod || null,
    createdAt: bill.created_at,
    paidAt: paymentMethod ? new Date().toISOString() : undefined,
  };
}

export default function CashierPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedBill, setSelectedBill] = useState<ConsolidatedBill | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  useRealtimeOrdersWithSound(QUERY_KEY);
  const { activeSession, isLoading: loadingSession, isOpen: cashIsOpen, openSession, closeSession, getPaymentSummary } = useCashSession();

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
      })) as RawOrder[];
    },
  });

  const { pending: pendingPayment, inProgress } = orders
    ? consolidateOrders(orders)
    : { pending: [], inProgress: [] };

  const handlePrintBill = (bill: ConsolidatedBill, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setReceiptData(buildReceiptData(bill));
    triggerPrint();
  };

  const handlePayment = async (method: PaymentMethod, changeValue?: number) => {
    if (!selectedBill) return;

    // Update ALL orders in this bill to "pago"
    const { error } = await supabase
      .from("orders")
      .update({ status: "pago" as any, payment_method: method as any })
      .in("id", selectedBill.orderIds);

    if (error) {
      toast.error("Erro ao registrar pagamento");
      return;
    }

    // Free table if garçom order
    if (selectedBill.channel === "garcom" && selectedBill.table_number) {
      await supabase
        .from("tables")
        .update({ status: "livre" as any, current_order_id: null, waiter_id: null })
        .eq("number", selectedBill.table_number);
    }

    const changeMsg = method === "dinheiro" && changeValue ? ` • Troco: ${formatCurrency(changeValue)}` : "";
    const orderCount = selectedBill.orderIds.length;
    toast.success(
      `Pagamento confirmado! ${formatCurrency(selectedBill.total)} via ${method.toUpperCase()}${
        selectedBill.table_number ? ` • Mesa ${selectedBill.table_number} liberada` : ""
      }${orderCount > 1 ? ` • ${orderCount} pedidos consolidados` : ""}${changeMsg}`
    );

    setReceiptData(buildReceiptData(selectedBill, method));
    triggerPrint();

    setSelectedBill(null);
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["tables-selector"] });
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
              {pendingPayment.map((bill) => (
                <Card key={bill.orderIds.join("-")} className="border bg-card border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-colors cursor-pointer" onClick={() => setSelectedBill(bill)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {channelLabels[bill.channel] || bill.channel}
                        </Badge>
                        {bill.table_number && (
                          <span className="text-sm font-bold text-foreground">Mesa {bill.table_number}</span>
                        )}
                        {bill.orderIds.length > 1 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {bill.orderIds.length} pedidos
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handlePrintBill(bill, e)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Imprimir conta ${bill.table_number ? `Mesa ${bill.table_number}` : ''}`}
                          title="Imprimir conta"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(bill.created_at), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {bill.waiterName && (
                      <p className="text-xs text-muted-foreground truncate">🧑‍🍳 {bill.waiterName}</p>
                    )}
                    {bill.customer_name && (
                      <p className="text-xs text-muted-foreground truncate">👤 {bill.customer_name}</p>
                    )}

                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {bill.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-foreground">{item.quantity}x {item.product_name}</span>
                          <span className="text-muted-foreground">{formatCurrency(item.quantity * item.unit_price)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-xs font-bold text-foreground">Total</span>
                      <span className="font-mono text-lg font-bold text-primary">{formatCurrency(bill.total)}</span>
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
              {inProgress.map((bill) => (
                <Card key={bill.orderIds.join("-")} className="border bg-card border-border/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {channelLabels[bill.channel] || bill.channel}
                        </Badge>
                        {bill.table_number && (
                          <span className="text-xs font-semibold text-foreground">Mesa {bill.table_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handlePrintBill(bill, e)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Imprimir comanda"
                          title="Imprimir comanda"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {bill.orderIds.length > 1 && (
                          <Badge variant="secondary" className="text-[10px]">{bill.orderIds.length} ped.</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{bill.items.length} itens</span>
                      <span className="font-mono text-sm font-bold text-primary">{formatCurrency(bill.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedBill && (
        <PaymentDialog
          total={selectedBill.total}
          onConfirm={handlePayment}
          onClose={() => setSelectedBill(null)}
          channel={selectedBill.channel}
        />
      )}

      {/* Hidden receipt for printing */}
      {receiptData && <ReceiptPrintWrapper data={receiptData} />}
    </div>
  );
}

function ReceiptPrintWrapper({ data }: { data: ReceiptData }) {
  const { data: settings } = useReceiptSettings();
  return (
    <ReceiptPrint
      data={data}
      headerText={settings?.receipt_header || undefined}
      footerText={settings?.receipt_footer || undefined}
    />
  );
}
