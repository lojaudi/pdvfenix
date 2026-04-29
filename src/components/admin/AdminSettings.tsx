import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Save, Phone, Store, Clock, MessageSquare, ImagePlus, Trash2, Printer, User, Mail, Lock, Eye, EyeOff, Layout, Type } from "lucide-react";

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
  const [paperWidth, setPaperWidth] = useState("80");
  
  // Independent presets for 58mm and 80mm
  const [presets, setPresets] = useState({
    "58": { marginTop: "0", marginLeft: "0", offsetX: "0", offsetY: "0", fontHeader: "12", fontItems: "9", fontFooter: "8" },
    "80": { marginTop: "0", marginLeft: "0", offsetX: "0", offsetY: "0", fontHeader: "14", fontItems: "11", fontFooter: "10" }
  });

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTestContent, setShowTestContent] = useState(false);

  // Profile editing state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Load current user profile
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfileEmail(user.email ?? "");
        const { data } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setProfileName(data.name);
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Update name in profiles table
      await supabase
        .from("profiles")
        .update({ name: profileName })
        .eq("user_id", user.id);

      // Update email if changed
      if (profileEmail !== user.email) {
        const { error } = await supabase.auth.updateUser({ email: profileEmail });
        if (error) throw error;
        toast.info("Um email de confirmação foi enviado para o novo endereço.");
      }

      toast.success("Perfil atualizado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  };

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
      setPaperWidth(get("paper_width") || "80");
      
      setPresets({
        "58": {
          marginTop: get("paper_width_58_margin_top") || get("receipt_margin_top") || "0",
          marginLeft: get("paper_width_58_margin_left") || get("receipt_margin_left") || "0",
          offsetX: get("paper_width_58_offset_x") || get("receipt_offset_x") || "0",
          offsetY: get("paper_width_58_offset_y") || get("receipt_offset_y") || "0",
          fontHeader: get("paper_width_58_font_header") || "12",
          fontItems: get("paper_width_58_font_items") || "9",
          fontFooter: get("paper_width_58_font_footer") || "8"
        },
        "80": {
          marginTop: get("paper_width_80_margin_top") || get("receipt_margin_top") || "0",
          marginLeft: get("paper_width_80_margin_left") || get("receipt_margin_left") || "0",
          offsetX: get("paper_width_80_offset_x") || get("receipt_offset_x") || "0",
          offsetY: get("paper_width_80_offset_y") || get("receipt_offset_y") || "0",
          fontHeader: get("paper_width_80_font_header") || "14",
          fontItems: get("paper_width_80_font_items") || "11",
          fontFooter: get("paper_width_80_font_footer") || "10"
        }
      });
    }
  }, [settings]);

  const updatePreset = (width: "58" | "80", field: string, value: string) => {
    setPresets(prev => ({
      ...prev,
      [width]: { ...prev[width], [field]: value }
    }));
  };

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
        { key: "paper_width", value: paperWidth, updated_at: now },
        
        // Save both presets
        { key: "paper_width_58_margin_top", value: presets["58"].marginTop, updated_at: now },
        { key: "paper_width_58_margin_left", value: presets["58"].marginLeft, updated_at: now },
        { key: "paper_width_58_offset_x", value: presets["58"].offsetX, updated_at: now },
        { key: "paper_width_58_offset_y", value: presets["58"].offsetY, updated_at: now },
        { key: "paper_width_58_font_header", value: presets["58"].fontHeader, updated_at: now },
        { key: "paper_width_58_font_items", value: presets["58"].fontItems, updated_at: now },
        { key: "paper_width_58_font_footer", value: presets["58"].fontFooter, updated_at: now },
        
        { key: "paper_width_80_margin_top", value: presets["80"].marginTop, updated_at: now },
        { key: "paper_width_80_margin_left", value: presets["80"].marginLeft, updated_at: now },
        { key: "paper_width_80_offset_x", value: presets["80"].offsetX, updated_at: now },
        { key: "paper_width_80_offset_y", value: presets["80"].offsetY, updated_at: now },
        { key: "paper_width_80_font_header", value: presets["80"].fontHeader, updated_at: now },
        { key: "paper_width_80_font_items", value: presets["80"].fontItems, updated_at: now },
        { key: "paper_width_80_font_footer", value: presets["80"].fontFooter, updated_at: now },
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

        {/* Printer Model */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Modelo da impressora (Tamanho do papel)</label>
          <div className="relative">
            <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Select value={paperWidth} onValueChange={setPaperWidth}>
              <SelectTrigger className="pl-10 bg-background border-border">
                <SelectValue placeholder="Selecione o tamanho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="80">Padrão 80mm (Média/Grande)</SelectItem>
                <SelectItem value="58">Compacta 58mm (Pequena)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calibration Settings */}
        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Calibração {paperWidth}mm (mm)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-foreground mb-1 block">Margem Topo</label>
                <Input
                  type="number"
                  value={presets[paperWidth as "58" | "80"].marginTop}
                  onChange={(e) => updatePreset(paperWidth as "58" | "80", "marginTop", e.target.value)}
                  className="bg-background border-border h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-foreground mb-1 block">Margem Esquerda</label>
                <Input
                  type="number"
                  value={presets[paperWidth as "58" | "80"].marginLeft}
                  onChange={(e) => updatePreset(paperWidth as "58" | "80", "marginLeft", e.target.value)}
                  className="bg-background border-border h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-foreground mb-1 block">Deslocamento X</label>
                <Input
                  type="number"
                  value={presets[paperWidth as "58" | "80"].offsetX}
                  onChange={(e) => updatePreset(paperWidth as "58" | "80", "offsetX", e.target.value)}
                  className="bg-background border-border h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-foreground mb-1 block">Deslocamento Y</label>
                <Input
                  type="number"
                  value={presets[paperWidth as "58" | "80"].offsetY}
                  onChange={(e) => updatePreset(paperWidth as "58" | "80", "offsetY", e.target.value)}
                  className="bg-background border-border h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3 h-3" /> Tamanho das Fontes
            </h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-semibold text-foreground">Cabeçalho ({presets[paperWidth as "58" | "80"].fontHeader}px)</label>
                </div>
                <Slider 
                  value={[parseInt(presets[paperWidth as "58" | "80"].fontHeader)]}
                  min={8} max={24} step={1}
                  onValueChange={([val]) => updatePreset(paperWidth as "58" | "80", "fontHeader", val.toString())}
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-semibold text-foreground">Itens/Corpo ({presets[paperWidth as "58" | "80"].fontItems}px)</label>
                </div>
                <Slider 
                  value={[parseInt(presets[paperWidth as "58" | "80"].fontItems)]}
                  min={6} max={18} step={1}
                  onValueChange={([val]) => updatePreset(paperWidth as "58" | "80", "fontItems", val.toString())}
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-semibold text-foreground">Rodapé ({presets[paperWidth as "58" | "80"].fontFooter}px)</label>
                </div>
                <Slider 
                  value={[parseInt(presets[paperWidth as "58" | "80"].fontFooter)]}
                  min={6} max={16} step={1}
                  onValueChange={([val]) => updatePreset(paperWidth as "58" | "80", "fontFooter", val.toString())}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Live Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> Pré-visualização ({paperWidth}mm)
            </label>
            <button
              onClick={() => setShowTestContent(!showTestContent)}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              {showTestContent ? "Ver comanda real" : "Ver teste de alinhamento"}
            </button>
          </div>
          <div 
            className="bg-white rounded-lg border border-border font-mono leading-relaxed mx-auto shadow-sm transition-all overflow-hidden relative" 
            style={{ 
              color: "#000",
              width: paperWidth === "58" ? "200px" : "280px",
              fontSize: paperWidth === "58" ? "9px" : "11px",
              padding: "4px",
            }}
          >
            {/* Linhas-guia e Régua */}
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 flex justify-between px-1 pointer-events-none">
              {[...Array(11)].map((_, i) => (
                <div key={i} className="h-full w-px bg-primary/40" />
              ))}
            </div>
            <div className="absolute top-0 left-0 h-full w-1 bg-primary/20 flex flex-col justify-between py-1 pointer-events-none">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-full h-px bg-primary/40" />
              ))}
            </div>
            <div className="absolute top-0 left-1/2 h-full w-px bg-red-500/30 border-l border-dashed border-red-500/50 pointer-events-none z-10" />

            <div style={{
              marginTop: `${presets[paperWidth as "58" | "80"].marginTop}px`,
              marginLeft: `${presets[paperWidth as "58" | "80"].marginLeft}px`,
              paddingLeft: `${presets[paperWidth as "58" | "80"].offsetX}px`,
              paddingTop: `${presets[paperWidth as "58" | "80"].offsetY}px`,
              padding: paperWidth === "58" ? "4px" : "12px",
              border: "1px dashed #eee",
              boxSizing: "border-box",
              position: "relative"
            }}>
            {showTestContent ? (
              /* Calibration Test Pattern */
              <div className="space-y-2 text-center">
                <div className="font-bold border-b border-black pb-1">TESTE DE ALINHAMENTO {paperWidth}mm</div>
                <div className="text-[10px] bg-black text-white py-0.5">MARGEM ESQUERDA ◀▶ MARGEM DIREITA</div>
                <div className="flex justify-between border-x border-black px-1 text-[8px]">
                  <span>| 0mm</span>
                  <span>CENTRO</span>
                  <span>{paperWidth}mm |</span>
                </div>
                <div className="py-2 space-y-1">
                  <div className="w-full bg-gray-200 h-4 flex items-center justify-center text-[8px] font-bold">BLOCO TOTAL LARGURA</div>
                  <div className="flex gap-1">
                    <div className="flex-1 bg-gray-300 h-4 flex items-center justify-center text-[7px]">ESQ</div>
                    <div className="flex-1 bg-gray-300 h-4 flex items-center justify-center text-[7px]">DIR</div>
                  </div>
                </div>
                <div className="text-[7px] leading-tight opacity-50">
                  {"LINHA DE TESTE REPETIDA PARA CALIBRAÇÃO ".repeat(3)}
                  {"LINHA DE TESTE REPETIDA PARA CALIBRAÇÃO ".repeat(3)}
                </div>
                <div className="border-t border-black pt-1 font-bold">FIM DO TESTE</div>
              </div>
            ) : (
              <>
                {/* Preview Header */}
                <div className="text-center mb-2">
                  {(receiptHeader || "PDV FÊNIX").split("\n").map((line, i) => (
                    <div key={i} style={{ 
                      fontSize: i === 0 
                        ? `${presets[paperWidth as "58" | "80"].fontHeader}px` 
                        : `${Math.max(6, parseInt(presets[paperWidth as "58" | "80"].fontHeader) - 4)}px`, 
                      fontWeight: i === 0 ? "bold" : "normal" 
                    }}>
                      {line}
                    </div>
                  ))}
                  <div style={{ fontSize: `${presets[paperWidth as "58" | "80"].fontFooter}px` }} className="text-gray-500">27/02/2026 14:30</div>
                </div>
                <div className="border-t border-dashed border-gray-400 my-1" />
                {/* Preview Order Info */}
                <div style={{ fontSize: `${presets[paperWidth as "58" | "80"].fontItems}px` }} className="mb-1 space-y-0.5">
                  <div><strong>Pedido:</strong> #A1B2C3D4</div>
                  <div><strong>Canal:</strong> Balcão</div>
                </div>
                <div className="border-t border-dashed border-gray-400 my-1" />
                {/* Preview Items */}
                <table className="w-full" style={{ fontSize: `${presets[paperWidth as "58" | "80"].fontItems}px` }}>
                  <thead>
                    <tr>
                      <th className="text-left pb-0.5">Item</th>
                      <th className="text-center pb-0.5">Qtd</th>
                      <th className="text-right pb-0.5">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>X-Burger</td><td className="text-center">2</td><td className="text-right">R$ 39,80</td></tr>
                    <tr><td>Coca-Cola</td><td className="text-center">2</td><td className="text-right">R$ 14,00</td></tr>
                    <tr><td>Batata Frita</td><td className="text-center">1</td><td className="text-right">R$ 12,00</td></tr>
                  </tbody>
                </table>
                <div className="border-t border-dashed border-gray-400 my-1" />
                {/* Preview Total */}
                <div className="flex justify-between font-bold" style={{ fontSize: `${parseInt(presets[paperWidth as "58" | "80"].fontItems) + 1}px` }}>
                  <span>TOTAL</span>
                  <span>R$ 65,80</span>
                </div>
                <div style={{ fontSize: `${presets[paperWidth as "58" | "80"].fontItems}px` }} className="mt-1"><strong>Pagamento:</strong> PIX</div>
                <div className="border-t border-dashed border-gray-400 my-2" />
                {/* Preview Footer */}
                <div className="text-center" style={{ fontSize: `${presets[paperWidth as "58" | "80"].fontFooter}px` }}>
                  {(receiptFooter || "Obrigado pela preferência!\nPDV Fênix • Sistema de Gestão").split("\n").map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </>
            )}
            </div>
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

      {/* Profile Editing Section */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-5 max-w-md">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Meu Perfil</h3>
          <p className="text-xs text-muted-foreground">Edite seus dados de acesso</p>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Nome</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Seu nome"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="seu@email.com"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {savingProfile ? "Salvando..." : "Salvar perfil"}
        </button>
      </div>

      {/* Password Change Section */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-5 max-w-md">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Alterar Senha</h3>
          <p className="text-xs text-muted-foreground">Defina uma nova senha de acesso</p>
        </div>

        {/* New Password */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Nova senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={showNewPw ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 pr-10 bg-background border-border"
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Confirmar nova senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={savingPassword || !newPassword}
          className="w-full py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Lock className="w-4 h-4" />
          {savingPassword ? "Alterando..." : "Alterar senha"}
        </button>
      </div>
    </div>
  );
}
