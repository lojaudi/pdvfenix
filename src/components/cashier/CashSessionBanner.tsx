import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DoorOpen, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CashSession } from "@/hooks/useCashSession";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface Props {
  session: CashSession | null;
  onOpen: () => void;
  onClose: () => void;
}

export function CashSessionBanner({ session, onOpen, onClose }: Props) {
  if (!session) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-sm font-bold text-foreground">Caixa Fechado</p>
            <p className="text-xs text-muted-foreground">Abra o caixa para receber pagamentos</p>
          </div>
        </div>
        <button
          onClick={onOpen}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Abrir Caixa
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <DoorOpen className="w-5 h-5 text-green-600" />
        <div>
          <p className="text-sm font-bold text-foreground">Caixa Aberto</p>
          <p className="text-xs text-muted-foreground">
            Desde {format(new Date(session.opened_at), "HH:mm", { locale: ptBR })} • Fundo: {formatCurrency(session.opening_amount)}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-700">
          Ativo
        </Badge>
      </div>
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-opacity min-h-[44px]"
      >
        Fechar Caixa
      </button>
    </div>
  );
}
