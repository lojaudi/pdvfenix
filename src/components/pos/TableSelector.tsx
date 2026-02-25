import { useState } from "react";

interface TableSelectorProps {
  onSelect: (tableNumber: number) => void;
  selectedTable: number | null;
}

export function TableSelector({ onSelect, selectedTable }: TableSelectorProps) {
  const tables = Array.from({ length: 15 }, (_, i) => i + 1);

  // Mock status
  const occupiedTables = [2, 5, 7, 11, 13];

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
        {tables.map((num) => {
          const isOccupied = occupiedTables.includes(num);
          const isSelected = selectedTable === num;
          return (
            <button
              key={num}
              onClick={() => onSelect(num)}
              className={`w-12 h-12 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                  : isOccupied
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border"
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
