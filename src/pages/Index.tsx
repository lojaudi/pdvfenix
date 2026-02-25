import { useState } from "react";
import { products, Product, OrderChannel, PaymentMethod } from "@/data/products";
import { useCart } from "@/hooks/useCart";
import { CategoryTabs } from "@/components/pos/CategoryTabs";
import { ProductCard } from "@/components/pos/ProductCard";
import { CartPanel } from "@/components/pos/CartPanel";
import { ChannelSelector } from "@/components/pos/ChannelSelector";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { TableSelector } from "@/components/pos/TableSelector";
import { toast } from "sonner";
import { Store } from "lucide-react";

const channelLabels: Record<OrderChannel, string> = {
  balcao: "Balcão",
  garcom: "Garçom",
  delivery: "Delivery",
};

const Index = () => {
  const [channel, setChannel] = useState<OrderChannel>("balcao");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const cart = useCart();

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.categoryId === selectedCategory);

  const handleCheckout = () => {
    if (channel === "garcom" && !selectedTable) {
      toast.error("Selecione uma mesa antes de finalizar!");
      return;
    }
    setShowPayment(true);
  };

  const handlePayment = (method: PaymentMethod) => {
    toast.success(
      `Pedido finalizado! Pagamento via ${method.toUpperCase()} • ${channelLabels[channel]}${
        selectedTable ? ` • Mesa ${selectedTable}` : ""
      }`
    );
    cart.clearCart();
    setShowPayment(false);
    setSelectedTable(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">PDV Express</h1>
              <p className="text-xs text-muted-foreground">Sistema de Vendas</p>
            </div>
          </div>
          <ChannelSelector selected={channel} onSelect={setChannel} />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Table selector for waiter mode */}
          {channel === "garcom" && (
            <TableSelector onSelect={setSelectedTable} selectedTable={selectedTable} />
          )}

          {/* Delivery customer name */}
          {channel === "delivery" && (
            <div className="mb-4">
              <label className="text-sm font-semibold text-muted-foreground block mb-2">
                Nome do Cliente
              </label>
              <input
                type="text"
                placeholder="Digite o nome do cliente..."
                className="w-full max-w-sm px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={cart.addItem} />
            ))}
          </div>
        </div>
      </div>

      {/* Cart sidebar */}
      <div className="w-[380px] flex-shrink-0 hidden md:flex">
        <CartPanel
          items={cart.items}
          total={cart.total}
          onUpdateQuantity={cart.updateQuantity}
          onRemove={cart.removeItem}
          onClear={cart.clearCart}
          onCheckout={handleCheckout}
          channelLabel={channelLabels[channel]}
          tableNumber={channel === "garcom" ? selectedTable ?? undefined : undefined}
        />
      </div>

      {/* Mobile cart floating button */}
      {cart.itemCount > 0 && (
        <button
          onClick={handleCheckout}
          className="md:hidden fixed bottom-6 right-6 bg-primary text-primary-foreground px-6 py-4 rounded-2xl font-bold shadow-2xl shadow-primary/30 flex items-center gap-3 z-40"
        >
          <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold">
            {cart.itemCount}
          </span>
          Ver Pedido
        </button>
      )}

      {/* Payment modal */}
      {showPayment && (
        <PaymentDialog
          total={cart.total}
          onConfirm={handlePayment}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
};

export default Index;
