import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ArrowLeft, Loader2, Plus, Minus, Users, CreditCard, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

type TableStatus = "livre" | "ocupada" | "aguardando_pagamento";

interface TableItem {
  id: string;
  number: number;
  status: TableStatus;
  capacity: number;
  current_order_id: string | null;
  updated_at: string;
  waiter_id: string | null;
  waiter_name?: string | null;
}

const statusConfig: Record<TableStatus, { label: string; icon: typeof Users; color: string; bg: string; border: string }> = {
  livre: { label: "Livre", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  ocupada: { label: "Ocupada", icon: Users, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  aguardando_pagamento: { label: "Aguardando Pgto", icon: CreditCard, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
};

const STATUS_CYCLE: TableStatus[] = ["livre", "ocupada", "aguardando_pagamento"];

const QUERY_KEY = ["tables"];

export default function TablesPage() {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  useRealtimeTables(QUERY_KEY);

  const { data: tables, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .order("number", { ascending: true });
      if (error) throw error;
      const items = data as TableItem[];

      // Fetch waiter names for occupied tables
      const waiterIds = [...new Set(items.map(t => t.waiter_id).filter(Boolean))] as string[];
      let waiterMap: Record<string, string> = {};
      if (waiterIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", waiterIds);
        if (profiles) {
          waiterMap = Object.fromEntries(profiles.map(p => [p.user_id, p.name]));
        }
      }
      return items.map(t => ({ ...t, waiter_name: t.waiter_id ? waiterMap[t.waiter_id] || null : null }));
    },
  });

  const changeStatus = async (table: TableItem, newStatus: TableStatus) => {
    const updateData: any = {
      status: newStatus,
      current_order_id: newStatus === "livre" ? null : table.current_order_id,
    };
    // Clear waiter when freeing table
    if (newStatus === "livre") {
      updateData.waiter_id = null;
    }
    const { error } = await supabase
      .from("tables")
      .update(updateData)
      .eq("id", table.id);
    if (error) {
      toast.error("Erro ao atualizar mesa");
    } else {
      toast.success(`Mesa ${table.number} → ${statusConfig[newStatus].label}`);
    }
  };

  const addTable = async () => {
    const maxNumber = tables?.reduce((max, t) => Math.max(max, t.number), 0) || 0;
    const { error } = await supabase
      .from("tables")
      .insert({ number: maxNumber + 1 } as any);
    if (error) toast.error("Erro ao adicionar mesa");
    else toast.success(`Mesa ${maxNumber + 1} adicionada`);
  };

  const removeLastTable = async () => {
    if (!tables || tables.length === 0) return;
    const last = tables[tables.length - 1];
    if (last.status !== "livre") {
      toast.error("Só é possível remover mesas livres");
      return;
    }
    const { error } = await supabase.from("tables").delete().eq("id", last.id);
    if (error) toast.error("Erro ao remover mesa");
    else toast.success(`Mesa ${last.number} removida`);
  };

  const summary = {
    livre: tables?.filter((t) => t.status === "livre").length || 0,
    ocupada: tables?.filter((t) => t.status === "ocupada").length || 0,
    aguardando_pagamento: tables?.filter((t) => t.status === "aguardando_pagamento").length || 0,
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
            <button onClick={() => navigate("/")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Gestão de Mesas</h1>
              <p className="text-xs text-muted-foreground">Status em tempo real • {tables?.length || 0} mesas</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={removeLastTable}
                className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center text-destructive hover:bg-destructive/25 transition-colors"
                title="Remover última mesa"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={addTable}
                className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors"
                title="Adicionar mesa"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Summary badges */}
      <div className="flex gap-3 px-6 pt-4">
        {STATUS_CYCLE.map((s) => {
          const cfg = statusConfig[s];
          const Icon = cfg.icon;
          return (
            <div key={s} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border", cfg.bg, cfg.border)}>
              <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
              <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{summary[s]}</Badge>
            </div>
          );
        })}
      </div>

      {/* Tables grid */}
      <main className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {tables?.map((table) => {
            const cfg = statusConfig[table.status];
            const Icon = cfg.icon;

            return (
              <div
                key={table.id}
                className={cn(
                  "relative rounded-2xl border-2 p-5 flex flex-col items-center gap-3 transition-all hover:scale-[1.02] cursor-pointer select-none",
                  cfg.bg, cfg.border
                )}
              >
                {/* Table number */}
                <span className="text-3xl font-black text-foreground">{table.number}</span>

                {/* Status badge */}
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full", cfg.bg, "border", cfg.border)}>
                  <Icon className={cn("w-3 h-3", cfg.color)} />
                  <span className={cn("text-[10px] font-bold", cfg.color)}>{cfg.label}</span>
                </div>

                {/* Waiter name */}
                {table.waiter_name && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-full">👤 {table.waiter_name}</span>
                )}

                {/* Capacity */}
                <span className="text-[10px] text-muted-foreground">{table.capacity} lugares</span>

                {/* Action buttons */}
                <div className="flex gap-1.5 w-full mt-1">
                  {table.status === "livre" && (
                    <button
                      onClick={() => changeStatus(table, "ocupada")}
                      className="flex-1 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-[10px] font-bold hover:bg-yellow-500/30 transition-colors"
                    >
                      Ocupar
                    </button>
                  )}
                  {table.status === "ocupada" && (
                    <>
                      <button
                        onClick={() => changeStatus(table, "aguardando_pagamento")}
                        className="flex-1 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-[10px] font-bold hover:bg-orange-500/30 transition-colors"
                      >
                        Pedir Conta
                      </button>
                      <button
                        onClick={() => changeStatus(table, "livre")}
                        className="py-1.5 px-2 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-bold hover:bg-green-500/30 transition-colors"
                      >
                        Liberar
                      </button>
                    </>
                  )}
                  {table.status === "aguardando_pagamento" && (
                    <button
                      onClick={() => navigate("/cashier")}
                      className="flex-1 py-1.5 rounded-lg bg-primary/20 text-primary text-[10px] font-bold hover:bg-primary/30 transition-colors"
                    >
                      💳 Ir para Caixa
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
