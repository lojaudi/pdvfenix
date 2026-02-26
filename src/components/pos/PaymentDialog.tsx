import { useState } from "react";
import { CreditCard, Banknote, Smartphone, QrCode, X, Check, Calculator, ArrowLeft } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export type PaymentMethod = "pix_maquina" | "credito" | "debito" | "dinheiro";

interface PaymentDialogProps {
  total: number;
  onConfirm: (method: PaymentMethod, changeValue?: number) => void;
  onClose: () => void;
  /** "balcao" | "garcom" | "delivery" */
  channel: string;
}

const methods: { id: PaymentMethod; label: string; icon: typeof CreditCard; description: string }[] = [
  { id: "pix_maquina", label: "PIX Máquina", icon: QrCode, description: "Gerar código na maquininha" },
  { id: "credito", label: "Cartão Crédito", icon: CreditCard, description: "Pagamento via maquininha" },
  { id: "debito", label: "Cartão Débito", icon: Smartphone, description: "Pagamento via maquininha" },
  { id: "dinheiro", label: "Dinheiro", icon: Banknote, description: "Pagamento em espécie" },
];

// ── Calculator for balcão/caixa ──
function CashCalculator({ total, onConfirm, onBack }: { total: number; onConfirm: (change: number) => void; onBack: () => void }) {
  const [received, setReceived] = useState("");

  const receivedNum = parseFloat(received.replace(",", ".")) || 0;
  const change = receivedNum - total;

  const quickValues = [5, 10, 20, 50, 100, 200].filter((v) => v >= total);

  const handleDigit = (d: string) => {
    if (d === "C") { setReceived(""); return; }
    if (d === "⌫") { setReceived((p) => p.slice(0, -1)); return; }
    if (d === "," && received.includes(",")) return;
    setReceived((p) => p + d);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Total a pagar</p>
        <p className="text-2xl font-extrabold text-primary">{formatCurrency(total)}</p>
      </div>

      {quickValues.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {quickValues.map((v) => (
            <button
              key={v}
              onClick={() => setReceived(v.toString())}
              className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
            >
              {formatCurrency(v)}
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Valor recebido</label>
        <div className="text-right text-2xl font-bold bg-secondary rounded-lg p-3 text-foreground min-h-[48px]">
          {received || "0"}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="py-3 rounded-xl bg-secondary text-foreground font-bold text-lg hover:bg-secondary/80 active:scale-95 transition-all"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => handleDigit("C")}
          className="col-span-3 py-2 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-colors"
        >
          Limpar
        </button>
      </div>

      <div className={`text-center p-3 rounded-xl ${change >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
        <p className="text-xs text-muted-foreground">Troco</p>
        <p className={`text-2xl font-extrabold ${change >= 0 ? "text-success" : "text-destructive"}`}>
          {formatCurrency(Math.max(0, change))}
        </p>
      </div>

      <button
        disabled={receivedNum < total}
        onClick={() => onConfirm(change)}
        className="w-full py-3.5 rounded-xl bg-success text-success-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-success/20 min-h-[48px]"
      >
        <Check className="w-5 h-5" aria-hidden="true" />
        Confirmar Pagamento
      </button>
    </div>
  );
}

// ── Change input for garçom/entregador ──
function ChangeInput({ total, onConfirm, onBack }: { total: number; onConfirm: (change: number) => void; onBack: () => void }) {
  const [needsChange, setNeedsChange] = useState<boolean | null>(null);
  const [changeFor, setChangeFor] = useState("");

  const changeForNum = parseFloat(changeFor.replace(",", ".")) || 0;
  const changeAmount = changeForNum - total;

  if (needsChange === null) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-extrabold text-primary">{formatCurrency(total)}</p>
        </div>
        <p className="text-center text-sm text-muted-foreground">O cliente precisa de troco?</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setNeedsChange(true)} className="py-4 rounded-xl border-2 border-border hover:border-primary/50 font-semibold text-foreground transition-colors">
            Sim
          </button>
          <button onClick={() => onConfirm(0)} className="py-4 rounded-xl border-2 border-border hover:border-primary/50 font-semibold text-foreground transition-colors">
            Não (valor exato)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setNeedsChange(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="text-2xl font-extrabold text-primary">{formatCurrency(total)}</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Troco para quanto?</label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Ex: 50"
          value={changeFor}
          onChange={(e) => setChangeFor(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
          autoFocus
        />
      </div>
      {changeForNum > 0 && (
        <div className={`text-center p-3 rounded-xl ${changeAmount >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
          <p className="text-xs text-muted-foreground">Troco a levar</p>
          <p className={`text-2xl font-extrabold ${changeAmount >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(Math.max(0, changeAmount))}
          </p>
        </div>
      )}
      <button
        disabled={changeForNum < total}
        onClick={() => onConfirm(changeAmount)}
        className="w-full py-3.5 rounded-xl bg-success text-success-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-success/20 min-h-[48px]"
      >
        <Check className="w-5 h-5" aria-hidden="true" />
        Confirmar Pagamento
      </button>
    </div>
  );
}

export function PaymentDialog({ total, onConfirm, onClose, channel }: PaymentDialogProps) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<"select" | "cash">("select");

  const isCounter = channel === "balcao"; // balcão/caixa → calculator
  const isFieldOp = channel === "garcom" || channel === "delivery"; // garçom/entregador → change input

  const handleSelect = (method: PaymentMethod) => {
    setSelected(method);
    if (method === "dinheiro") {
      setStep("cash");
    }
  };

  const handleConfirmNonCash = () => {
    if (selected && selected !== "dinheiro") {
      onConfirm(selected);
    }
  };

  const handleCashConfirm = (changeValue: number) => {
    onConfirm("dinheiro", changeValue);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar forma de pagamento"
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-card-foreground">Pagamento</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>

        {step === "select" && (
          <>
            <div className="text-center mb-5">
              <p className="text-sm text-muted-foreground">Total do pedido</p>
              <p className="text-3xl font-extrabold text-primary mt-1">{formatCurrency(total)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5" role="radiogroup" aria-label="Forma de pagamento">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  role="radio"
                  aria-checked={selected === m.id}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all min-h-[90px] focus-visible:ring-2 focus-visible:ring-ring ${
                    selected === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <m.icon className="w-6 h-6" aria-hidden="true" />
                  <span className="text-sm font-semibold">{m.label}</span>
                  <span className="text-[10px] leading-tight text-center opacity-70">{m.description}</span>
                </button>
              ))}
            </div>

            {selected && selected !== "dinheiro" && (
              <button
                onClick={handleConfirmNonCash}
                className="w-full py-3.5 rounded-xl bg-success text-success-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-success/90 transition-colors shadow-lg shadow-success/20 min-h-[48px]"
              >
                <Check className="w-5 h-5" aria-hidden="true" />
                Confirmar Pagamento
              </button>
            )}
          </>
        )}

        {step === "cash" && isCounter && (
          <CashCalculator total={total} onConfirm={handleCashConfirm} onBack={() => { setStep("select"); setSelected(null); }} />
        )}

        {step === "cash" && isFieldOp && (
          <ChangeInput total={total} onConfirm={handleCashConfirm} onBack={() => { setStep("select"); setSelected(null); }} />
        )}
      </div>
    </div>
  );
}
