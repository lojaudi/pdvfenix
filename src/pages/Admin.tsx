import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminDeliveryZones } from "@/components/admin/AdminDeliveryZones";
import { AdminDrivers } from "@/components/admin/AdminDrivers";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminVisualSettings } from "@/components/admin/AdminVisualSettings";
import { AdminNeonBoard } from "@/components/admin/AdminNeonBoard";
import { ArrowLeft, Package, Grid3X3, Users, Loader2, ShieldAlert, Truck, Bike, Settings, Palette, Zap } from "lucide-react";

type Tab = "products" | "categories" | "users" | "delivery" | "drivers" | "settings" | "visual" | "neon";

const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "products", label: "Produtos", icon: Package },
  { id: "categories", label: "Categorias", icon: Grid3X3 },
  { id: "users", label: "Usuários", icon: Users },
  { id: "delivery", label: "Zonas", icon: Truck },
  { id: "drivers", label: "Entregadores", icon: Bike },
  { id: "settings", label: "Config", icon: Settings },
  { id: "visual", label: "Visual", icon: Palette },
  { id: "neon", label: "Neon", icon: Zap },
];

export default function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const navigate = useNavigate();

  const { data: adminSettings } = useQuery({
    queryKey: ["admin-header-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["restaurant_name", "restaurant_logo"]);
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  const adminLogo = adminSettings?.restaurant_logo || "";
  const adminName = adminSettings?.restaurant_name || "Administração";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-4">Você não tem permissão de administrador.</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            Voltar ao PDV
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            {adminLogo && (
              <img src={adminLogo} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground">{adminName}</h1>
              <p className="text-xs text-muted-foreground">Gerenciamento do sistema</p>
            </div>
          </div>
          <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {activeTab === "products" && <AdminProducts />}
        {activeTab === "categories" && <AdminCategories />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "delivery" && <AdminDeliveryZones />}
        {activeTab === "drivers" && <AdminDrivers />}
        {activeTab === "settings" && <AdminSettings />}
        {activeTab === "visual" && <AdminVisualSettings />}
        {activeTab === "neon" && <AdminNeonBoard />}
      </main>
    </div>
  );
}
