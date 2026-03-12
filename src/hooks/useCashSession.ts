import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CashSession {
  id: string;
  opened_by: string;
  closed_by: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
}

export interface PaymentSummary {
  dinheiro: number;
  credito: number;
  debito: number;
  pix: number;
  pix_maquina: number;
  total: number;
}

const CASH_SESSION_KEY = ["cash-session-active"];

export function useCashSession() {
  const queryClient = useQueryClient();

  const { data: activeSession, isLoading } = useQuery({
    queryKey: CASH_SESSION_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("*")
        .is("closed_at", null)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CashSession | null;
    },
  });

  const openSession = useMutation({
    mutationFn: async (openingAmount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("cash_sessions")
        .insert({ opened_by: user.id, opening_amount: openingAmount })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CASH_SESSION_KEY });
      toast.success("Caixa aberto com sucesso!");
    },
    onError: () => toast.error("Erro ao abrir o caixa"),
  });

  const closeSession = useMutation({
    mutationFn: async ({ closingAmount, expectedAmount, notes }: { closingAmount: number; expectedAmount: number; notes?: string }) => {
      if (!activeSession) throw new Error("Nenhuma sessão ativa");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("cash_sessions")
        .update({
          closed_by: user.id,
          closing_amount: closingAmount,
          expected_amount: expectedAmount,
          notes: notes || null,
          closed_at: new Date().toISOString(),
        })
        .eq("id", activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CASH_SESSION_KEY });
      toast.success("Caixa fechado com sucesso!");
    },
    onError: () => toast.error("Erro ao fechar o caixa"),
  });

  const getPaymentSummary = async (): Promise<PaymentSummary> => {
    if (!activeSession) return { dinheiro: 0, credito: 0, debito: 0, pix: 0, pix_maquina: 0, total: 0 };

    const { data, error } = await supabase
      .from("orders")
      .select("total, payment_method")
      .eq("status", "pago")
      .not("payment_method", "is", null)
      .gte("updated_at", activeSession.opened_at);

    if (error) throw error;

    const summary: PaymentSummary = { dinheiro: 0, credito: 0, debito: 0, pix: 0, pix_maquina: 0, total: 0 };
    for (const order of data || []) {
      const method = order.payment_method as keyof Omit<PaymentSummary, "total">;
      if (method && method in summary) {
        summary[method] += Number(order.total);
      }
      summary.total += Number(order.total);
    }
    return summary;
  };

  return {
    activeSession,
    isLoading,
    isOpen: !!activeSession,
    openSession,
    closeSession,
    getPaymentSummary,
  };
}
