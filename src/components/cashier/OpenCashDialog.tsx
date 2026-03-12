import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DoorOpen } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
  loading?: boolean;
}

export function OpenCashDialog({ open, onOpenChange, onConfirm, loading }: Props) {
  const [amount, setAmount] = useState("");

  const handleConfirm = () => {
    const value = parseFloat(amount.replace(",", ".")) || 0;
    onConfirm(value);
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-primary" />
            Abrir Caixa
          </DialogTitle>
          <DialogDescription>
            Informe o valor do fundo de troco para iniciar o turno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Fundo de Troco (R$)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
          >
            {loading ? "Abrindo..." : "Confirmar Abertura"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
