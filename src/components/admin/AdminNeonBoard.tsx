import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Plus, Trash2, Zap, Eye, EyeOff } from "lucide-react";

const NEON_COLORS = [
  { id: "cyan", label: "Ciano", hex: "#00ffff" },
  { id: "red", label: "Vermelho", hex: "#ff1a1a" },
  { id: "blue", label: "Azul", hex: "#1a8cff" },
  { id: "green", label: "Verde", hex: "#39ff14" },
  { id: "pink", label: "Rosa", hex: "#ff69b4" },
  { id: "yellow", label: "Amarelo", hex: "#ffff00" },
  { id: "orange", label: "Laranja", hex: "#ff6600" },
  { id: "purple", label: "Roxo", hex: "#bf00ff" },
  { id: "white", label: "Branco", hex: "#ffffff" },
];

const ANIMATIONS = [
  { id: "fade", label: "Fade", icon: "✨", desc: "Transição suave" },
  { id: "typewriter", label: "Digitação", icon: "⌨️", desc: "Efeito máquina de escrever" },
  { id: "blink", label: "Piscar", icon: "💡", desc: "Pisca como neon real" },
  { id: "pulse", label: "Pulsar", icon: "💫", desc: "Pulsa com brilho" },
  { id: "slide", label: "Deslizar", icon: "➡️", desc: "Desliza lateralmente" },
];

export function AdminNeonBoard() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<string[]>([""]);
  const [color, setColor] = useState("cyan");
  const [animation, setAnimation] = useState("fade");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["neon-board-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["neon_messages", "neon_color", "neon_enabled", "neon_animation"]);
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  useEffect(() => {
    if (settings) {
      try {
        const parsed = JSON.parse(settings.neon_messages || "[]");
        setMessages(Array.isArray(parsed) && parsed.length > 0 ? parsed : [""]);
      } catch {
        setMessages([""]);
      }
      setColor(settings.neon_color || "cyan");
      setAnimation(settings.neon_animation || "fade");
      setEnabled(settings.neon_enabled !== "false");
    }
  }, [settings]);

  const addMessage = () => setMessages((prev) => [...prev, ""]);
  const removeMessage = (index: number) => setMessages((prev) => prev.filter((_, i) => i !== index));
  const updateMessage = (index: number, value: string) =>
    setMessages((prev) => prev.map((m, i) => (i === index ? value : m)));

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const filteredMessages = messages.filter((m) => m.trim());
      const entries = [
        { key: "neon_messages", value: JSON.stringify(filteredMessages), updated_at: now },
        { key: "neon_color", value: color, updated_at: now },
        { key: "neon_animation", value: animation, updated_at: now },
        { key: "neon_enabled", value: String(enabled), updated_at: now },
      ];
      const { error } = await supabase.from("app_settings").upsert(entries, { onConflict: "key" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["neon-board-settings"] });
      toast.success("Painel neon salvo!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const selectedScheme = NEON_COLORS.find((c) => c.id === color) || NEON_COLORS[0];
  const previewMessage = messages.find((m) => m.trim()) || "Sua mensagem aqui...";

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5" /> Painel Neon
        </h2>
        <p className="text-xs text-muted-foreground">Letreiro luminoso no cardápio público</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-5 max-w-lg">
        {/* Preview */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-2 block">Pré-visualização</label>
          <div
            className="relative overflow-hidden rounded-xl border px-4 py-3"
            style={{
              background: `linear-gradient(135deg, ${selectedScheme.hex}08, rgba(0,0,0,0.85))`,
              borderColor: `${selectedScheme.hex}40`,
              boxShadow: `0 0 15px ${selectedScheme.hex}20, inset 0 0 15px ${selectedScheme.hex}08`,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${selectedScheme.hex} 2px, ${selectedScheme.hex} 4px)`,
              }}
            />
            <p
              className="text-center text-sm font-bold tracking-wide"
              style={{
                color: selectedScheme.hex,
                textShadow: `0 0 7px ${selectedScheme.hex}, 0 0 20px ${selectedScheme.hex}80, 0 0 40px ${selectedScheme.hex}40`,
                opacity: enabled ? 1 : 0.3,
              }}
            >
              {enabled ? previewMessage : "Painel desativado"}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Ativar painel</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {enabled ? "Ativado" : "Desativado"}
          </button>
        </div>

        {/* Color selector */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-2 block">Cor do neon</label>
          <div className="flex flex-wrap gap-2">
            {NEON_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={`w-9 h-9 rounded-lg border-2 transition-all ${
                  color === c.id ? "scale-110 border-foreground" : "border-transparent"
                }`}
                style={{
                  background: c.hex,
                  boxShadow: color === c.id ? `0 0 10px ${c.hex}80` : "none",
                }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Animation selector */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-2 block">Animação</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ANIMATIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAnimation(a.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all text-xs font-semibold ${
                  animation === a.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-border hover:border-primary/40"
                }`}
              >
                <span className="text-base">{a.icon}</span>
                <div>
                  <div>{a.label}</div>
                  <div className={`text-[10px] font-normal ${animation === a.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-2 block">
            Mensagens ({messages.length})
          </label>
          <div className="space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Mensagem ${i + 1}`}
                  value={msg}
                  onChange={(e) => updateMessage(i, e.target.value)}
                  className="bg-background border-border flex-1"
                />
                {messages.length > 1 && (
                  <button
                    onClick={() => removeMessage(i)}
                    className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addMessage}
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar mensagem
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar painel neon"}
        </button>
      </div>
    </div>
  );
}
