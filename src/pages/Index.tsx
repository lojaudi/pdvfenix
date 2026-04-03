import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts, DbProduct } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSystemUnlocked } from "@/hooks/useSystemUnlocked";
import { useCatalogUnlocked } from "@/hooks/useCatalogUnlocked";
import { CategoryTabs } from "@/components/pos/CategoryTabs";
import { ProductCard } from "@/components/pos/ProductCard";
import { CartPanel } from "@/components/pos/CartPanel";
import { ChannelSelector } from "@/components/pos/ChannelSelector";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { TableSelector } from "@/components/pos/TableSelector";
import { TableOrdersSummary } from "@/components/pos/TableOrdersSummary";
import { VariationPicker } from "@/components/pos/VariationPicker";
import { createOrder } from "@/services/orderService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Store, LogOut, Loader2, Settings, BarChart3, ClipboardList, LayoutGrid, Wallet, Bike, Link2, Check, Unlock, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type OrderChannel = "balcao" | "garcom" | "delivery";
import type { PaymentMethod as PaymentMethodType } from "@/components/pos/PaymentDialog";

const channelLabels: Record<OrderChannel, string> = {
  balcao: "Balcão",
  garcom: "Garçom",
  delivery: "Delivery",
};

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isWaiter, isCashier, isKitchen } = useUserRole();
  const { unlocked, toggle: toggleSystem } = useSystemUnlocked();
  const { unlocked: catalogUnlocked, toggle: toggleCatalog } = useCatalogUnlocked();
  const { categories, products, loading } = useProducts();
  const [channel, setChannel] = useState<OrderChannel>("balcao");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [variationProduct, setVariationProduct] = useState<DbProduct | null>(null);
  const [productVariationCounts, setProductVariationCounts] = useState<Record<string, number>>({});
  const cart = useCart();

  const catalogUrl = `${window.location.origin}/menu`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopiedUrl(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  useEffect(() => {
    if (isWaiter) setChannel("garcom");
  }, [isWaiter]);

  // Kitchen users are redirected to their dedicated screen
  useEffect(() => {
    if (isKitchen) navigate("/kitchen", { replace: true });
  }, [isKitchen, navigate]);

  // Load variation counts for all products
  useEffect(() => {
    if (products.length === 0) return;
    supabase
      .from("product_variations")
      .select("product_id")
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data || []).forEach((v: any) => {
          counts[v.product_id] = (counts[v.product_id] || 0) + 1;
        });
        setProductVariationCounts(counts);
      });
  }, [products]);

  const handleAddProduct = useCallback((product: DbProduct) => {
    if (productVariationCounts[product.id] > 0) {
      setVariationProduct(product);
    } else {
      cart.addItem(product);
    }
  }, [productVariationCounts, cart]);

  const handleVariationSelect = useCallback((product: DbProduct, variationName?: string, variationPrice?: number) => {
    cart.addItem(product, variationName, variationPrice);
    setVariationProduct(null);
  }, [cart]);

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category_id === selectedCategory);

  const handleCheckout = async () => {
    if (channel === "garcom" && !selectedTable) {
      toast.error("Selecione uma mesa antes de finalizar!");
      return;
    }
    if (channel === "garcom") {
      if (!user) return;
      setSubmitting(true);
      try {
        await createOrder(cart.items, channel, undefined as any, user.id, selectedTable ?? undefined);
        toast.success(`Pedido enviado para Mesa ${selectedTable}!`);
        cart.clearCart();
        setSelectedTable(null);
        setShowMobileCart(false);
      } catch (err: any) {
        toast.error(err.message || "Erro ao enviar pedido");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setShowPayment(true);
  };

  const handlePayment = async (method: PaymentMethodType, _changeValue?: number) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await createOrder(cart.items, channel, method, user.id, selectedTable ?? undefined, customerName || undefined);
      toast.success(
        `Pedido finalizado! Pagamento via ${method.toUpperCase()} • ${channelLabels[channel]}${selectedTable ? ` • Mesa ${selectedTable}` : ""}`
      );
      cart.clearCart();
      setShowPayment(false);
      setSelectedTable(null);
      setCustomerName("");
      setShowMobileCart(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar pedido");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" role="status" aria-label="Carregando produtos">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="sr-only">Carregando produtos...</span>
      </div>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">PDV Express</h1>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">{user?.email}</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap justify-end" aria-label="Navegação principal">
            <div className="hidden sm:flex">
              <ChannelSelector selected={channel} onSelect={setChannel} hiddenChannels={isWaiter ? ["balcao", "delivery"] : []} />
            </div>
            <NavButton onClick={() => navigate("/orders")} title="Pedidos Ativos" icon={ClipboardList} />
            <NavButton onClick={() => navigate("/deliveries")} title="Entregas" icon={Bike} />
            <NavButton onClick={() => navigate("/tables")} title="Mesas" icon={LayoutGrid} />
            {(isAdmin || isCashier) && <NavButton onClick={() => navigate("/cashier")} title="Caixa" icon={Wallet} />}
            {isAdmin && (
              <>
                <NavButton onClick={() => navigate("/reports")} title="Relatórios" icon={BarChart3} />
                <NavButton onClick={() => navigate("/admin")} title="Administração" icon={Settings} />
              </>
            )}
            <NavButton onClick={signOut} title="Sair" icon={LogOut} />
          </nav>
        </header>

        {/* System unlock toggle (admin only) */}
        {isAdmin && (
          <div className="px-4 sm:px-6 pt-3">
            <button
              onClick={toggleSystem}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                unlocked
                  ? "bg-green-500/15 text-green-600 border border-green-500/30 hover:bg-green-500/25"
                  : "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25"
              }`}
            >
              {unlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {unlocked ? "Sistema Liberado — Clique para Bloquear" : "Liberar Sistema"}
            </button>
          </div>
        )}

        {/* Catalog unlock toggle (admin only) */}
        {isAdmin && (
          <div className="px-4 sm:px-6 pt-3">
            <button
              onClick={toggleCatalog}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                catalogUnlocked
                  ? "bg-green-500/15 text-green-600 border border-green-500/30 hover:bg-green-500/25"
                  : "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25"
              }`}
            >
              {catalogUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {catalogUnlocked ? "Catálogo/Deliveries Liberado — Clique para Bloquear" : "Liberar Catálogo/Deliveries"}
            </button>
          </div>
        )}

        {/* Catalog URL banner */}
        <div className="px-4 sm:px-6 pt-3">
          <div className="flex items-center gap-2 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-xs">
            <Link2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-muted-foreground flex-shrink-0">Catálogo:</span>
            <span className="font-mono text-foreground truncate">{catalogUrl}</span>
            <button
              onClick={handleCopyUrl}
              className="ml-auto flex-shrink-0 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors flex items-center gap-1"
            >
              {copiedUrl ? <><Check className="w-3 h-3" /> Copiado</> : "Copiar"}
            </button>
          </div>
        </div>

        {/* Mobile channel selector */}
        <div className="sm:hidden px-4 pt-3">
          <ChannelSelector selected={channel} onSelect={setChannel} hiddenChannels={isWaiter ? ["balcao", "delivery"] : []} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {channel === "garcom" && (
            <>
              <TableSelector onSelect={setSelectedTable} selectedTable={selectedTable} currentUserId={user?.id} />
              {selectedTable && <TableOrdersSummary tableNumber={selectedTable} />}
            </>
          )}

          {channel === "delivery" && (
            <div className="mb-4">
              <label htmlFor="customer-name" className="text-sm font-semibold text-muted-foreground block mb-2">
                Nome do Cliente
              </label>
              <input
                id="customer-name"
                type="text"
                placeholder="Digite o nome do cliente..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full max-w-sm px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          <CategoryTabs categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={cart.addItem} />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop cart */}
      <aside className="w-[380px] flex-shrink-0 hidden md:flex" aria-label="Carrinho de compras">
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
      </aside>

      {/* Mobile cart FAB */}
      {cart.itemCount > 0 && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="md:hidden fixed bottom-6 right-6 bg-primary text-primary-foreground px-6 py-4 rounded-2xl font-bold shadow-2xl shadow-primary/30 flex items-center gap-3 z-40 min-h-[56px] active:scale-95 transition-transform"
          aria-label={`Ver pedido com ${cart.itemCount} itens`}
        >
          <span className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold" aria-hidden="true">
            {cart.itemCount}
          </span>
          Ver Pedido
        </button>
      )}

      {/* Mobile cart sheet */}
      <Sheet open={showMobileCart} onOpenChange={setShowMobileCart}>
        <SheetContent side="right" className="w-full sm:max-w-[400px] p-0">
          <SheetTitle className="sr-only">Carrinho de compras</SheetTitle>
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
        </SheetContent>
      </Sheet>

      {showPayment && (
        <PaymentDialog
          total={cart.total}
          onConfirm={handlePayment}
          onClose={() => setShowPayment(false)}
          channel={channel}
        />
      )}
    </main>
  );
};

function NavButton({ onClick, title, icon: Icon }: { onClick: () => void; title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
      title={title}
      aria-label={title}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}

export default Index;
