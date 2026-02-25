import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Pre-unlock audio on first user interaction
let audioUnlocked = false;
const silentAudio = typeof Audio !== "undefined" ? new Audio() : null;

function unlockAudio() {
  if (audioUnlocked || !silentAudio) return;
  silentAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
  silentAudio.volume = 0;
  silentAudio.play().then(() => {
    audioUnlocked = true;
  }).catch(() => {});
}

if (typeof document !== "undefined") {
  document.addEventListener("click", unlockAudio, { once: false });
  document.addEventListener("touchstart", unlockAudio, { once: false });
  document.addEventListener("keydown", unlockAudio, { once: false });
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    // Force resume in case it's suspended
    const resumeAndPlay = () => {
      const now = ctx.currentTime;

      const playBeep = (freq: number, start: number, end: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, end);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(end);
      };

      playBeep(880, now, now + 0.15);
      playBeep(1100, now + 0.18, now + 0.35);
      playBeep(1320, now + 0.38, now + 0.6);

      setTimeout(() => ctx.close(), 1000);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(resumeAndPlay).catch(() => {});
    } else {
      resumeAndPlay();
    }
  } catch {
    // AudioContext not available
  }
}

const channelLabels: Record<string, string> = {
  balcao: "Balcão",
  garcom: "Garçom",
  delivery: "Delivery",
};

export function useRealtimeOrdersWithSound(queryKey: string[] = ["active-orders"]) {
  const queryClient = useQueryClient();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      isFirstLoad.current = false;
    }, 3000);

    const channel = supabase
      .channel("orders-realtime-sound")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey });

          if (!isFirstLoad.current) {
            const order = payload.new as any;
            const ch = channelLabels[order.channel] || order.channel;
            const tableInfo = order.table_number ? ` • Mesa ${order.table_number}` : "";

            playNotificationSound();

            toast.info(`🔔 Novo pedido! ${ch}${tableInfo}`, {
              duration: 5000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [queryClient, queryKey]);
}