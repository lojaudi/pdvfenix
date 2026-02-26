import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, MapPin, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type FeeType = "fixa" | "bairro" | "regiao" | "km";

interface DeliveryZone {
  id: string;
  name: string;
  fee_type: FeeType;
  fee_value: number;
  is_active: boolean;
}

const feeTypeLabels: Record<FeeType, string> = {
  fixa: "Taxa Fixa",
  bairro: "Por Bairro",
  regiao: "Por Região",
  km: "Por Km",
};

const feeTypeBadgeColors: Record<FeeType, string> = {
  fixa: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  bairro: "bg-green-500/10 text-green-400 border-green-500/30",
  regiao: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  km: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

const QUERY_KEY = ["admin-delivery-zones"];

export function AdminDeliveryZones() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data: zones, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  const startNew = () => {
    setEditing({ id: "", name: "", fee_type: "fixa", fee_value: 0, is_active: true });
    setIsNew(true);
  };

  const startEdit = (zone: DeliveryZone) => {
    setEditing({ ...zone });
    setIsNew(false);
  };

  const cancel = () => {
    setEditing(null);
    setIsNew(false);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const payload = {
      name: editing.name.trim(),
      fee_type: editing.fee_type as any,
      fee_value: editing.fee_value,
      is_active: editing.is_active,
    };

    if (isNew) {
      const { error } = await supabase.from("delivery_zones").insert(payload);
      if (error) { toast.error("Erro ao criar zona"); return; }
      toast.success("Zona criada!");
    } else {
      const { error } = await supabase.from("delivery_zones").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar zona"); return; }
      toast.success("Zona atualizada!");
    }

    cancel();
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir zona"); return; }
    toast.success("Zona excluída!");
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const toggleActive = async (zone: DeliveryZone) => {
    const { error } = await supabase
      .from("delivery_zones")
      .update({ is_active: !zone.is_active })
      .eq("id", zone.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Zonas de Entrega</h2>
          <Badge variant="secondary">{zones?.length || 0}</Badge>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nova Zona
        </button>
      </div>

      {/* Form */}
      {editing && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">{isNew ? "Nova Zona" : "Editar Zona"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Nome (ex: Centro, Zona Sul)"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="bg-background border-border"
            />
            <select
              value={editing.fee_type}
              onChange={(e) => setEditing({ ...editing, fee_type: e.target.value as FeeType })}
              className="rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground"
            >
              <option value="fixa">Taxa Fixa</option>
              <option value="bairro">Por Bairro</option>
              <option value="regiao">Por Região</option>
              <option value="km">Por Km (R$/km)</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">
                {editing.fee_type === "km" ? "Valor por km (R$)" : "Valor da taxa (R$)"}
              </label>
              <Input
                type="number"
                step="0.50"
                min="0"
                value={editing.fee_value}
                onChange={(e) => setEditing({ ...editing, fee_value: parseFloat(e.target.value) || 0 })}
                className="bg-background border-border"
              />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <span className="text-xs text-muted-foreground">Ativa</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancel} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:opacity-80">
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button onClick={save} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {(!zones || zones.length === 0) && !editing ? (
        <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
          Nenhuma zona de entrega cadastrada
        </div>
      ) : (
        <div className="space-y-2">
          {zones?.map((zone) => (
            <div key={zone.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{zone.name}</span>
                  <Badge variant="outline" className={`text-[10px] ${feeTypeBadgeColors[zone.fee_type]}`}>
                    {feeTypeLabels[zone.fee_type]}
                  </Badge>
                  {!zone.is_active && (
                    <Badge variant="secondary" className="text-[10px]">Inativa</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {zone.fee_type === "km"
                    ? `${formatCurrency(zone.fee_value)}/km`
                    : formatCurrency(zone.fee_value)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={zone.is_active} onCheckedChange={() => toggleActive(zone)} />
                <button
                  onClick={() => startEdit(zone)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(zone.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
