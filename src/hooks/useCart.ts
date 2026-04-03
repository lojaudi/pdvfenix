import { useState, useCallback } from "react";
import { DbProduct } from "@/hooks/useProducts";
import { CartItem } from "@/components/pos/CartPanel";

function getItemKey(item: CartItem): string {
  return item.variationName ? `${item.product.id}_${item.variationName}` : item.product.id;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: DbProduct, variationName?: string, variationPrice?: number) => {
    const key = variationName ? `${product.id}_${variationName}` : product.id;
    setItems((prev) => {
      const existing = prev.find((i) => getItemKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          getItemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, variationName, variationPrice }];
    });
  }, []);

  const removeItem = useCallback((itemKey: string) => {
    setItems((prev) => prev.filter((i) => getItemKey(i) !== itemKey));
  }, []);

  const updateQuantity = useCallback((itemKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => getItemKey(i) !== itemKey));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (getItemKey(i) === itemKey ? { ...i, quantity } : i))
    );
  }, []);

  const updateNotes = useCallback((itemKey: string, notes: string) => {
    setItems((prev) =>
      prev.map((i) => (getItemKey(i) === itemKey ? { ...i, notes } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => {
    const price = i.variationPrice ?? i.product.price;
    return sum + price * i.quantity;
  }, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, updateNotes, clearCart, total, itemCount };
}
