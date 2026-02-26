import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Phone } from "lucide-react";

export function AdminSettings() {
  const queryClient = useQueryClient();
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*");
      if (error) throw error;
      return data as { key: string; value: string }[];
    },
  });

  useEffect(() => {
    if (settings) {
      const wp = settings.find((s) => s.key === "whatsapp_number");
      if (wp) setWhatsapp(wp.value);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "whatsapp_number", value: whatsapp, updated_at: new Date().toISOString() }, { onConflict: "key" });
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

      <div className="bg-card border border-border rounded-xl p-4 space-y-4 max-w-md">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Número WhatsApp do restaurante</label>
          <p className="text-[10px] text-muted-foreground mb-2">Formato: código do país + DDD + número (ex: 5511999999999)</p>
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
