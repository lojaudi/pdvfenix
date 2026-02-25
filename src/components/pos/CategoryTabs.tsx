import { DbCategory } from "@/hooks/useProducts";

interface CategoryTabsProps {
  categories: DbCategory[];
  selected: string;
  onSelect: (id: string) => void;
}

export function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  return (
    <nav aria-label="Categorias de produtos">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin" role="tablist">
        <button
          onClick={() => onSelect("all")}
          role="tab"
          aria-selected={selected === "all"}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring ${
            selected === "all"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          <span aria-hidden="true">🏪</span> Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            role="tab"
            aria-selected={selected === cat.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring ${
              selected === cat.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <span aria-hidden="true">{cat.icon}</span> {cat.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
