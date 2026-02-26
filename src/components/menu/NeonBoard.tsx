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

type AnimationType = "fade" | "typewriter" | "blink" | "pulse" | "slide";

function TypewriterText({ text, color, glow }: { text: string; color: string; glow: string }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        setDone(true);
        clearInterval(interval);
      }
    }, 55);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span
      style={{
        color,
        textShadow: `0 0 7px ${glow}, 0 0 20px ${glow}80, 0 0 40px ${glow}40`,
      }}
    >
      {displayed}
      {!done && (
        <span className="animate-pulse" style={{ color }}>▌</span>
      )}
    </span>
  );
}

export function NeonBoard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const { data: neonSettings } = useQuery({
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

  const enabled = neonSettings?.neon_enabled !== "false";
  const color = neonSettings?.neon_color || "cyan";
  const animation: AnimationType = (neonSettings?.neon_animation as AnimationType) || "fade";
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
    const delay = animation === "typewriter" ? 6000 : 4000;
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 500);
    }, delay);
    return () => clearInterval(interval);
  }, [messages.length, animation]);

  if (!enabled || messages.length === 0) return null;

  const scheme = NEON_COLORS[color] || NEON_COLORS.cyan;
  const currentMessage = messages[currentIndex] || "";

  const getAnimationStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      color: scheme.text,
      textShadow: `0 0 7px ${scheme.glow}, 0 0 20px ${scheme.glow}80, 0 0 40px ${scheme.glow}40`,
    };

    switch (animation) {
      case "blink":
        return { ...base, animation: "neon-blink 1.5s ease-in-out infinite" };
      case "pulse":
        return { ...base, animation: "neon-pulse 2s ease-in-out infinite" };
      case "slide":
        return {
          ...base,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateX(0)" : "translateX(40px)",
          transition: "all 0.5s ease-in-out",
        };
      case "typewriter":
        return {}; // handled by TypewriterText component
      case "fade":
      default:
        return {
          ...base,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(-8px)",
          transition: "all 0.5s ease-in-out",
        };
    }
  };

  return (
    <>
      <style>{`
        @keyframes neon-blink {
          0%, 100% { opacity: 1; }
          30% { opacity: 0.4; }
          50% { opacity: 1; }
          70% { opacity: 0.3; }
          90% { opacity: 1; }
        }
        @keyframes neon-pulse {
          0%, 100% { 
            text-shadow: 0 0 7px ${scheme.glow}, 0 0 20px ${scheme.glow}80, 0 0 40px ${scheme.glow}40;
            transform: scale(1);
          }
          50% { 
            text-shadow: 0 0 14px ${scheme.glow}, 0 0 40px ${scheme.glow}cc, 0 0 80px ${scheme.glow}60;
            transform: scale(1.03);
          }
        }
      `}</style>
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
          className="text-center text-sm sm:text-base font-bold tracking-wide"
          style={getAnimationStyle()}
        >
          {animation === "typewriter" ? (
            <TypewriterText
              key={currentIndex}
              text={currentMessage}
              color={scheme.text}
              glow={scheme.glow}
            />
          ) : (
            currentMessage
          )}
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
    </>
  );
}
