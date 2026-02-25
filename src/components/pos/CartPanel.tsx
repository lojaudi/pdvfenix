import { DbProduct } from "@/hooks/useProducts";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export type CartItem = {
  product: DbProduct;
  quantity: number;
};

interface CartPanelProps {
  items: CartItem[];
  total: number;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  channelLabel: string;
  tableNumber?: number;
}

export function CartPanel({
  items,
  total,
  onUpdateQuantity,
  onRemove,
  onClear,
  onCheckout,
  channelLabel,
  tableNumber,
}: CartPanelProps) {
  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-card-foreground">Pedido</h2>
          </div>
          <span className="text-xs bg-primary/15 text-primary font-semibold px-2 py-1 rounded-md">
            {channelLabel}
            {tableNumber ? ` • Mesa ${tableNumber}` : ""}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum item adicionado</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3 animate-slide-in"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.product.price)} un.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-semibold text-card-foreground">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-sm font-bold text-primary w-20 text-right">
                {formatCurrency(item.product.price * item.quantity)}
              </span>
              <button
                onClick={() => onRemove(item.product.id)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="text-2xl font-extrabold text-primary">
              {formatCurrency(total)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClear}
              className="flex-1 py-3 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={onCheckout}
              className="flex-[2] py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Finalizar Pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
