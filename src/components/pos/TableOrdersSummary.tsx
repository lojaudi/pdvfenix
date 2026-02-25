import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingBag, X, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TableOrdersSummaryProps {
  tableNumber: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderWithItems {
  id: string;
  status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  preparando: "Preparando",
  pronto: "Pronto",
  entregue: "Entregue",
};

export function TableOrdersSummary({ tableNumber }: TableOrdersSummaryProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<{ order: OrderWithItems; item: OrderItem } | null>(null);
  const [requestingBill, setRequestingBill] = useState(false);

  const handleRequestBill = async () => {
    if (!orders || orders.length === 0) return;
    setRequestingBill(true);
    try {
      // Update all active orders to "entregue"
      const activeOrderIds = orders
        .filter(o => ["aberto", "preparando", "pronto"].includes(o.status))
        .map(o => o.id);
      if (activeOrderIds.length > 0) {
        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "entregue" as any })
          .in("id", activeOrderIds);
        if (orderError) throw orderError;
      }
      // Update table status to aguardando_pagamento
      const { error: tableError } = await supabase
        .from("tables")
        .update({ status: "aguardando_pagamento" as any })
        .eq("number", tableNumber);
      if (tableError) throw tableError;

      toast.success(`Conta solicitada para Mesa ${tableNumber}!`);
      queryClient.invalidateQueries({ queryKey: ["table-orders-summary", tableNumber] });
      queryClient.invalidateQueries({ queryKey: ["tables-selector"] });
    } catch {
      toast.error("Erro ao solicitar conta");
    } finally {
      setRequestingBill(false);
    }
  };

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

  const handleCancelItem = async (order: OrderWithItems, item: OrderItem) => {
    setDeletingId(item.id);
    try {
      // Delete the item
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("id", item.id);
      if (deleteError) throw deleteError;

      // Recalculate order total
      const newTotal = order.total - item.quantity * item.unit_price;
      const remainingItems = order.order_items.filter((i) => i.id !== item.id);

      if (remainingItems.length === 0) {
        // Cancel the entire order if no items left
        await supabase
          .from("orders")
          .update({ status: "cancelado" as any, total: 0 })
          .eq("id", order.id);
        toast.success("Pedido cancelado (sem itens restantes)");
      } else {
        // Update order total
        await supabase
          .from("orders")
          .update({ total: Math.max(0, newTotal) })
          .eq("id", order.id);
        toast.success(`${item.product_name} removido do pedido`);
      }

      queryClient.invalidateQueries({ queryKey: ["table-orders-summary", tableNumber] });
    } catch {
      toast.error("Erro ao cancelar item");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Carregando pedidos...
      </div>
    );
  }

  if (!orders || orders.length === 0) return null;

  const grandTotal = orders.reduce((sum, o) => sum + o.total, 0);

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

      <div className="space-y-3 max-h-48 overflow-y-auto">
        {orders.map((order, i) => {
          const isOpen = order.status === "aberto";
          return (
            <div key={order.id} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  #{i + 1} • {statusLabels[order.status] || order.status}
                </Badge>
              </div>
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs group">
                  <span className="text-foreground">
                    {item.quantity}x {item.product_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </span>
                    {isOpen && (
                      <button
                        onClick={() => setConfirmItem({ order, item })}
                        disabled={deletingId === item.id}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all disabled:opacity-50"
                        title="Cancelar item"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Request bill button - only show if there are non-entregue orders */}
      {orders.some(o => ["aberto", "preparando", "pronto"].includes(o.status)) && (
        <button
          onClick={handleRequestBill}
          disabled={requestingBill}
          className="w-full py-2.5 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold hover:bg-orange-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {requestingBill ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CreditCard className="w-3.5 h-3.5" />
          )}
          Pedir Conta
        </button>
      )}

      <AlertDialog open={!!confirmItem} onOpenChange={(open) => !open && setConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar item?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{confirmItem?.item.quantity}x {confirmItem?.item.product_name}</strong>{" "}
              do pedido? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmItem) {
                  handleCancelItem(confirmItem.order, confirmItem.item);
                  setConfirmItem(null);
                }
              }}
            >
              Sim, cancelar item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
