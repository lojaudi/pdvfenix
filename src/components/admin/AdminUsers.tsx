import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Users, Headphones, Wallet } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

type UserWithRole = {
  user_id: string;
  email: string;
  name: string;
  roles: AppRole[];
};

const roleLabels: Record<AppRole, { label: string; icon: typeof Shield }> = {
  admin: { label: "Administrador", icon: Shield },
  attendant: { label: "Atendente", icon: Headphones },
  waiter: { label: "Garçom", icon: Users },
  caixa: { label: "Caixa", icon: Wallet },
};

export function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    // Get profiles
    const { data: profiles } = await supabase.from("profiles").select("*");
    // Get all roles (admin can see all)
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles) {
      const usersMap = profiles.map((p) => ({
        user_id: p.user_id,
        email: p.email || "",
        name: p.name || "",
        roles: (roles || []).filter((r) => r.user_id === p.user_id).map((r) => r.role),
      }));
      setUsers(usersMap);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      if (error.code === "23505") toast.error("Usuário já possui essa role");
      else toast.error(error.message);
      return;
    }
    toast.success(`Role ${roleLabels[role].label} adicionada!`);
    fetchUsers();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) { toast.error(error.message); return; }
    toast.success(`Role ${roleLabels[role].label} removida!`);
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Usuários ({users.length})</h2>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.user_id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-card-foreground">{u.name || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["admin", "attendant", "waiter"] as AppRole[]).map((role) => {
                  const hasRole = u.roles.includes(role);
                  const RoleIcon = roleLabels[role].icon;
                  return (
                    <button
                      key={role}
                      onClick={() => hasRole ? removeRole(u.user_id, role) : addRole(u.user_id, role)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        hasRole
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-secondary text-muted-foreground border border-border hover:border-primary/30"
                      }`}
                    >
                      <RoleIcon className="w-3 h-3" />
                      {roleLabels[role].label}
                      {hasRole && <span className="ml-1">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
