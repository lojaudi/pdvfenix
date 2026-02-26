import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, Trash2, Save, Palette, Image, Globe } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function hslToHex(hsl: string): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return "#ff9900";
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const COLOR_PRESETS = [
  { label: "Âmbar (Padrão)", primary: "36 95% 55%", background: "220 20% 10%", card: "220 18% 14%", accent: "36 80% 45%", secondary: "220 16% 20%" },
  { label: "Azul Royal", primary: "220 80% 55%", background: "220 20% 8%", card: "220 18% 12%", accent: "220 70% 45%", secondary: "220 16% 18%" },
  { label: "Esmeralda", primary: "160 70% 45%", background: "160 20% 8%", card: "160 18% 12%", accent: "160 60% 35%", secondary: "160 16% 18%" },
  { label: "Vermelho", primary: "0 75% 55%", background: "0 10% 10%", card: "0 8% 14%", accent: "0 65% 45%", secondary: "0 10% 20%" },
  { label: "Roxo", primary: "270 70% 55%", background: "270 15% 10%", card: "270 12% 14%", accent: "270 60% 45%", secondary: "270 12% 20%" },
  { label: "Rosa", primary: "330 70% 55%", background: "330 12% 10%", card: "330 10% 14%", accent: "330 60% 45%", secondary: "330 10% 20%" },
];

