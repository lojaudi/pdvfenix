import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const NEON_COLORS: Record<string, { text: string; glow: string; bg: string }> = {
  red: { text: "#ff1a1a", glow: "#ff1a1a", bg: "rgba(255,26,26,0.05)" },
  blue: { text: "#1a8cff", glow: "#1a8cff", bg: "rgba(26,140,255,0.05)" },
  green: { text: "#39ff14", glow: "#39ff14", bg: "rgba(57,255,20,0.05)" },
  pink: { text: "#ff69b4", glow: "#ff69b4", bg: "rgba(255,105,180,0.05)" },
  yellow: { text: "#ffff00", glow: "#ffff00", bg: "rgba(255,255,0,0.05)" },
  cyan: { text: "#00ffff", glow: "#00ffff", bg: "rgba(0,255,255,0.05)" },
  orange: { text: "#ff6600", glow: "#ff6600", bg: "rgba(255,102,0,0.05)" },
  purple: { text: "#bf00ff", glow: "#bf00ff", bg: "rgba(191,0,255,0.05)" },
  white: { text: "#ffffff", glow: "#ffffff", bg: "rgba(255,255,255,0.05)" },
};

export function NeonBoard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const { data: neonSettings } = useQuery({
    queryKey: ["neon-board-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["neon_messages", "neon_color", "neon_enabled"]);
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  const enabled = neonSettings?.neon_enabled !== "false";
  const color = neonSettings?.neon_color || "cyan";
  const messages: string[] = useMemo(() => {
    try {
      const parsed = JSON.parse(neonSettings?.neon_messages || "[]");
      return Array.isArray(parsed) ? parsed.filter((m: string) => m.trim()) : [];
    } catch {
      return [];
    }
  }, [neonSettings?.neon_messages]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 500);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);

  if (!enabled || messages.length === 0) return null;

  const scheme = NEON_COLORS[color] || NEON_COLORS.cyan;
  const currentMessage = messages[currentIndex] || "";

  return (
    <div
      className="relative overflow-hidden rounded-xl border px-4 py-3"
      style={{
        background: `linear-gradient(135deg, ${scheme.bg}, rgba(0,0,0,0.85))`,
        borderColor: `${scheme.glow}40`,
        boxShadow: `0 0 15px ${scheme.glow}20, inset 0 0 15px ${scheme.glow}08`,
      }}
    >
      {/* Flicker overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${scheme.glow} 2px, ${scheme.glow} 4px)`,
        }}
      />

      <div
        className="text-center text-sm sm:text-base font-bold tracking-wide transition-all duration-500"
        style={{
          color: scheme.text,
          textShadow: `0 0 7px ${scheme.glow}, 0 0 20px ${scheme.glow}80, 0 0 40px ${scheme.glow}40`,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(-8px)",
        }}
      >
        {currentMessage}
      </div>

      {messages.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {messages.map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{
                background: i === currentIndex ? scheme.text : `${scheme.text}30`,
                boxShadow: i === currentIndex ? `0 0 4px ${scheme.glow}` : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
