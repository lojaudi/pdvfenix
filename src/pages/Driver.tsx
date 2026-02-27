import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bike, MapPin, Phone, User, Clock, Package, CheckCircle2,
  Navigation, History, Loader2, LogOut, RefreshCw, ExternalLink, Volume2, VolumeX,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

interface DeliveryWithOrder {
  id: string;
  order_id: string;
  delivery_address: string;
  customer_phone: string;
  delivery_fee: number;
  delivery_status: DeliveryStatus;
  notes: string | null;
  payment_on_delivery: boolean;
  driver_id: string | null;
  created_at: string;
  delivered_at: string | null;
  orders: {
    id: string;
    total: number;
    customer_name: string | null;
    status: string;
    order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
  };
}

const STATUS_FLOW: DeliveryStatus[] = ["aguardando", "aceito", "saiu_para_entrega", "entregue"];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  aguardando: { label: "Aguardando", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
  aceito: { label: "Aceito", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  saiu_para_entrega: { label: "Em Rota", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  entregue: { label: "Entregue", color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
  cancelado: { label: "Cancelado", color: "text-destructive", bg: "bg-destructive/15 border-destructive/30" },
};

type Tab = "active" | "history";

export default function DriverPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("active");
  const [sharingLocation, setSharingLocation] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("driver-sound-enabled");
    return saved !== null ? saved === "true" : true;
  });
  const [loginPhone, setLoginPhone] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Find driver record for this user
  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: ["driver-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Active deliveries assigned to this driver
  const { data: activeDeliveries, isLoading: activeLoading } = useQuery({
    queryKey: ["driver-active-deliveries", driver?.id],
    queryFn: async () => {
      if (!driver) return [];
      const { data, error } = await supabase
        .from("delivery_details")
        .select("*, orders!delivery_details_order_id_fkey(id, total, customer_name, status, order_items(id, product_name, quantity, unit_price))")
        .eq("driver_id", driver.id)
        .in("delivery_status", ["aceito", "saiu_para_entrega"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as DeliveryWithOrder[];
    },
    enabled: !!driver,
  });

  // Pending deliveries (no driver assigned yet)
  const { data: pendingDeliveries } = useQuery({
    queryKey: ["driver-pending-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_details")
        .select("*, orders!delivery_details_order_id_fkey(id, total, customer_name, status, order_items(id, product_name, quantity, unit_price))")
        .eq("delivery_status", "aguardando")
        .is("driver_id", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Only show deliveries where the order is ready (pronto) - not still being prepared
      const ready = (data as unknown as DeliveryWithOrder[]).filter(
        (d) => d.orders?.status === "pronto"
      );
      return ready;
    },
    enabled: !!driver,
  });

  // History
  const { data: history } = useQuery({
    queryKey: ["driver-history", driver?.id],
    queryFn: async () => {
      if (!driver) return [];
      const { data, error } = await supabase
        .from("delivery_details")
        .select("*, orders!delivery_details_order_id_fkey(id, total, customer_name, status, order_items(id, product_name, quantity, unit_price))")
        .eq("driver_id", driver.id)
        .in("delivery_status", ["entregue", "cancelado"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as DeliveryWithOrder[];
    },
    enabled: !!driver && tab === "history",
  });

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Play driver notification sound
  const playDriverSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const play = () => {
        const now = ctx.currentTime;
        const beep = (freq: number, start: number, end: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.4, start);
          gain.gain.exponentialRampToValueAtTime(0.01, end);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(end);
        };
        beep(880, now, now + 0.15);
        beep(1100, now + 0.18, now + 0.33);
        beep(1320, now + 0.36, now + 0.51);
        beep(880, now + 0.54, now + 0.69);
        beep(1320, now + 0.72, now + 0.9);
        setTimeout(() => ctx.close(), 1500);
      };
      if (ctx.state === "suspended") {
        ctx.resume().then(play).catch(() => {});
      } else {
        play();
      }
    } catch {}
  }, []);

  // Send browser push notification (works even with tab in background)
  const sendPushNotification = useCallback((title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "driver-delivery",
        requireInteraction: true,
      } as NotificationOptions);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }, []);

  // Track previous pending count to detect new deliveries
  const prevPendingCountRef = useRef(0);

  useEffect(() => {
    const currentCount = pendingDeliveries?.length ?? 0;
    const prevCount = prevPendingCountRef.current;

    if (prevCount > 0 || currentCount > 0) {
      // New deliveries appeared
      if (currentCount > prevCount && prevCount >= 0 && prevPendingCountRef.current !== -1) {
        if (soundEnabled) playDriverSound();
        // Vibrate on mobile devices
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 300]);
        }
        const diff = currentCount - prevCount;
        toast.info(`🛵 ${diff} nova(s) entrega(s) disponível(is)!`, { duration: 6000 });
        sendPushNotification(
          "Nova entrega disponível!",
          `${diff} nova(s) entrega(s) aguardando aceitação.`
        );
      }
    }

    prevPendingCountRef.current = currentCount;
  }, [pendingDeliveries?.length, playDriverSound, sendPushNotification, soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("driver-sound-enabled", String(next));
      return next;
    });
  }, []);

  // Realtime
  useEffect(() => {
    if (!driver) return;
    const channel = supabase
      .channel("driver-deliveries-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_details" }, (payload) => {
        try {
          queryClient.invalidateQueries({ queryKey: ["driver-active-deliveries"] });
          queryClient.invalidateQueries({ queryKey: ["driver-pending-deliveries"] });
          queryClient.invalidateQueries({ queryKey: ["driver-history"] });
          const newRow = payload.new as any;
          if (payload.eventType === "UPDATE" && newRow?.driver_id === driver.id && newRow?.delivery_status === "aceito") {
            toast.info("🛵 Nova entrega atribuída a você!");
          }
        } catch (err) {
          console.error("Realtime handler error:", err);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        try {
          queryClient.invalidateQueries({ queryKey: ["driver-pending-deliveries"] });
        } catch (err) {
          console.error("Realtime orders handler error:", err);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driver, queryClient]);

  // Location sharing
  const shareLocation = useCallback(() => {
    if (!driver || !navigator.geolocation) return;
    setSharingLocation(true);
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        await supabase
          .from("delivery_drivers")
          .update({
            current_lat: pos.coords.latitude,
            current_lng: pos.coords.longitude,
            location_updated_at: new Date().toISOString(),
          })
          .eq("id", driver.id);
      },
      (err) => {
        console.error("Geolocation error", err);
        toast.error("Erro ao obter localização");
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      setSharingLocation(false);
    };
  }, [driver]);

  useEffect(() => {
    if (driver && tab === "active") {
      const cleanup = shareLocation();
      return cleanup;
    }
  }, [driver, tab, shareLocation]);

  // Notify owner + customer via WhatsApp on status change
  const notifyStatusChange = async (orderId: string, newStatus: string, driverName: string) => {
    try {
      await supabase.functions.invoke("evolution-api", {
        body: { action: "notify-status-change", orderId, newStatus, driverName },
      });
    } catch (err) {
      console.error("WhatsApp notification error:", err);
    }
  };

  const acceptDelivery = async (deliveryId: string, orderId: string) => {
    if (!driver) return;
    try {
      const { error } = await supabase
        .from("delivery_details")
        .update({ driver_id: driver.id, delivery_status: "aceito" as any })
        .eq("id", deliveryId);
      if (error) { toast.error("Erro ao aceitar entrega"); return; }
      toast.success("Entrega aceita!");
      notifyStatusChange(orderId, "aceito", driver.name);
    } catch (err) {
      console.error("Erro ao aceitar entrega:", err);
      toast.error("Erro ao aceitar entrega. Tente novamente.");
    }
  };

  const advanceStatus = async (delivery: DeliveryWithOrder) => {
    try {
      const idx = STATUS_FLOW.indexOf(delivery.delivery_status);
      if (idx === -1 || idx >= STATUS_FLOW.length - 1) return;
      const next = STATUS_FLOW[idx + 1];
      const updateData: any = { delivery_status: next };
      if (next === "entregue") updateData.delivered_at = new Date().toISOString();
      const { error } = await supabase.from("delivery_details").update(updateData).eq("id", delivery.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      if (next === "entregue") {
        await supabase.from("orders").update({ status: "entregue" as any }).eq("id", delivery.order_id);
      }
      toast.success(`Entrega → ${statusConfig[next]?.label}`);
      notifyStatusChange(delivery.order_id, next, driver?.name || "");
    } catch (err) {
      console.error("Erro ao avançar status:", err);
      toast.error("Erro ao atualizar status. Tente novamente.");
    }
  };

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) {
      toast.error("Credenciais inválidas");
    }
    setLoginLoading(false);
  };

  // ---- LOGIN SCREEN ----
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
                <Bike className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-lg font-bold text-foreground">Painel do Entregador</h1>
              <p className="text-xs text-muted-foreground">Faça login para acessar suas entregas</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
                required
              />
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bike className="w-4 h-4" />}
                Entrar
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (driverLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="text-center space-y-3">
          <Bike className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-lg font-bold text-foreground">Sem acesso</h1>
          <p className="text-sm text-muted-foreground">Sua conta não está vinculada a nenhum entregador.<br />Peça ao administrador para vincular seu cadastro.</p>
          <button onClick={signOut} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold">
            Sair
          </button>
        </div>
      </div>
    );
  }

  // ---- MAIN DASHBOARD ----
  const allActive = [...(activeDeliveries || [])];
  const pending = pendingDeliveries || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Bike className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">{driver.name}</h1>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground">{driver.phone}</p>
                {sharingLocation && (
                  <Badge variant="outline" className="text-[9px] gap-1 py-0">
                    <Navigation className="w-2.5 h-2.5 text-green-500" /> GPS
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-colors", soundEnabled ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground")}
              title={soundEnabled ? "Desativar som" : "Ativar som"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={signOut} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-3 bg-secondary/30">
        <button
          onClick={() => setTab("active")}
          className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
            tab === "active" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
          )}
        >
          <Package className="w-3.5 h-3.5" /> Ativas ({allActive.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
            tab === "history" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
          )}
        >
          <History className="w-3.5 h-3.5" /> Histórico
        </button>
      </div>

      <main className="p-4 space-y-4 pb-20">
        {tab === "active" && (
          <>
            {/* Pending section */}
            {pending.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-400">Disponíveis para aceitar</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">{pending.length}</Badge>
                </div>
                {pending.map((d) => (
                  <DeliveryCard
                    key={d.id}
                    delivery={d}
                    onAccept={() => acceptDelivery(d.id, d.order_id)}
                    onOpenMaps={() => openMaps(d.delivery_address)}
                  />
                ))}
              </div>
            )}

            {/* Active section */}
            {allActive.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-orange-400">Minhas entregas</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">{allActive.length}</Badge>
                </div>
                {allActive.map((d) => (
                  <DeliveryCard
                    key={d.id}
                    delivery={d}
                    onAdvance={() => advanceStatus(d)}
                    onOpenMaps={() => openMaps(d.delivery_address)}
                    showAdvance
                  />
                ))}
              </div>
            )}

            {pending.length === 0 && allActive.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma entrega no momento</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Novas entregas aparecerão aqui automaticamente</p>
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <div className="space-y-2">
            {history?.length === 0 && (
              <div className="text-center py-16 text-sm text-muted-foreground">Nenhuma entrega no histórico</div>
            )}
            {history?.map((d) => (
              <DeliveryCard key={d.id} delivery={d} onOpenMaps={() => openMaps(d.delivery_address)} isHistory />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ---- DELIVERY CARD COMPONENT ----
function DeliveryCard({
  delivery,
  onAccept,
  onAdvance,
  onOpenMaps,
  showAdvance,
  isHistory,
}: {
  delivery: DeliveryWithOrder;
  onAccept?: () => void;
  onAdvance?: () => void;
  onOpenMaps: () => void;
  showAdvance?: boolean;
  isHistory?: boolean;
}) {
  const cfg = statusConfig[delivery.delivery_status] || statusConfig.aguardando;
  const nextIdx = STATUS_FLOW.indexOf(delivery.delivery_status) + 1;
  const nextLabel = nextIdx < STATUS_FLOW.length ? statusConfig[STATUS_FLOW[nextIdx]]?.label : null;

  return (
    <Card className={cn("border", cfg.bg)}>
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(delivery.created_at), "dd/MM HH:mm", { locale: ptBR })}
          </span>
        </div>

        {delivery.orders?.customer_name && (
          <p className="text-xs text-foreground flex items-center gap-1.5 font-medium">
            <User className="w-3 h-3 text-muted-foreground" />
            {delivery.orders.customer_name}
          </p>
        )}

        {/* Address with Maps button */}
        <button
          onClick={onOpenMaps}
          className="w-full text-left flex items-start gap-2 bg-secondary/50 rounded-lg p-2 hover:bg-secondary transition-colors group"
        >
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <span className="text-xs text-foreground flex-1">{delivery.delivery_address}</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>

        {/* Phone */}
        <a href={`tel:${delivery.customer_phone}`} className="text-xs text-muted-foreground flex items-center gap-1.5 hover:text-primary transition-colors">
          <Phone className="w-3 h-3" />
          {delivery.customer_phone}
        </a>

        {/* Items */}
        <div className="space-y-0.5">
          {delivery.orders?.order_items?.map((item) => (
            <div key={item.id} className="flex justify-between text-[11px]">
              <span className="text-foreground">{item.quantity}x {item.product_name}</span>
              <span className="text-muted-foreground">R$ {(item.quantity * item.unit_price).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-1.5 border-t border-border">
          <div>
            {delivery.delivery_fee > 0 && (
              <span className="text-[10px] text-muted-foreground block">Taxa: R$ {delivery.delivery_fee.toFixed(2)}</span>
            )}
            {delivery.payment_on_delivery && (
              <Badge variant="outline" className="text-[9px] mt-0.5">💵 Cobrar na entrega</Badge>
            )}
          </div>
          <span className="font-mono text-sm font-bold text-primary">
            R$ {((delivery.orders?.total || 0) + delivery.delivery_fee).toFixed(2)}
          </span>
        </div>

        {delivery.notes && (
          <p className="text-[10px] text-muted-foreground italic bg-secondary/30 rounded p-2">📝 {delivery.notes}</p>
        )}

        {isHistory && delivery.delivered_at && (
          <p className="text-[10px] text-muted-foreground">
            ✅ Entregue em {format(new Date(delivery.delivered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}

        {/* Actions */}
        {!isHistory && (
          <div className="flex gap-2 pt-1">
            {onAccept && (
              <button
                onClick={onAccept}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Aceitar entrega
              </button>
            )}
            {showAdvance && nextLabel && (
              <button
                onClick={onAdvance}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                → {nextLabel}
              </button>
            )}
            {onOpenMaps && !onAccept && (
              <button
                onClick={onOpenMaps}
                className="py-2.5 px-3 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold flex items-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" /> Navegar
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
