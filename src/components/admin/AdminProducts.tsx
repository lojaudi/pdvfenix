import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, DbCategory } from "@/hooks/useProducts";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, X, LayoutGrid, List, Search, ImageIcon, Loader2, FileDown } from "lucide-react";
import { format } from "date-fns";

type ViewMode = "list" | "grid";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export type VariationForm = {
  id?: string;
  name: string;
  price: string;
};

type ProductForm = {
  name: string;
  price: string;
  stock_qty: string;
  category_id: string;
  in_stock: boolean;
  image_url: string;
  variations: VariationForm[];
};

const emptyForm: ProductForm = { name: "", price: "", stock_qty: "", category_id: "", in_stock: true, image_url: "", variations: [] };

type ImageResult = {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
};

export function AdminProducts() {
  const { products, categories, refetch } = useProducts();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("admin-products-view") as ViewMode) || "list";
  });

  const toggleView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("admin-products-view", mode);
  };

  const startEdit = async (p: any) => {
    setEditing(p.id);
    setCreating(false);
    // Load existing variations
    const { data: vars } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", p.id)
      .order("created_at");
    const variations: VariationForm[] = (vars || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      price: String(v.price),
    }));
    setForm({
      name: p.name,
      price: String(p.price),
      stock_qty: String(p.stock_qty),
      category_id: p.category_id || "",
      in_stock: p.in_stock,
      image_url: p.image_url || "",
      variations,
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm);
  };

  const cancel = () => { setEditing(null); setCreating(false); setForm(emptyForm); };

  const handleSave = async () => {
    const hasVariations = form.variations.filter(v => v.name.trim()).length > 0;
    if (!form.name) { toast.error("Preencha o nome do produto"); return; }
    if (!hasVariations && !form.price) { toast.error("Preencha o preço ou adicione variações"); return; }
    const payload = {
      name: form.name,
      price: hasVariations && !form.price ? 0 : parseFloat(form.price),
      stock_qty: parseInt(form.stock_qty) || 0,
      category_id: form.category_id || null,
      in_stock: form.in_stock,
      image_url: form.image_url || null,
    };

    let productId: string | null = null;

    if (creating) {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      productId = data.id;
      toast.success("Produto criado!");
    } else if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      productId = editing;
      toast.success("Produto atualizado!");
    }

    // Save variations
    if (productId) {
      // Delete existing variations
      await supabase.from("product_variations").delete().eq("product_id", productId);
      // Insert current variations
      const newVars = form.variations
        .filter((v) => v.name.trim())
        .map((v) => ({
          product_id: productId!,
          name: v.name.trim(),
          price: parseFloat(v.price) || 0,
        }));
      if (newVars.length > 0) {
        const { error: varError } = await supabase.from("product_variations").insert(newVars);
        if (varError) toast.error("Erro ao salvar variações: " + varError.message);
      }
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

  const productsRef = useRef<HTMLDivElement>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportProductsPDF = async () => {
    setExportingPDF(true);
    toast.info("Gerando relatório de produtos...");
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const pdf = new jsPDF("p", "mm", "a4");

      pdf.setFontSize(16);
      pdf.text("Relatório de Produtos", 14, 20);
      pdf.setFontSize(10);
      pdf.text(`Data: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
      pdf.text(`Total de produtos: ${products.length}`, 14, 34);

      const tableData = products.map((p) => [
        p.name,
        p.stock_qty,
        formatCurrency(p.price),
        categories.find((c) => c.id === p.category_id)?.name || "Sem categoria",
        p.in_stock ? "Sim" : "Não",
      ]);

      autoTable(pdf, {
        startY: 40,
        head: [["Produto", "Qtd. Disponível", "Valor", "Categoria", "Em Estoque"]],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [36, 36, 36], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          1: { halign: "center" },
          2: { halign: "right" },
          3: { halign: "center" },
          4: { halign: "center" },
        },
      });

      pdf.save(`produtos_${format(new Date(), "dd-MM-yy")}.pdf`);
      toast.success("Relatório de produtos exportado!");
    } catch {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="space-y-4" ref={productsRef}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Produtos ({products.length})</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportProductsPDF}
            disabled={exportingPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50"
          >
            {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Exportar PDF
          </button>
          <div className="flex items-center bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => toggleView("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Visualização em lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleView("grid")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Visualização em grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
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

      <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" : "space-y-2"}>
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
            ) : viewMode === "grid" ? (
              <div className="flex flex-col h-full">
                {(p as any).image_url && (
                  <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-secondary">
                    <img src={(p as any).image_url} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-card-foreground text-sm leading-tight">{p.name}</span>
                  {!p.in_stock && <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-md shrink-0 ml-1">Sem estoque</span>}
                </div>
                <span className="text-primary font-bold text-sm">{formatCurrency(p.price)}</span>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>Est: {p.stock_qty}</span>
                  <span>•</span>
                  <span className="truncate">{categories.find(c => c.id === p.category_id)?.name || "—"}</span>
                </div>
                <div className="flex gap-1 mt-auto pt-2 border-t border-border">
                  <button onClick={() => startEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {(p as any).image_url ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">
                    <img src={(p as any).image_url} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
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
  const [imageResults, setImageResults] = useState<ImageResult[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchImages = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setImageResults([]);
      setShowImagePicker(false);
      return;
    }
    setSearchingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-product-images", {
        body: { query },
      });
      if (!error && data?.images?.length > 0) {
        setImageResults(data.images);
        setShowImagePicker(true);
      } else {
        setImageResults([]);
      }
    } catch {
      setImageResults([]);
    } finally {
      setSearchingImages(false);
    }
  }, []);

  const handleNameChange = (name: string) => {
    setForm({ ...form, name });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchImages(name), 800);
  };

  const selectImage = (url: string) => {
    setForm({ ...form, image_url: url });
    setShowImagePicker(false);
  };

  const removeImage = () => {
    setForm({ ...form, image_url: "" });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 relative">
          <input
            placeholder="Nome do produto"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchingImages && (
            <div className="absolute right-3 top-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <input type="number" step="0.01" placeholder={form.variations.filter(v => v.name.trim()).length > 0 ? "Preço base (opcional)" : "Preço"} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
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

      {/* Image URL manual input */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            placeholder="URL da imagem (opcional)"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className="w-full px-3 py-2 pl-8 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <ImageIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        </div>
        {form.image_url && (
          <button onClick={removeImage} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
        {!showImagePicker && form.name.length >= 3 && (
          <button
            onClick={() => searchImages(form.name)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm hover:bg-accent transition-colors"
          >
            <Search className="w-4 h-4" /> Buscar
          </button>
        )}
      </div>

      {/* Image preview */}
      {form.image_url && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 border border-border">
          <img src={form.image_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
          <span className="text-xs text-muted-foreground truncate flex-1">{form.image_url}</span>
        </div>
      )}

      {/* Image search results */}
      {showImagePicker && imageResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Imagens encontradas — clique para selecionar
            </span>
            <button onClick={() => setShowImagePicker(false)} className="text-xs text-muted-foreground hover:text-foreground">
              Fechar
            </button>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
            {imageResults.map((img, i) => (
              <button
                key={i}
                onClick={() => selectImage(img.url)}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${form.image_url === img.url ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
              >
                <img
                  src={img.thumbnail}
                  alt={img.title}
                  className="w-full h-16 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Variações */}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Variações</span>
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                variations: [...form.variations, { name: "", price: "" }],
              })
            }
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-accent transition-colors"
          >
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>
        {form.variations.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma variação adicionada.</p>
        )}
        {form.variations.map((v, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              placeholder="Nome da variação (ex: Grande, Pequeno)"
              value={v.name}
              onChange={(e) => {
                const updated = [...form.variations];
                updated[idx] = { ...updated[idx], name: e.target.value };
                setForm({ ...form, variations: updated });
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço"
              value={v.price}
              onChange={(e) => {
                const updated = [...form.variations];
                updated[idx] = { ...updated[idx], price: e.target.value };
                setForm({ ...form, variations: updated });
              }}
              className="w-28 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={() => {
                const updated = form.variations.filter((_, i) => i !== idx);
                setForm({ ...form, variations: updated });
              }}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
