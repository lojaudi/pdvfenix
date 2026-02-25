import { Product, formatCurrency } from "@/data/products";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <button
      onClick={() => onAdd(product)}
      disabled={!product.inStock}
      className="group relative flex flex-col bg-card rounded-xl border border-border p-4 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-card-foreground text-sm leading-tight pr-2">
          {product.name}
        </h3>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between">
        <span className="text-lg font-bold text-primary">
          {formatCurrency(product.price)}
        </span>
        {product.stockQty <= 10 && product.inStock && (
          <span className="text-xs text-destructive font-medium">
            Restam {product.stockQty}
          </span>
        )}
      </div>
    </button>
  );
}
