import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function playKitchenAlert() {
  try {
    const ctx = new AudioContext();
    const resumeAndPlay = () => {
      const now = ctx.currentTime;
      const playBeep = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      };
      // Urgent double-ding pattern
      playBeep(1000, now, 0.12);
      playBeep(1400, now + 0.15, 0.12);
      playBeep(1000, now + 0.4, 0.12);
      playBeep(1400, now + 0.55, 0.12);
      playBeep(1600, now + 0.7, 0.25);
      setTimeout(() => ctx.close(), 1500);
    };
    if (ctx.state === "suspended") {
      ctx.resume().then(resumeAndPlay).catch(() => {});
    } else {
      resumeAndPlay();
    }
  } catch {}
}

export function useKitchenRealtime(queryKey: string[]) {
  const queryClient = useQueryClient();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      isFirstLoad.current = false;
    }, 3000);

    const channel = supabase
      .channel("kitchen-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey });

          if (!isFirstLoad.current) {
            const newOrder = payload.new as any;
            const oldOrder = payload.old as any;

            // Alert when an order transitions TO "preparando"
            if (newOrder.status === "preparando" && oldOrder.status !== "preparando") {
              playKitchenAlert();
              const tableInfo = newOrder.table_number ? ` • Mesa ${newOrder.table_number}` : "";
              toast.info(`🔥 Novo pedido em preparo!${tableInfo}`, { duration: 6000 });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey });

          if (!isFirstLoad.current) {
            const order = payload.new as any;
            // New orders with status "preparando" directly
            if (order.status === "preparando") {
              playKitchenAlert();
              const tableInfo = order.table_number ? ` • Mesa ${order.table_number}` : "";
              toast.info(`🔥 Novo pedido em preparo!${tableInfo}`, { duration: 6000 });
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [queryClient, queryKey]);
}
