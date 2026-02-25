import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";

interface TableSelectorProps {
  onSelect: (tableNumber: number) => void;
  selectedTable: number | null;
  currentUserId?: string;
}

const QUERY_KEY = ["tables-selector"];

export function TableSelector({ onSelect, selectedTable, currentUserId }: TableSelectorProps) {
  useRealtimeTables(QUERY_KEY);

  const { data: tables } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("number, status, waiter_id")
        .order("number", { ascending: true });
      if (error) throw error;
      return data as { number: number; status: string; waiter_id: string | null }[];
    },
  });

  const tableList = tables || [];

  return (
    <div className="mb-4" role="region" aria-label="Seleção de mesa">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Selecione a Mesa</h3>
        <div className="flex gap-3 text-xs text-muted-foreground" aria-label="Legenda de cores">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-secondary border border-border" aria-hidden="true" /> Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-yellow-500/20 border border-yellow-500/30" aria-hidden="true" /> Minha mesa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-primary/15 border border-primary/30" aria-hidden="true" /> Outro garçom
          </span>
        </div>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2" role="radiogroup" aria-label="Mesas disponíveis">
        {tableList.map((table) => {
          const isOccupied = table.status !== "livre";
          const isMyTable = isOccupied && table.waiter_id === currentUserId;
          const isBlocked = isOccupied && !isMyTable;
          const isSelected = selectedTable === table.number;
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