export function AdminVisualSettings() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgImageUrl, setBgImageUrl] = useState("");
  const [bgOpacity, setBgOpacity] = useState(15);
  const [colorPrimary, setColorPrimary] = useState("");
  const [colorBackground, setColorBackground] = useState("");
  const [colorCard, setColorCard] = useState("");
  const [colorAccent, setColorAccent] = useState("");
  const [colorSecondary, setColorSecondary] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyToMenu, setApplyToMenu] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["visual-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["bg_image_url", "bg_image_opacity", "color_primary", "color_background", "color_card", "color_accent", "color_secondary", "theme_apply_to_menu"]);
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  useEffect(() => {
    if (settings) {
      setBgImageUrl(settings.bg_image_url || "");
      setBgOpacity(Math.round(parseFloat(settings.bg_image_opacity || "0.15") * 100));
      setColorPrimary(settings.color_primary || "");
      setColorBackground(settings.color_background || "");
      setColorCard(settings.color_card || "");
      setColorAccent(settings.color_accent || "");
      setColorSecondary(settings.color_secondary || "");
      setApplyToMenu(settings.theme_apply_to_menu === "true");
    }
  }, [settings]);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `background.${ext}`;
      await supabase.storage.from("restaurant-assets").remove([path]);
      const { error } = await supabase.storage.from("restaurant-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const url = `${SUPABASE_URL}/storage/v1/object/public/restaurant-assets/${path}?t=${Date.now()}`;
      setBgImageUrl(url);
      await supabase.from("app_settings").upsert({ key: "bg_image_url", value: url, updated_at: new Date().toISOString() }, { onConflict: "key" });
      queryClient.invalidateQueries({ queryKey: ["theme-settings"] });
      toast.success("Imagem de fundo enviada!");
    } catch {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveBg = async () => {
    try {
      await supabase.storage.from("restaurant-assets").remove(["background.png", "background.jpg", "background.jpeg", "background.webp"]);
      await supabase.from("app_settings").upsert({ key: "bg_image_url", value: "", updated_at: new Date().toISOString() }, { onConflict: "key" });
      setBgImageUrl("");
      queryClient.invalidateQueries({ queryKey: ["theme-settings"] });
      toast.success("Imagem de fundo removida!");
    } catch {
      toast.error("Erro ao remover imagem");
    }
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setColorPrimary(preset.primary);
    setColorBackground(preset.background);
    setColorCard(preset.card);
    setColorAccent(preset.accent);
    setColorSecondary(preset.secondary);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entries = [
        { key: "bg_image_opacity", value: (bgOpacity / 100).toString(), updated_at: now },
        { key: "color_primary", value: colorPrimary, updated_at: now },
        { key: "color_background", value: colorBackground, updated_at: now },
        { key: "color_card", value: colorCard, updated_at: now },
        { key: "color_accent", value: colorAccent, updated_at: now },
        { key: "color_secondary", value: colorSecondary, updated_at: now },
        { key: "theme_apply_to_menu", value: applyToMenu ? "true" : "false", updated_at: now },
      ];
      const { error } = await supabase.from("app_settings").upsert(entries, { onConflict: "key" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["theme-settings"] });
      queryClient.invalidateQueries({ queryKey: ["visual-settings"] });
      toast.success("Configurações visuais salvas!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const resetColors = async () => {
    const now = new Date().toISOString();
    const entries = [
      { key: "color_primary", value: "", updated_at: now },
      { key: "color_background", value: "", updated_at: now },
      { key: "color_card", value: "", updated_at: now },
      { key: "color_accent", value: "", updated_at: now },
      { key: "color_secondary", value: "", updated_at: now },
    ];
    await supabase.from("app_settings").upsert(entries, { onConflict: "key" });
    setColorPrimary("");
    setColorBackground("");
    setColorCard("");
    setColorAccent("");
    setColorSecondary("");
    queryClient.invalidateQueries({ queryKey: ["theme-settings"] });
    queryClient.invalidateQueries({ queryKey: ["visual-settings"] });
    toast.success("Cores restauradas ao padrão!");
  };

  // Helper to render HSL as a visible color swatch
  const hslSwatch = (hsl: string) => {
    if (!hsl) return null;
    return (
      <div className="w-6 h-6 rounded-md border border-border shrink-0" style={{ backgroundColor: `hsl(${hsl})` }} />
    );
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-foreground mb-1">Personalização Visual</h2>
        <p className="text-xs text-muted-foreground">Imagem de fundo e cores do sistema</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-6 max-w-md">
        {/* Background Image */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Image className="w-4 h-4" /> Imagem de fundo
          </label>
          <div className="flex items-center gap-3">
            {bgImageUrl ? (
              <img src={bgImageUrl} alt="Fundo" className="w-20 h-14 rounded-lg object-cover border border-border" />
            ) : (
              <div className="w-20 h-14 rounded-lg bg-secondary flex items-center justify-center">
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploading ? "Enviando..." : "Enviar imagem"}
              </button>
              {bgImageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveBg}
                  className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          </div>

          {/* Opacity slider */}
          {bgImageUrl && (
            <div className="mt-3 space-y-1.5">
              <label className="text-xs text-muted-foreground">Transparência: {bgOpacity}%</label>
              <Slider
                value={[bgOpacity]}
                onValueChange={(v) => setBgOpacity(v[0])}
                min={5}
                max={80}
                step={5}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Color Presets */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Palette className="w-4 h-4" /> Tema de cores
          </label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-xs font-medium text-foreground transition-colors border border-border"
              >
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: `hsl(${preset.primary})` }} />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Individual color inputs */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Cores individuais</p>
          {[
            { label: "Primária", value: colorPrimary, set: setColorPrimary, placeholder: "36 95% 55%" },
            { label: "Fundo", value: colorBackground, set: setColorBackground, placeholder: "220 20% 10%" },
            { label: "Card", value: colorCard, set: setColorCard, placeholder: "220 18% 14%" },
            { label: "Destaque", value: colorAccent, set: setColorAccent, placeholder: "36 80% 45%" },
            { label: "Secundária", value: colorSecondary, set: setColorSecondary, placeholder: "220 16% 20%" },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={hslToHex(c.value || c.placeholder)}
                  onChange={(e) => c.set(hexToHsl(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="w-9 h-9 rounded-lg border-2 border-border cursor-pointer shadow-sm hover:scale-105 transition-transform"
                  style={{ backgroundColor: `hsl(${c.value || c.placeholder})` }}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-foreground">{c.label}</label>
                <p className="text-[10px] text-muted-foreground">{c.value || c.placeholder}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Apply to public menu toggle */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold text-foreground">Aplicar tema ao cardápio público</p>
                <p className="text-[10px] text-muted-foreground">Cores e fundo também aparecem em /menu</p>
              </div>
            </div>
            <Switch checked={applyToMenu} onCheckedChange={setApplyToMenu} />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar visual"}
          </button>
          <button
            onClick={resetColors}
            className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors"
          >
            Resetar
          </button>
        </div>
      </div>
    </div>
  );
}
