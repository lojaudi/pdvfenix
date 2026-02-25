import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { CategoryTabs } from "@/components/pos/CategoryTabs";
import { ProductCard } from "@/components/pos/ProductCard";
import { CartPanel } from "@/components/pos/CartPanel";
import { ChannelSelector } from "@/components/pos/ChannelSelector";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { TableSelector } from "@/components/pos/TableSelector";
import { createOrder } from "@/services/orderService";
import { toast } from "sonner";
import { Store, LogOut, Loader2, Settings, BarChart3, ClipboardList, LayoutGrid, Wallet } from "lucide-react";

type OrderChannel = "balcao" | "garcom" | "delivery";
type PaymentMethodType = "dinheiro" | "credito" | "debito" | "pix";

const channelLabels: Record<OrderChannel, string> = {
  balcao: "Balcão",
  garcom: "Garçom",
  delivery: "Delivery",
};

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isWaiter, isCashier } = useUserRole();
  const { categories, products, loading } = useProducts();
  const [channel, setChannel] = useState<OrderChannel>("balcao");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cart = useCart();

  useEffect(() => {
    if (isWaiter) setChannel("garcom");
  }, [isWaiter]);

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category_id === selectedCategory);

  const handleCheckout = async () => {
    if (channel === "garcom" && !selectedTable) {
      toast.error("Selecione uma mesa antes de finalizar!");
      return;
    }
    // Garçom: envia direto sem pagamento
    if (channel === "garcom") {
      if (!user) return;
      setSubmitting(true);
      try {
        await createOrder(
          cart.items,
          channel,
          undefined as any,
          user.id,
          selectedTable ?? undefined
        );
        toast.success(`Pedido enviado para Mesa ${selectedTable}!`);
        cart.clearCart();
        setSelectedTable(null);
      } catch (err: any) {
        toast.error(err.message || "Erro ao enviar pedido");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setShowPayment(true);
  };

  const handlePayment = async (method: PaymentMethodType) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await createOrder(
        cart.items,
        channel,
        method,
        user.id,
        selectedTable ?? undefined,
        customerName || undefined
      );
      toast.success(
        `Pedido finalizado! Pagamento via ${method.toUpperCase()} • ${channelLabels[channel]}${
          selectedTable ? ` • Mesa ${selectedTable}` : ""
        }`
      );
      cart.clearCart();
      setShowPayment(false);
      setSelectedTable(null);
      setCustomerName("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar pedido");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">PDV Express</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ChannelSelector selected={channel} onSelect={setChannel} hiddenChannels={isWaiter ? ["balcao", "delivery"] : []} />
            <button
              onClick={() => navigate("/orders")}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Pedidos Ativos"
            >
              <ClipboardList className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/tables")}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Mesas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            {(isAdmin || isCashier) && (
              <button
                onClick={() => navigate("/cashier")}
                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Caixa"
              >
                <Wallet className="w-4 h-4" />
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Relatórios"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/admin")}
                  className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Administração"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={signOut}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {channel === "garcom" && (
            <TableSelector onSelect={setSelectedTable} selectedTable={selectedTable} />
          )}

          {channel === "delivery" && (
            <div className="mb-4">
              <label className="text-sm font-semibold text-muted-foreground block mb-2">
                Nome do Cliente
              </label>
              <input
                type="text"
                placeholder="Digite o nome do cliente..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full max-w-sm px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          <CategoryTabs categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={cart.addItem} />
            ))}
          </div>
        </div>
      </div>

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
          checkoutLabel={channel === "garcom" ? "Enviar Pedido" : "Finalizar Pedido"}
        />
      </div>

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
