import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Clock, Package, Bike, CheckCircle2, XCircle, MapPin, Phone, User, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DriverMap } from "@/components/tracking/DriverMap";
import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

const statusSteps: { key: DeliveryStatus; label: string; icon: typeof Clock }[] = [
  { key: "aguardando", label: "Pedido recebido", icon: Clock },
  { key: "aceito", label: "Em preparo", icon: Package },
  { key: "saiu_para_entrega", label: "Saiu para entrega", icon: Bike },
  { key: "entregue", label: "Entregue", icon: CheckCircle2 },
];

interface TrackingData {
  delivery_status: DeliveryStatus;
  delivery_address: string;
  customer_phone: string;
  delivery_fee: number;
  created_at: string;
  delivered_at: string | null;
  notes: string | null;
  driver_id: string | null;
  orders: {
    id: string;
    total: number;
    customer_name: string | null;
    status: string;
    order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
  };
  delivery_drivers: { name: string; phone: string } | null;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function TrackingPage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("pedido") || "";
  const [orderId, setOrderId] = useState(initialId);
  const [searchInput, setSearchInput] = useState(initialId);
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTracking = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError("");
    setData(null);

    const { data: result, error: err } = await supabase
      .from("delivery_details")
      .select("delivery_status, delivery_address, customer_phone, delivery_fee, created_at, delivered_at, notes, driver_id, orders!delivery_details_order_id_fkey(id, total, customer_name, status, order_items(id, product_name, quantity, unit_price)), delivery_drivers!delivery_details_driver_id_fkey(name, phone)")
      .eq("order_id", id)
      .maybeSingle();

    setLoading(false);

    if (err || !result) {
      setError("Pedido não encontrado. Verifique o código.");
      return;
    }
    setData(result as unknown as TrackingData);
  };

  useEffect(() => {
    if (initialId) fetchTracking(initialId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime updates
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`tracking-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_details", filter: `order_id=eq.${orderId}` }, () => {
        fetchTracking(orderId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setOrderId(searchInput.trim());
    fetchTracking(searchInput.trim());
  };

  const isCancelled = data?.delivery_status === "cancelado";
  const currentIdx = isCancelled ? -1 : statusSteps.findIndex((s) => s.key === data?.delivery_status);
  const showMap = data && !isCancelled && (data.delivery_status === "saiu_para_entrega" || data.delivery_status === "aceito");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/menu" className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">📦 Rastreio</h1>
            <p className="text-xs text-muted-foreground">Acompanhe seu pedido em tempo real</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Cole o código do pedido..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="font-mono text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="text-center py-12 text-muted-foreground text-sm">{error}</div>
        )}

        {data && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            {/* Real-time Map */}
            {showMap && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Localização do entregador
                  </h2>
                  <DriverMap driverId={data.driver_id} deliveryAddress={data.delivery_address} />
                </CardContent>
              </Card>
            )}

            {/* Status Timeline */}
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-bold text-foreground mb-4">Status do pedido</h2>

                {isCancelled ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <span className="text-sm font-semibold text-destructive">Pedido cancelado</span>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {statusSteps.map((step, idx) => {
                      const isCompleted = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                              isCurrent ? "bg-primary border-primary text-primary-foreground" :
                              isCompleted ? "bg-primary/20 border-primary text-primary" :
                              "bg-secondary border-border text-muted-foreground"
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            {idx < statusSteps.length - 1 && (
                              <div className={cn(
                                "w-0.5 h-8",
                                isCompleted ? "bg-primary" : "bg-border"
                              )} />
                            )}
                          </div>
                          <div className="pt-1">
                            <p className={cn(
                              "text-sm font-medium",
                              isCompleted ? "text-foreground" : "text-muted-foreground"
                            )}>{step.label}</p>
                            {isCurrent && (
                              <p className="text-xs text-primary font-medium">← Agora</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Info */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <h2 className="text-sm font-bold text-foreground">Detalhes</h2>

                {data.orders?.customer_name && (
                  <p className="text-xs text-foreground flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {data.orders.customer_name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {data.delivery_address}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  {data.customer_phone}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(data.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>

                {data.delivery_drivers && (
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2 mt-2">
                    <Bike className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{data.delivery_drivers.name}</p>
                      <p className="text-[10px] text-muted-foreground">{data.delivery_drivers.phone}</p>
                    </div>
                  </div>
                )}

                {data.notes && (
                  <p className="text-[10px] text-muted-foreground italic bg-secondary/30 rounded p-2">📝 {data.notes}</p>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardContent className="p-5 space-y-2">
                <h2 className="text-sm font-bold text-foreground">Itens</h2>
                {data.orders?.order_items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-foreground">{item.quantity}x {item.product_name}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.quantity * item.unit_price)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Taxa de entrega</span>
                    <span>{formatCurrency(data.delivery_fee)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Total</span>
                    <span className="font-mono text-primary">{formatCurrency((data.orders?.total || 0) + data.delivery_fee)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!data && !error && !loading && (
          <div className="text-center py-16 space-y-2">
            <Package className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">Insira o código do pedido para rastrear</p>
          </div>
        )}
      </main>
    </div>
  );
}
