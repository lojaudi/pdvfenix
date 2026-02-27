import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Phone, Store, Clock, MessageSquare, ImagePlus, Trash2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function AdminSettings() {
  const queryClient = useQueryClient();
  const [whatsapp, setWhatsapp] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setLogoUrl(get("restaurant_logo"));
      setReceiptHeader(get("receipt_header"));
      setReceiptFooter(get("receipt_footer"));
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo.${ext}`;
      // Remove old logo first
      await supabase.storage.from("restaurant-assets").remove([path]);
      const { error } = await supabase.storage
        .from("restaurant-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const url = `${SUPABASE_URL}/storage/v1/object/public/restaurant-assets/${path}?t=${Date.now()}`;
      setLogoUrl(url);
      // Save to settings
      await supabase
        .from("app_settings")
        .upsert({ key: "restaurant_logo", value: url, updated_at: new Date().toISOString() }, { onConflict: "key" });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["menu-settings"] });
      toast.success("Logo enviado!");
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await supabase.storage.from("restaurant-assets").remove(["logo.png", "logo.jpg", "logo.jpeg", "logo.webp", "logo.svg"]);
      await supabase
        .from("app_settings")
        .upsert({ key: "restaurant_logo", value: "", updated_at: new Date().toISOString() }, { onConflict: "key" });
      setLogoUrl("");
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["menu-settings"] });
      toast.success("Logo removido!");
    } catch {
      toast.error("Erro ao remover logo");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entries = [
        { key: "whatsapp_number", value: whatsapp, updated_at: now },
        { key: "restaurant_name", value: restaurantName, updated_at: now },
        { key: "opening_hours", value: openingHours, updated_at: now },
        { key: "welcome_message", value: welcomeMessage, updated_at: now },
        { key: "receipt_header", value: receiptHeader, updated_at: now },
        { key: "receipt_footer", value: receiptFooter, updated_at: now },
      ];
      const { error } = await supabase
        .from("app_settings")
        .upsert(entries, { onConflict: "key" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["menu-settings"] });
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
        {/* Logo */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Logo do restaurante</label>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploadingLogo ? "Enviando..." : "Enviar logo"}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>

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

        {/* Receipt Header */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Cabeçalho da comanda / recibo</label>
          <p className="text-[10px] text-muted-foreground mb-2">Texto exibido no topo da impressão (ex: nome fantasia, CNPJ, endereço)</p>
          <Textarea
            placeholder={"PDV FÊNIX\nCNPJ: 00.000.000/0001-00\nRua Exemplo, 123"}
            value={receiptHeader}
            onChange={(e) => setReceiptHeader(e.target.value)}
            className="bg-background border-border min-h-[70px] font-mono text-xs"
            rows={3}
          />
        </div>

        {/* Receipt Footer */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Rodapé da comanda / recibo</label>
          <p className="text-[10px] text-muted-foreground mb-2">Texto exibido no final da impressão (ex: agradecimento, redes sociais)</p>
          <Textarea
            placeholder={"Obrigado pela preferência!\n@meurestarante • (11) 99999-9999"}
            value={receiptFooter}
            onChange={(e) => setReceiptFooter(e.target.value)}
            className="bg-background border-border min-h-[70px] font-mono text-xs"
            rows={3}
          />
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
