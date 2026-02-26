import { DbProduct } from "@/hooks/useProducts";
import { Plus } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface ProductCardProps {
  product: DbProduct;
  onAdd: (product: DbProduct) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <button
      onClick={() => onAdd(product)}
      disabled={!product.in_stock}
      className="group relative flex flex-col bg-card rounded-xl border border-border text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[88px] overflow-hidden"
      aria-label={`Adicionar ${product.name} - ${formatCurrency(product.price)}${!product.in_stock ? " (indisponível)" : ""}`}
    >
      {product.image_url && (
        <div className="w-full aspect-square bg-muted overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-card-foreground text-sm leading-tight pr-2">
            {product.name}
          </h3>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" aria-hidden="true">
            <Plus className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-auto flex items-end justify-between">
          <span className="text-base sm:text-lg font-bold text-primary">
            {formatCurrency(product.price)}
          </span>
          {product.stock_qty <= 10 && product.in_stock && (
            <span className="text-xs text-destructive font-medium" role="status">
              Restam {product.stock_qty}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
