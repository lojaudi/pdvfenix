import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { Users } from "lucide-react";

interface TableSelectorProps {
  onSelect: (tableNumber: number) => void;
  selectedTable: number | null;
  currentUserId?: string;
  /** When true, renders larger cards optimized for full-screen waiter view */
  fullScreen?: boolean;
}

const QUERY_KEY = ["tables-selector"];

const statusLabel: Record<string, string> = {
  livre: "Livre",
  ocupada: "Ocupada",
  aguardando_pagamento: "Conta pedida",
};

export function TableSelector({ onSelect, selectedTable, currentUserId, fullScreen = false }: TableSelectorProps) {
  useRealtimeTables(QUERY_KEY);

  const { data: tables } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("number, status, waiter_id, capacity")
        .order("number", { ascending: true });
      if (error) throw error;
      return data as { number: number; status: string; waiter_id: string | null; capacity: number }[];
    },
  });

  const tableList = tables || [];

  // Grid classes based on mode
  const gridClass = fullScreen
    ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4"
    : "grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2";

  return (
    <div className={fullScreen ? "w-full" : "mb-4"} role="region" aria-label="Seleção de mesa">
      {/* Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        {!fullScreen && <h3 className="text-sm font-semibold text-muted-foreground">Selecione a Mesa</h3>}
        <div className="flex gap-3 text-xs text-muted-foreground" aria-label="Legenda de cores">
          <span className="flex items-center gap-1.5">
            <span className={`${fullScreen ? "w-3 h-3" : "w-2.5 h-2.5"} rounded bg-secondary border border-border`} aria-hidden="true" /> Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`${fullScreen ? "w-3 h-3" : "w-2.5 h-2.5"} rounded bg-yellow-500/20 border border-yellow-500/30`} aria-hidden="true" /> Minha mesa
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`${fullScreen ? "w-3 h-3" : "w-2.5 h-2.5"} rounded bg-primary/15 border border-primary/30`} aria-hidden="true" /> Outro garçom
          </span>
        </div>
      </div>

      <div className={gridClass} role="radiogroup" aria-label="Mesas disponíveis">
        {tableList.map((table) => {
          const isOccupied = table.status !== "livre";
          const isMyTable = isOccupied && table.waiter_id === currentUserId;
          const isBlocked = isOccupied && !isMyTable;
          const isSelected = selectedTable === table.number;

          if (fullScreen) {
            return (
              <button
                key={table.number}
                onClick={() => !isBlocked && onSelect(table.number)}
                disabled={isBlocked}
                role="radio"
                aria-checked={isSelected}
                aria-label={`Mesa ${table.number}${isBlocked ? " (ocupada por outro garçom)" : isMyTable ? " (sua mesa)" : " (livre)"}`}
                className={`relative w-full rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all min-h-[110px] sm:min-h-[130px] focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30 scale-[1.03] ring-2 ring-primary"
                    : isMyTable
                    ? "bg-yellow-500/15 text-yellow-500 border-2 border-yellow-500/40 hover:bg-yellow-500/25 hover:scale-[1.02]"
                    : isBlocked
                    ? "bg-primary/10 text-primary/50 border-2 border-primary/20 opacity-60 cursor-not-allowed"
                    : "bg-secondary text-muted-foreground border-2 border-border hover:bg-secondary/80 hover:border-primary/30 hover:scale-[1.02]"
                }`}
              >
                {/* Table number - large */}
                <span className="text-3xl sm:text-4xl font-extrabold leading-none">
                  {table.number}
                </span>

                {/* Status label */}
                <span className={`text-[11px] sm:text-xs font-semibold rounded-full px-2 py-0.5 ${
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : isMyTable
                    ? "bg-yellow-500/20 text-yellow-600"
                    : isBlocked
                    ? "bg-primary/10 text-primary/50"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isMyTable ? "Minha mesa" : statusLabel[table.status] || table.status}
                </span>

                {/* Capacity indicator */}
                {table.capacity > 0 && (
                  <span className={`flex items-center gap-1 text-[10px] ${
                    isSelected ? "text-primary-foreground/70" : "text-muted-foreground/70"
                  }`}>
                    <Users className="w-3 h-3" aria-hidden="true" />
                    {table.capacity}
                  </span>
                )}
              </button>
            );
          }

          // Compact mode (inline in POS)
          return (
            <button
              key={table.number}
              onClick={() => !isBlocked && onSelect(table.number)}
              disabled={isBlocked}
              role="radio"
              aria-checked={isSelected}
              aria-label={`Mesa ${table.number}${isBlocked ? " (ocupada por outro garçom)" : isMyTable ? " (sua mesa)" : " (livre)"}`}
              className={`w-full aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                  : isMyTable
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                  : isBlocked
                  ? "bg-primary/15 text-primary border border-primary/30 opacity-60 cursor-not-allowed"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border"
              }`}
            >
              {table.number}
            </button>
          );
        })}
      </div>
    </div>
  );
}
