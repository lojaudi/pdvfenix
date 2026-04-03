import { DbProduct } from "@/hooks/useProducts";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export type CartItem = {
  product: DbProduct;
  quantity: number;
  variationName?: string;
  variationPrice?: number;
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
  checkoutLabel?: string;
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
  checkoutLabel = "Finalizar Pedido",
}: CartPanelProps) {
  return (
    <div className="flex flex-col h-full bg-card border-l border-border" role="region" aria-label="Carrinho de compras">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" aria-hidden="true" />
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
            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" aria-hidden="true" />
            <p className="text-sm">Nenhum item adicionado</p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Itens do pedido">
            {items.map((item) => {
              const itemKey = item.variationName ? `${item.product.id}_${item.variationName}` : item.product.id;
              const unitPrice = item.variationPrice ?? item.product.price;
              return (
              <li
                key={itemKey}
                className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {item.product.name}
                    {item.variationName && (
                      <span className="text-xs text-muted-foreground ml-1">({item.variationName})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(unitPrice)} un.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onUpdateQuantity(itemKey, item.quantity - 1)}
                    className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    aria-label={`Diminuir quantidade de ${item.product.name}`}
                  >
                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-card-foreground" aria-label={`Quantidade: ${item.quantity}`}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(itemKey, item.quantity + 1)}
                    className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    aria-label={`Aumentar quantidade de ${item.product.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <span className="text-sm font-bold text-primary w-20 text-right">
                  {formatCurrency(unitPrice * item.quantity)}
                </span>
                <button
                  onClick={() => onRemove(itemKey)}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  aria-label={`Remover ${item.product.name} do carrinho`}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="text-2xl font-extrabold text-primary" aria-live="polite">
              {formatCurrency(total)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClear}
              className="flex-1 py-3 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring transition-colors min-h-[48px]"
              aria-label="Limpar todos os itens do carrinho"
            >
              Limpar
            </button>
            <button
              onClick={onCheckout}
              className="flex-[2] py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring transition-colors shadow-lg shadow-primary/20 min-h-[48px]"
            >
              {checkoutLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
