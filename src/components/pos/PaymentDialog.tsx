import { useState } from "react";
import { CreditCard, Banknote, Smartphone, QrCode, X, Check } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

type PaymentMethod = "dinheiro" | "credito" | "debito" | "pix";

interface PaymentDialogProps {
  total: number;
  onConfirm: (method: PaymentMethod) => void;
  onClose: () => void;
}

const methods: { id: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { id: "pix", label: "PIX", icon: QrCode },
  { id: "credito", label: "Crédito", icon: CreditCard },
  { id: "debito", label: "Débito", icon: Smartphone },
  { id: "dinheiro", label: "Dinheiro", icon: Banknote },
];

export function PaymentDialog({ total, onConfirm, onClose }: PaymentDialogProps) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar forma de pagamento"
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-card-foreground">Pagamento</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            aria-label="Fechar diálogo de pagamento"
          >
            <X className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">Total do pedido</p>
          <p className="text-3xl font-extrabold text-primary mt-1">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6" role="radiogroup" aria-label="Forma de pagamento">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              role="radio"
              aria-checked={selected === m.id}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[80px] focus-visible:ring-2 focus-visible:ring-ring ${
                selected === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <m.icon className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-semibold">{m.label}</span>
            </button>
          ))}
        </div>

        <button
          disabled={!selected}
          onClick={() => selected && onConfirm(selected)}
          className="w-full py-3.5 rounded-xl bg-success text-success-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring transition-colors shadow-lg shadow-success/20 min-h-[48px]"
        >
          <Check className="w-5 h-5" aria-hidden="true" />
          Confirmar Pagamento
        </button>
      </div>
    </div>
  );
}
