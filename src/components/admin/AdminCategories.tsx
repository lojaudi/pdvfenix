import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, DbCategory } from "@/hooks/useProducts";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, X, GripVertical } from "lucide-react";

type CatForm = { name: string; icon: string; sort_order: string };
const emptyForm: CatForm = { name: "", icon: "📦", sort_order: "0" };

export function AdminCategories() {
  const { categories, refetch } = useProducts();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CatForm>(emptyForm);

  const startEdit = (c: DbCategory) => {
    setEditing(c.id);
    setCreating(false);
    setForm({ name: c.name, icon: c.icon, sort_order: String(c.sort_order) });
  };

  const startCreate = () => { setCreating(true); setEditing(null); setForm(emptyForm); };
  const cancel = () => { setEditing(null); setCreating(false); setForm(emptyForm); };

  const handleSave = async () => {
    if (!form.name) { toast.error("Preencha o nome"); return; }
    const payload = { name: form.name, icon: form.icon, sort_order: parseInt(form.sort_order) || 0 };

    if (creating) {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Categoria criada!");
    } else if (editing) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Categoria atualizada!");
    }
    cancel();
    refetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Categoria removida!");
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Categorias ({categories.length})</h2>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {creating && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3 animate-slide-in">
          <h3 className="font-semibold text-card-foreground">Nova Categoria</h3>
          <CatFormFields form={form} setForm={setForm} />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-semibold"><Save className="w-4 h-4" /> Salvar</button>
            <button onClick={cancel} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-xl p-4">
            {editing === c.id ? (
              <div className="space-y-3">
                <CatFormFields form={form} setForm={setForm} />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success text-success-foreground text-xs font-semibold"><Save className="w-3 h-3" /> Salvar</button>
                  <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold"><X className="w-3 h-3" /> Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <span className="font-medium text-card-foreground">{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">Ordem: {c.sort_order}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(c)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CatFormFields({ form, setForm }: { form: CatForm; setForm: (f: CatForm) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="col-span-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <input placeholder="Ícone (emoji)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <input type="number" placeholder="Ordem" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
    </div>
  );
}
