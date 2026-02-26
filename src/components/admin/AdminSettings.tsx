import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Phone, Store, Clock, MessageSquare } from "lucide-react";

export function AdminSettings() {
  const queryClient = useQueryClient();
  const [whatsapp, setWhatsapp] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) throw error;
      return data as { key: string; value: string }[];
    },
  });

  useEffect(() => {
    if (settings) {
      const get = (k: string) => settings.find((s) => s.key === k)?.value ?? "";
      setWhatsapp(get("whatsapp_number"));
      setRestaurantName(get("restaurant_name"));
      setOpeningHours(get("opening_hours"));
      setWelcomeMessage(get("welcome_message"));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entries = [
        { key: "whatsapp_number", value: whatsapp, updated_at: now },
        { key: "restaurant_name", value: restaurantName, updated_at: now },
        { key: "opening_hours", value: openingHours, updated_at: now },
        { key: "welcome_message", value: welcomeMessage, updated_at: now },
      ];
      const { error } = await supabase
        .from("app_settings")
        .upsert(entries, { onConflict: "key" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-foreground mb-1">Configurações</h2>
        <p className="text-xs text-muted-foreground">Ajustes gerais do restaurante</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-5 max-w-md">
        {/* Restaurant Name */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Nome do restaurante</label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Meu Restaurante"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
        </div>

        {/* WhatsApp */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Número WhatsApp</label>
          <p className="text-[10px] text-muted-foreground mb-2">Formato: 5511999999999</p>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="5511999999999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
              className="pl-10 bg-background border-border"
            />
          </div>
        </div>

        {/* Opening Hours */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Horário de funcionamento</label>
          <div className="relative">
            <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Textarea
              placeholder={"Seg-Sex: 11h–22h\nSáb-Dom: 10h–23h"}
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              className="pl-10 bg-background border-border min-h-[70px]"
              rows={2}
            />
          </div>
        </div>

        {/* Welcome Message */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Mensagem de boas-vindas do cardápio</label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Textarea
              placeholder="Bem-vindo ao nosso cardápio! Escolha seus pratos favoritos."
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="pl-10 bg-background border-border min-h-[70px]"
              rows={2}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}
