import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Phone, User, Loader2, Link2, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminDrivers() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_drivers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for linking
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addDriver = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("delivery_drivers")
        .insert({ name, phone });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entregador adicionado!");
      setName("");
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("delivery_drivers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entregador removido!");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => {
      const { error } = await supabase
        .from("delivery_drivers")
        .update({ is_available: available })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const linkUser = useMutation({
    mutationFn: async ({ driverId, userId }: { driverId: string; userId: string | null }) => {
      const { error } = await supabase
        .from("delivery_drivers")
        .update({ user_id: userId })
        .eq("id", driverId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vínculo atualizado!");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Find linked profiles
  const linkedUserIds = new Set(drivers?.filter(d => d.user_id).map(d => d.user_id) || []);
  const availableProfiles = profiles?.filter(p => !linkedUserIds.has(p.user_id)) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Entregadores ({drivers?.length || 0})</h2>
      <p className="text-xs text-muted-foreground">
        Vincule uma conta de usuário para que o entregador acesse <strong>/driver</strong> e gerencie suas entregas.
      </p>

      {/* Add form */}
      <div className="flex gap-2 flex-wrap">
        <input
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[150px] px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
        />
        <input
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
        />
        <button
          onClick={() => addDriver.mutate()}
          disabled={!name.trim() || !phone.trim() || addDriver.isPending}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {drivers?.map((d) => {
            const linkedProfile = profiles?.find(p => p.user_id === d.user_id);

            return (
              <div key={d.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {d.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAvailability.mutate({ id: d.id, available: !d.is_available })}
                      className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Badge variant={d.is_available ? "default" : "secondary"}>
                        {d.is_available ? "Disponível" : "Indisponível"}
                      </Badge>
                    </button>
                    <button
                      onClick={() => deleteDriver.mutate(d.id)}
                      className="w-8 h-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center hover:bg-destructive/25"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* User link section */}
                <div className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
                  {d.user_id ? (
                    <>
                      <Link2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-xs text-foreground flex-1">
                        Vinculado: <strong>{linkedProfile?.email || linkedProfile?.name || d.user_id}</strong>
                      </span>
                      <button
                        onClick={() => linkUser.mutate({ driverId: d.id, userId: null })}
                        className="px-2 py-1 rounded bg-destructive/15 text-destructive text-[10px] font-semibold flex items-center gap-1"
                      >
                        <Unlink className="w-3 h-3" /> Desvincular
                      </button>
                    </>
                  ) : (
                    <>
                      <Unlink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <select
                        onChange={(e) => e.target.value && linkUser.mutate({ driverId: d.id, userId: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-secondary border border-border text-foreground text-xs"
                        defaultValue=""
                      >
                        <option value="" disabled>Vincular conta de usuário...</option>
                        {availableProfiles.map((p) => (
                          <option key={p.user_id} value={p.user_id}>
                            {p.name || "Sem nome"} ({p.email})
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
