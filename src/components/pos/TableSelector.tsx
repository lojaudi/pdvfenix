import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";

interface TableSelectorProps {
  onSelect: (tableNumber: number) => void;
  selectedTable: number | null;
}

const QUERY_KEY = ["tables-selector"];

export function TableSelector({ onSelect, selectedTable }: TableSelectorProps) {
  useRealtimeTables(QUERY_KEY);

  const { data: tables } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("number, status")
        .order("number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const tableList = tables || [];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Selecione a Mesa</h3>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-secondary border border-border" /> Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-primary/15 border border-primary/30" /> Ocupada
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tableList.map((table) => {
          const isOccupied = table.status !== "livre";
          const isSelected = selectedTable === table.number;
          return (
            <button
              key={table.number}
              onClick={() => !isOccupied && onSelect(table.number)}
              disabled={isOccupied}
              className={`w-12 h-12 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                  : isOccupied
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