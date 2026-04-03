import { useState, useMemo, useEffect } from "react";
import { normalizePhone } from "@/lib/phone";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Plus, Minus, Trash2, Send, MapPin, Phone, User, MessageSquare, Search, MapPinned, Lock, X } from "lucide-react";
import { NeonBoard } from "@/components/menu/NeonBoard";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCatalogUnlocked } from "@/hooks/useCatalogUnlocked";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  variationName?: string;
}

type Variation = {
  id: string;
  name: string;
  price: number;
};

interface DeliveryZone {
  id: string;
  name: string;
  fee_type: string;
  fee_value: number;
}

export default function MenuPage() {
  const navigate = useNavigate();
  const { unlocked: catalogUnlocked, loading: catalogLoading } = useCatalogUnlocked();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [paymentOnDelivery, setPaymentOnDelivery] = useState(true);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<"dinheiro" | "credito" | "debito" | "pix_maquina">("dinheiro");
  const [changeFor, setChangeFor] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["menu-categories"],
    queryFn: async () => {
      const all: any[] = [];
      let offset = 0;
      while (true) {
        const { data } = await supabase.from("categories").select("*").order("sort_order").range(offset, offset + 999);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return all;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["menu-products"],
    queryFn: async () => {
      const all: any[] = [];
      let offset = 0;
      while (true) {
        const { data } = await supabase.from("products").select("*").eq("in_stock", true).order("name").range(offset, offset + 999);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return all;
    },
  });

  const { data: zones } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("is_active", true)
        .order("name");
      return (data || []) as DeliveryZone[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["menu-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["whatsapp_number", "restaurant_name", "opening_hours", "welcome_message", "restaurant_logo"]);
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  const whatsappNumber = settings?.whatsapp_number || "";
  const restaurantName = settings?.restaurant_name || "🔥 PDV Fênix";
  const openingHours = settings?.opening_hours || "";
  const welcomeMessage = settings?.welcome_message || "";
  const restaurantLogo = settings?.restaurant_logo || "";

  const filteredProducts = useMemo(() => {
    let list = products || [];
    if (selectedCategory) list = list.filter((p) => p.category_id === selectedCategory);
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [products, selectedCategory, search]);

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const deliveryFee = zones?.find((z) => z.id === selectedZone)?.fee_value || 0;
  const grandTotal = cartTotal + deliveryFee;

  const [variationProduct, setVariationProduct] = useState<any | null>(null);
  const [variationsList, setVariationsList] = useState<Variation[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [productVariationCounts, setProductVariationCounts] = useState<Record<string, number>>({});

  // Load variation counts
  useEffect(() => {
    if (!products || products.length === 0) return;
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

  const openVariationPicker = (product: any) => {
    setVariationProduct(product);
    setVariationsLoading(true);
    supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", product.id)
      .order("created_at")
      .then(({ data }) => {
        setVariationsList((data as Variation[]) || []);
        setVariationsLoading(false);
      });
  };

  const handleProductClick = (product: any) => {
    if (productVariationCounts[product.id] > 0) {
      openVariationPicker(product);
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product: { id: string; name: string; price: number }, variationName?: string, variationPrice?: number) => {
    const cartKey = variationName ? `${product.id}_${variationName}` : product.id;
    const displayName = variationName ? `${product.name} (${variationName})` : product.name;
    const finalPrice = variationPrice ?? product.price;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === cartKey);
      if (existing) return prev.map((i) => (i.id === cartKey ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: cartKey, productId: product.id, name: displayName, price: finalPrice, qty: 1, variationName }];
    });
    toast.success(`${displayName} adicionado!`, { duration: 1500 });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)).filter((i) => i.qty > 0)
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const handleVariationSelect = (variationName?: string, variationPrice?: number) => {
    if (variationProduct) {
      addToCart(variationProduct, variationName, variationPrice);
      setVariationProduct(null);
    }
  };

  const [sending, setSending] = useState(false);

  const sendOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      toast.error("Preencha nome, telefone e endereço");
      return;
    }
    if (cart.length === 0) {
      toast.error("Adicione itens ao carrinho");
      return;
    }

    setSending(true);
    try {
      // Build full notes with change info
      const methodLabels: Record<string, string> = { dinheiro: "Dinheiro", credito: "Cartão Crédito", debito: "Cartão Débito", pix_maquina: "PIX Máquina" };
      const changeNote = paymentOnDelivery && deliveryPaymentMethod === "dinheiro" && changeFor.trim()
        ? `Troco para R$ ${changeFor}`
        : paymentOnDelivery && deliveryPaymentMethod === "dinheiro"
        ? "Sem troco (valor exato)"
        : "";
      const fullNotes = [notes, changeNote].filter(Boolean).join(" | ") || null;

      // 1. Create order
      const paymentMethod = paymentOnDelivery ? deliveryPaymentMethod : ("pix" as const);
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          channel: "delivery" as const,
          customer_name: customerName,
          status: "aberto" as const,
          payment_method: paymentMethod,
          total: grandTotal,
          user_id: null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // 3. Create delivery details
      const { error: deliveryError } = await supabase.from("delivery_details").insert({
        order_id: order.id,
        customer_phone: normalizePhone(customerPhone),
        delivery_address: deliveryAddress,
        delivery_zone_id: selectedZone || null,
        delivery_fee: deliveryFee,
        payment_on_delivery: paymentOnDelivery,
        notes: fullNotes,
      });
      if (deliveryError) throw deliveryError;

      // 4. Send WhatsApp message if number is configured
      if (whatsappNumber) {
        const zoneName = zones?.find((z) => z.id === selectedZone)?.name || "Não selecionada";
        const payLabel = paymentOnDelivery ? `Na entrega (${methodLabels[deliveryPaymentMethod]})` : "PIX antecipado";
        const lines = [
          `🛒 *NOVO PEDIDO DELIVERY*`,
          ``,
          `👤 *Cliente:* ${customerName}`,
          `📱 *Telefone:* ${customerPhone}`,
          `📍 *Endereço:* ${deliveryAddress}`,
          `🏘️ *Região:* ${zoneName}`,
          `💳 *Pagamento:* ${payLabel}`,
          changeNote ? `💵 *${changeNote}*` : "",
          notes ? `📝 *Obs:* ${notes}` : "",
          ``,
          `*── ITENS ──*`,
          ...cart.map((i) => `• ${i.qty}x ${i.name} — ${formatCurrency(i.price * i.qty)}`),
          ``,
          `🚚 *Taxa de entrega:* ${formatCurrency(deliveryFee)}`,
          `💰 *TOTAL: ${formatCurrency(grandTotal)}*`,
        ].filter(Boolean);
        const text = encodeURIComponent(lines.join("\n"));
        window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
      }

      // 5. Reset state and redirect to tracking
      const trackingUrl = `/rastreio?pedido=${order.id}`;
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setSelectedZone("");
      setNotes("");
      setChangeFor("");
      setDeliveryPaymentMethod("dinheiro");
      setShowCart(false);
      toast.success("Pedido registrado! Redirecionando...");
      setTimeout(() => { window.location.href = trackingUrl; }, 1500);
    } catch (err: any) {
      console.error("Erro ao criar pedido:", err);
      toast.error("Erro ao enviar pedido. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  if (catalogLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!catalogUnlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Catálogo Indisponível</h1>
          <p className="text-sm text-muted-foreground">
            Não estamos aceitando pedido nesse momento, favor retornar mais tarde.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurantLogo && (
              <img src={restaurantLogo} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground">{restaurantName}</h1>
              <p className="text-xs text-muted-foreground">
                {openingHours ? `${openingHours} • Delivery` : "Cardápio Online • Delivery"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/rastreio")}
              className="h-9 px-3 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary/80 transition-colors"
            >
              <MapPinned className="w-4 h-4" />
              Rastrear
            </button>
            <button
              onClick={() => setShowCart(true)}
              className="relative w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Welcome message */}
      {welcomeMessage && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="bg-primary/10 text-primary rounded-xl px-4 py-3 text-sm font-medium">
            {welcomeMessage}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-4 space-y-4 pb-24">
        {/* Neon Board */}
        <NeonBoard />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              !selectedCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Todos
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map((product) => {
            const hasVariations = productVariationCounts[product.id] > 0;
            const inCart = !hasVariations ? cart.find((i) => i.id === product.id) : null;
            return (
              <div
                key={product.id}
                className="bg-card border border-border rounded-xl overflow-hidden flex justify-between items-center gap-3"
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-20 h-20 object-cover flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0 p-4">
                  <h3 className="text-sm font-semibold text-foreground truncate">{product.name}</h3>
                  <p className="text-primary font-bold text-sm mt-1">
                    {hasVariations && product.price === 0 ? "Ver opções" : formatCurrency(product.price)}
                  </p>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(inCart.id, -1)}
                      className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-foreground w-5 text-center">{inCart.qty}</span>
                    <button
                      onClick={() => updateQty(inCart.id, 1)}
                      className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleProductClick(product)}
                    className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhum produto encontrado</div>
        )}
      </main>

      {/* Floating cart bar */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border p-3">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Ver carrinho • {cartCount} {cartCount === 1 ? "item" : "itens"} • {formatCurrency(cartTotal)}
            </button>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setShowCart(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">🛒 Seu Pedido</h2>
              <button onClick={() => setShowCart(false)} className="text-muted-foreground hover:text-foreground text-sm">
                Fechar ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carrinho vazio</p>
              ) : (
                <>
                  {/* Cart items */}
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} un.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded bg-secondary flex items-center justify-center">
                            <Minus className="w-3 h-3 text-foreground" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center text-foreground">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded bg-primary text-primary-foreground flex items-center justify-center">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-foreground w-20 text-right">
                          {formatCurrency(item.price * item.qty)}
                        </span>
                        <button onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Customer info */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <h3 className="text-sm font-bold text-foreground">Dados para entrega</h3>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Seu nome" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="pl-10 bg-background border-border" />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">+55</span>
                      <Input placeholder="34999999999" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))} className="pl-[4.5rem] bg-background border-border" maxLength={11} />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Endereço completo" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="pl-10 bg-background border-border" />
                    </div>

                    {/* Delivery zone */}
                    {zones && zones.length > 0 && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Região de entrega</label>
                        <select
                          value={selectedZone}
                          onChange={(e) => setSelectedZone(e.target.value)}
                          className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground"
                        >
                          <option value="">Selecione sua região</option>
                          {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.name} — {formatCurrency(z.fee_value)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                     {/* Payment */}
                     <div>
                       <label className="text-xs text-muted-foreground mb-1 block">Pagamento</label>
                       <div className="flex gap-2">
                         <button
                           onClick={() => setPaymentOnDelivery(true)}
                           className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                             paymentOnDelivery ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                           }`}
                         >
                           Na entrega
                         </button>
                         <button
                           onClick={() => setPaymentOnDelivery(false)}
                           className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                             !paymentOnDelivery ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                           }`}
                         >
                           PIX antecipado
                         </button>
                       </div>
                     </div>

                     {/* Delivery payment method selection */}
                     {paymentOnDelivery && (
                       <div>
                         <label className="text-xs text-muted-foreground mb-1 block">Forma de pagamento na entrega</label>
                         <div className="grid grid-cols-2 gap-2">
                           {([
                             { id: "dinheiro", label: "💵 Dinheiro" },
                             { id: "credito", label: "💳 Crédito" },
                             { id: "debito", label: "📱 Débito" },
                             { id: "pix_maquina", label: "📲 PIX Máquina" },
                           ] as const).map((m) => (
                             <button
                               key={m.id}
                               onClick={() => { setDeliveryPaymentMethod(m.id); if (m.id !== "dinheiro") setChangeFor(""); }}
                               className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                                 deliveryPaymentMethod === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                               }`}
                             >
                               {m.label}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Change for cash */}
                     {paymentOnDelivery && deliveryPaymentMethod === "dinheiro" && (
                       <div className="space-y-2">
                         <label className="text-xs text-muted-foreground mb-1 block">Precisa de troco? Para quanto?</label>
                         <Input
                           placeholder="Ex: 50 (deixe vazio se não precisa)"
                           value={changeFor}
                           onChange={(e) => setChangeFor(e.target.value.replace(/[^0-9.,]/g, ""))}
                           className="bg-background border-border"
                           inputMode="decimal"
                         />
                         {(() => {
                           const changeForNum = parseFloat(changeFor.replace(",", ".")) || 0;
                           if (changeForNum > 0) {
                             const changeAmount = changeForNum - grandTotal;
                             return (
                               <div className={`text-center p-2.5 rounded-lg ${changeAmount >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                                 <p className="text-[10px] text-muted-foreground">Troco calculado</p>
                                 <p className={`text-lg font-extrabold ${changeAmount >= 0 ? "text-primary" : "text-destructive"}`}>
                                   {changeAmount >= 0 ? formatCurrency(changeAmount) : "Valor insuficiente"}
                                 </p>
                               </div>
                             );
                           }
                           return null;
                         })()}
                       </div>
                     )}

                    {/* Notes */}
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <textarea
                        placeholder="Observações (opcional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-lg bg-background border border-border pl-10 pr-3 py-2 text-sm text-foreground min-h-[60px] resize-none"
                      />
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">{formatCurrency(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entrega</span>
                      <span className="text-foreground">{formatCurrency(deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>

                  {/* WhatsApp button */}
                  <button
                    onClick={sendOrder}
                    disabled={sending}
                    className="w-full py-3.5 rounded-xl bg-[hsl(142,60%,45%)] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity min-h-[48px] disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                    {sending ? "Enviando..." : "Enviar Pedido via WhatsApp"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Variation Picker Modal */}
      {variationProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setVariationProduct(null)}>
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-card-foreground">{variationProduct.name}</h3>
              <button onClick={() => setVariationProduct(null)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-muted-foreground mb-3">Selecione uma variação:</p>
              {variationsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : (
                <>
                  {variationProduct.price > 0 && (
                    <button
                      onClick={() => handleVariationSelect()}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                    >
                      <span className="font-medium text-card-foreground text-sm">Padrão</span>
                      <span className="font-bold text-primary">{formatCurrency(variationProduct.price)}</span>
                    </button>
                  )}
                  {variationsList.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleVariationSelect(v.name, v.price)}
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
      )}
    </div>
  );
}
