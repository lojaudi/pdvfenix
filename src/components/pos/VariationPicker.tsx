import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DbProduct } from "@/hooks/useProducts";
import { X } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

type Variation = {
  id: string;
  name: string;
  price: number;
};

interface VariationPickerProps {
  product: DbProduct;
  onSelect: (product: DbProduct, variationName?: string, variationPrice?: number) => void;
  onClose: () => void;
}

export function VariationPicker({ product, onSelect, onClose }: VariationPickerProps) {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", product.id)
      .order("created_at")
      .then(({ data }) => {
        setVariations((data as Variation[]) || []);
        setLoading(false);
      });
  }, [product.id]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-card-foreground">{product.name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <p className="text-sm text-muted-foreground mb-3">Selecione uma variação:</p>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : (
            <>
              {product.price > 0 && (
                <button
                  onClick={() => onSelect(product)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <span className="font-medium text-card-foreground text-sm">Padrão</span>
                  <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                </button>
              )}
              {variations.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelect(product, v.name, v.price)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <span className="font-medium text-card-foreground text-sm">{v.name}</span>
                  <span className="font-bold text-primary">{formatCurrency(v.price)}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
