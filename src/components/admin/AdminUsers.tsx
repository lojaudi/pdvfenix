import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Users, Headphones, Wallet, Bike, Pencil, Eye, EyeOff, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// "entregador" is virtual — mapped to delivery_drivers table
type DisplayRole = AppRole | "entregador";

type UserWithRole = {
  user_id: string;
  email: string;
  name: string;
  roles: DisplayRole[];
};

const allRoles: { id: DisplayRole; label: string; icon: typeof Shield; description: string }[] = [
  { id: "admin", label: "Administrador", icon: Shield, description: "Acesso total ao sistema" },
  { id: "attendant", label: "Atendente (Balcão)", icon: Headphones, description: "PDV e pedidos balcão" },
  { id: "caixa", label: "Atendente (Caixa)", icon: Wallet, description: "Fechamento e relatórios" },
  { id: "waiter", label: "Garçom", icon: Users, description: "Mesas e pedidos garçom" },
  { id: "entregador", label: "Entregador", icon: Bike, description: "Entregas e rastreamento" },
];

export function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRoles, setFormRoles] = useState<DisplayRole[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const { data: drivers } = await supabase.from("delivery_drivers").select("user_id");

    if (profiles) {
      const driverUserIds = new Set((drivers || []).map((d) => d.user_id).filter(Boolean));
      const usersMap = profiles.map((p) => {
        const userRoles: DisplayRole[] = (roles || [])
          .filter((r) => r.user_id === p.user_id)
          .map((r) => r.role as DisplayRole);
        if (driverUserIds.has(p.user_id)) userRoles.push("entregador");
        return {
          user_id: p.user_id,
          email: p.email || "",
          name: p.name || "",
          roles: userRoles,
        };
      });
      setUsers(usersMap);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormPhone("");
    setFormRoles([]);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setFormPhone("");
    setFormRoles([...user.roles]);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const toggleRole = (role: DisplayRole) => {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (editingUser) {
        // Update user info
        const updatePayload: any = { action: "update", userId: editingUser.user_id };
        if (formName !== editingUser.name) updatePayload.name = formName;
        if (formEmail !== editingUser.email) updatePayload.email = formEmail;
        if (formPassword) updatePayload.password = formPassword;

        const { data: updateRes, error: updateErr } = await supabase.functions.invoke("manage-users", {
          body: updatePayload,
        });
        if (updateErr || updateRes?.error) throw new Error(updateRes?.error || updateErr?.message);

        // Sync roles
        const { data: rolesRes, error: rolesErr } = await supabase.functions.invoke("manage-users", {
          body: { action: "sync_roles", userId: editingUser.user_id, roles: formRoles, phone: formPhone },
        });
        if (rolesErr || rolesRes?.error) throw new Error(rolesRes?.error || rolesErr?.message);

        toast.success("Usuário atualizado!");
      } else {
        // Create
        if (!formPassword || formPassword.length < 6) {
          toast.error("Senha deve ter pelo menos 6 caracteres");
          setSaving(false);
          return;
        }

        const { data: res, error } = await supabase.functions.invoke("manage-users", {
          body: { action: "create", name: formName, email: formEmail, password: formPassword, roles: formRoles, phone: formPhone },
        });
        if (error || res?.error) throw new Error(res?.error || error?.message);

        toast.success("Usuário criado com sucesso!");
      }

      setDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setSaving(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", userId: deletingUser.user_id },
      });
      if (error || res?.error) throw new Error(res?.error || error?.message);

      toast.success("Usuário removido!");
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover usuário");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Usuários ({users.length})</h2>
        <Button onClick={openCreateDialog} size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => (
            <div key={u.user_id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-card-foreground truncate">{u.name || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)} title="Editar">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setDeletingUser(u); setDeleteDialogOpen(true); }}
                    title="Remover"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {u.roles.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">Sem funções atribuídas</span>
                )}
                {u.roles.map((role) => {
                  const info = allRoles.find((r) => r.id === role);
                  if (!info) return null;
                  const Icon = info.icon;
                  return (
                    <span
                      key={role}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                    >
                      <Icon className="w-3 h-3" />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário encontrado</p>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {editingUser ? "Nova senha (deixe vazio para manter)" : "Senha *"}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? "••••••" : "Mínimo 6 caracteres"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Phone (shown when entregador is selected) */}
            {formRoles.includes("entregador") && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Telefone (Entregador)</label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Funções</label>
              <div className="grid gap-2">
                {allRoles.map((role) => {
                  const Icon = role.icon;
                  const checked = formRoles.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        checked
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card hover:border-primary/20"
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleRole(role.id)} />
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{role.label}</p>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editingUser ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deletingUser?.name || deletingUser?.email}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
