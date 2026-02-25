import { useState } from "react";
import { formatCurrency, PaymentMethod } from "@/data/products";
import { CreditCard, Banknote, Smartphone, QrCode, X, Check } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-card-foreground">Pagamento</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">Total do pedido</p>
          <p className="text-3xl font-extrabold text-primary mt-1">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                selected === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <m.icon className="w-6 h-6" />
              <span className="text-sm font-semibold">{m.label}</span>
            </button>
          ))}
        </div>

        <button
          disabled={!selected}
          onClick={() => selected && onConfirm(selected)}
          className="w-full py-3.5 rounded-xl bg-success text-success-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-success/20"
        >
          <Check className="w-5 h-5" />
          Confirmar Pagamento
        </button>
      </div>
    </div>
  );
}
