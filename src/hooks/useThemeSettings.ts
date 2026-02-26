import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const THEME_KEYS = [
  "bg_image_url",
  "bg_image_opacity",
  "color_primary",
  "color_background",
  "color_card",
  "color_accent",
  "color_secondary",
];

export function useThemeSettings() {
  const { data: themeSettings } = useQuery({
    queryKey: ["theme-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", THEME_KEYS);
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!themeSettings) return;
    const root = document.documentElement;

    // Apply custom colors (HSL values like "36 95% 55%")
    const colorMap: Record<string, string> = {
      color_primary: "--primary",
      color_background: "--background",
      color_card: "--card",
      color_accent: "--accent",
      color_secondary: "--secondary",
    };

    Object.entries(colorMap).forEach(([key, cssVar]) => {
      const val = themeSettings[key];
      if (val) {
        root.style.setProperty(cssVar, val);
      } else {
        root.style.removeProperty(cssVar);
      }
    });

    // Apply background image
    const bgUrl = themeSettings.bg_image_url;
    const bgOpacity = themeSettings.bg_image_opacity || "0.15";

    let overlay = document.getElementById("theme-bg-overlay");
    if (bgUrl) {
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "theme-bg-overlay";
        overlay.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;";
        document.body.prepend(overlay);
      }
      overlay.style.backgroundImage = `url(${bgUrl})`;
      overlay.style.opacity = bgOpacity;
    } else if (overlay) {
      overlay.remove();
    }

    return () => {
      // Cleanup on unmount
      Object.values(colorMap).forEach((cssVar) => root.style.removeProperty(cssVar));
      document.getElementById("theme-bg-overlay")?.remove();
    };
  }, [themeSettings]);

  return themeSettings;
}
