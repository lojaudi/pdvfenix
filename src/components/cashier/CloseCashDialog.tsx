import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { CashSession, PaymentSummary } from "@/hooks/useCashSession";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const methodLabels: Record<string, string> = {
  dinheiro: "💵 Dinheiro",
  credito: "💳 Crédito",
  debito: "💳 Débito",
  pix: "📱 PIX",
  pix_maquina: "📱 PIX Máquina",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CashSession;
  onConfirm: (closingAmount: number, expectedAmount: number, notes?: string) => void;
  loading?: boolean;
  fetchSummary: () => Promise<PaymentSummary>;
}

export function CloseCashDialog({ open, onOpenChange, session, onConfirm, loading, fetchSummary }: Props) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setLoadingSummary(true);
      fetchSummary()
        .then(setSummary)
        .finally(() => setLoadingSummary(false));
    }
  }, [open]);

  const expectedCash = (summary?.dinheiro || 0) + session.opening_amount;
  const closingValue = parseFloat(closingAmount.replace(",", ".")) || 0;
  const difference = closingValue - expectedCash;

  const handleConfirm = () => {
    onConfirm(closingValue, expectedCash, notes || undefined);
    setClosingAmount("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar Caixa</DialogTitle>
          <DialogDescription>
            Resumo financeiro do turno atual.
          </DialogDescription>
        </DialogHeader>

        {loadingSummary ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : summary ? (
          <div className="space-y-4 pt-2">
            {/* Payment method breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Vendas por Método</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(methodLabels) as (keyof typeof methodLabels)[]).map((method) => {
                  const value = summary[method as keyof PaymentSummary] || 0;
                  return (
                    <div key={method} className="rounded-lg border border-border p-3 bg-secondary/30">
                      <p className="text-[11px] text-muted-foreground">{methodLabels[method]}</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(value as number)}</p>
                    </div>
                  );
                })}
                <div className="rounded-lg border border-primary/30 p-3 bg-primary/5 col-span-2">
                  <p className="text-[11px] text-muted-foreground">Total Vendas</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(summary.total)}</p>
                </div>
              </div>
            </div>

            {/* Expected cash */}
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase">Esperado no Caixa (Dinheiro)</p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fundo de troco</span>
                <span>{formatCurrency(session.opening_amount)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Recebido em dinheiro</span>
                <span>{formatCurrency(summary.dinheiro)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
                <span>Total esperado</span>
                <span>{formatCurrency(expectedCash)}</span>
              </div>
            </div>

            {/* Closing amount input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Valor Contado (R$)
              </label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
              />
            </div>

            {/* Difference */}
            {closingAmount && (
              <div className={`flex items-center justify-between rounded-lg p-3 border ${
                difference > 0 ? "border-green-500/30 bg-green-500/5" :
                difference < 0 ? "border-destructive/30 bg-destructive/5" :
                "border-border bg-secondary/30"
              }`}>
                <div className="flex items-center gap-2">
                  {difference > 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> :
                   difference < 0 ? <TrendingDown className="w-4 h-4 text-destructive" /> :
                   <Minus className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm font-medium">
                    {difference > 0 ? "Sobra" : difference < 0 ? "Falta" : "Conferido"}
                  </span>
                </div>
                <span className={`font-mono text-sm font-bold ${
                  difference > 0 ? "text-green-600" : difference < 0 ? "text-destructive" : "text-foreground"
                }`}>
                  {formatCurrency(Math.abs(difference))}
                </span>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Observações (opcional)
              </label>
              <Input
                type="text"
                placeholder="Ex: Troco extra do caixa anterior..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={handleConfirm}
              disabled={loading || !closingAmount}
              className="w-full py-3 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
            >
              {loading ? "Fechando..." : "Confirmar Fechamento"}
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
