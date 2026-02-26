import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Plus, Minus, Trash2, Send, MapPin, Phone, User, MessageSquare, Search, MapPinned } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface DeliveryZone {
  id: string;
  name: string;
  fee_type: string;
  fee_value: number;
}

export default function MenuPage() {
  const navigate = useNavigate();
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

  const addToCart = (product: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
    toast.success(`${product.name} adicionado!`, { duration: 1500 });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)).filter((i) => i.qty > 0)
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

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
      // 1. Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          channel: "delivery" as const,
          customer_name: customerName,
          status: "aberto" as const,
          payment_method: paymentOnDelivery ? null : ("pix" as const),
          total: grandTotal,
          user_id: null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // 3. Create delivery details
      const { error: deliveryError } = await supabase.from("delivery_details").insert({
        order_id: order.id,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        delivery_zone_id: selectedZone || null,
        delivery_fee: deliveryFee,
        payment_on_delivery: paymentOnDelivery,
        notes: notes || null,
      });
      if (deliveryError) throw deliveryError;

      // 4. Send WhatsApp message if number is configured
      if (whatsappNumber) {
        const zoneName = zones?.find((z) => z.id === selectedZone)?.name || "Não selecionada";
        const payLabel = paymentOnDelivery ? "Na entrega" : "PIX antecipado";
        const lines = [
          `🛒 *NOVO PEDIDO DELIVERY*`,
          ``,
          `👤 *Cliente:* ${customerName}`,
          `📱 *Telefone:* ${customerPhone}`,
          `📍 *Endereço:* ${deliveryAddress}`,
          `🏘️ *Região:* ${zoneName}`,
          `💳 *Pagamento:* ${payLabel}`,
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
            const inCart = cart.find((i) => i.id === product.id);
            return (
              <div
                key={product.id}
                className="bg-card border border-border rounded-xl p-4 flex justify-between items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{product.name}</h3>
                  <p className="text-primary font-bold text-sm mt-1">{formatCurrency(product.price)}</p>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(product.id, -1)}
                      className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-foreground w-5 text-center">{inCart.qty}</span>
                    <button
                      onClick={() => updateQty(product.id, 1)}
                      className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(product)}
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
                      <Input placeholder="WhatsApp (ex: 11999999999)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="pl-10 bg-background border-border" />
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
    </div>
  );
}
