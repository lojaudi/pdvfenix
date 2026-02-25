import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, DbCategory } from "@/hooks/useProducts";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type ProductForm = {
  name: string;
  price: string;
  stock_qty: string;
  category_id: string;
  in_stock: boolean;
};

const emptyForm: ProductForm = { name: "", price: "", stock_qty: "", category_id: "", in_stock: true };

export function AdminProducts() {
  const { products, categories, refetch } = useProducts();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const startEdit = (p: any) => {
    setEditing(p.id);
    setCreating(false);
    setForm({
      name: p.name,
      price: String(p.price),
      stock_qty: String(p.stock_qty),
      category_id: p.category_id || "",
      in_stock: p.in_stock,
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm);
  };

  const cancel = () => { setEditing(null); setCreating(false); setForm(emptyForm); };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error("Preencha nome e preço"); return; }
    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      stock_qty: parseInt(form.stock_qty) || 0,
      category_id: form.category_id || null,
      in_stock: form.in_stock,
    };

    if (creating) {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Produto criado!");
    } else if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Produto atualizado!");
    }
    cancel();
    refetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Produto removido!");
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Produtos ({products.length})</h2>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      {creating && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3 animate-slide-in">
          <h3 className="font-semibold text-card-foreground">Novo Produto</h3>
          <ProductFormFields form={form} setForm={setForm} categories={categories} />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-semibold"><Save className="w-4 h-4" /> Salvar</button>
            <button onClick={cancel} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-4">
            {editing === p.id ? (
              <div className="space-y-3">
                <ProductFormFields form={form} setForm={setForm} categories={categories} />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success text-success-foreground text-xs font-semibold"><Save className="w-3 h-3" /> Salvar</button>
                  <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold"><X className="w-3 h-3" /> Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-card-foreground">{p.name}</span>
                    {!p.in_stock && <span className="text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded-md">Sem estoque</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="text-primary font-bold">{formatCurrency(p.price)}</span>
                    <span>Estoque: {p.stock_qty}</span>
                    <span>{categories.find(c => c.id === p.category_id)?.name || "Sem categoria"}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(p)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductFormFields({ form, setForm, categories }: { form: ProductForm; setForm: (f: ProductForm) => void; categories: DbCategory[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <input placeholder="Nome do produto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="col-span-2 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <input type="number" step="0.01" placeholder="Preço" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <input type="number" placeholder="Estoque" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
        <option value="">Sem categoria</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })} className="rounded" />
        Em estoque
      </label>
    </div>
  );
}
