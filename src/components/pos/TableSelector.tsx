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
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Selecione a Mesa</h3>
      <div className="grid grid-cols-5 gap-2">
        {tables.map((num) => {
          const isOccupied = occupiedTables.includes(num);
          const isSelected = selectedTable === num;
          return (
            <button
              key={num}
              onClick={() => onSelect(num)}
              className={`aspect-square rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
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
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-secondary border border-border" /> Livre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary/15 border border-primary/30" /> Ocupada
        </span>
      </div>
    </div>
  );
}
