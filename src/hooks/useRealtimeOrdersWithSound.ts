import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let audioCtxReady = false;

function ensureAudioContext() {
  if (audioCtxReady) return;
  const resume = () => {
    audioCtxReady = true;
    document.removeEventListener("click", resume);
    document.removeEventListener("keydown", resume);
  };
  document.addEventListener("click", resume, { once: true });
  document.addEventListener("keydown", resume, { once: true });
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // First beep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.value = 880;
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second beep (higher)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 1100;
    gain2.gain.setValueAtTime(0.3, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.35);

    // Third beep (highest)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.value = 1320;
    gain3.gain.setValueAtTime(0.3, now + 0.38);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc3.connect(gain3).connect(ctx.destination);
    osc3.start(now + 0.38);
    osc3.stop(now + 0.6);

    setTimeout(() => ctx.close(), 1000);
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
    ensureAudioContext();
  }, []);

  useEffect(() => {
    // Mark first load complete after a short delay
    const timer = setTimeout(() => {
      isFirstLoad.current = false;
    }, 2000);

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
