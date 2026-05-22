// Tab "Permissões granulares" — admins liberam/bloqueiam permissões por usuário.
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listUsersWithRoles, listUserOverrides, listUserEffectivePermissions,
  listAllPermissions, upsertUserOverride, removeUserOverride,
  type UserWithRoles, type UserOverride,
} from "@/lib/permission-overrides.functions";
import { useMyPermissions } from "@/hooks/use-permissions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Trash2, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function groupByModule(perms: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const p of perms) {
    const mod = p.split(".")[0] ?? "outros";
    (out[mod] ||= []).push(p);
  }
  for (const k of Object.keys(out)) out[k].sort();
  return out;
}

export function PermissoesTab() {
  const { isAdmin, isLoading: permLoading } = useMyPermissions();
  const qc = useQueryClient();
  const listUsersFn = useServerFn(listUsersWithRoles);
  const listAllFn = useServerFn(listAllPermissions);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [search, setSearch] = useState("");

  const usersQ = useQuery({
    queryKey: ["perm-users"],
    queryFn: () => listUsersFn(),
    enabled: isAdmin,
  });
  const allPermsQ = useQuery({
    queryKey: ["perm-all"],
    queryFn: () => listAllFn(),
    enabled: isAdmin,
  });

  if (permLoading) return <Card className="p-6">Carregando…</Card>;
  if (!isAdmin) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        <ShieldOff className="mb-2 h-5 w-5" />
        Apenas administradores podem gerenciar permissões granulares.
      </Card>
    );
  }

  const users = (usersQ.data ?? []).filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.nome.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
  });

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <Card className="p-4">
        <h2 className="text-base font-semibold mb-3">Usuários</h2>
        <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto">
          {usersQ.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
          {users.map((u) => (
            <button
              key={u.userId}
              onClick={() => setSelectedUser(u)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selectedUser?.userId === u.userId ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
              }`}
            >
              <div className="font-medium">{u.nome || u.email}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {u.roles.map((r) => (
                  <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                ))}
                {!u.ativo && <Badge variant="destructive" className="text-[10px]">Inativo</Badge>}
              </div>
            </button>
          ))}
          {!usersQ.isLoading && users.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum usuário.</div>
          )}
        </div>
      </Card>

      {selectedUser ? (
        <UserPermissionsPanel
          user={selectedUser}
          allPermissions={allPermsQ.data ?? []}
          onChanged={() => qc.invalidateQueries({ queryKey: ["perm-user", selectedUser.userId] })}
        />
      ) : (
        <Card className="p-6 text-sm text-muted-foreground">Selecione um usuário à esquerda.</Card>
      )}
    </div>
  );
}

function UserPermissionsPanel({
  user, allPermissions, onChanged,
}: { user: UserWithRoles; allPermissions: string[]; onChanged: () => void }) {
  const qc = useQueryClient();
  const listOvFn = useServerFn(listUserOverrides);
  const listEffFn = useServerFn(listUserEffectivePermissions);
  const upsertFn = useServerFn(upsertUserOverride);
  const removeFn = useServerFn(removeUserOverride);

  const ovQ = useQuery({
    queryKey: ["perm-user", user.userId, "overrides"],
    queryFn: () => listOvFn({ data: { userId: user.userId } }),
  });
  const effQ = useQuery({
    queryKey: ["perm-user", user.userId, "effective"],
    queryFn: () => listEffFn({ data: { userId: user.userId } }),
  });

  const [dialogPerm, setDialogPerm] = useState<string | null>(null);
  const [dialogEffect, setDialogEffect] = useState<"grant" | "deny">("grant");
  const [motivo, setMotivo] = useState("");

  const overrides = ovQ.data ?? [];
  const ovByPerm = useMemo(() => {
    const m = new Map<string, UserOverride>();
    for (const o of overrides) m.set(o.permission, o);
    return m;
  }, [overrides]);
  const rolePerms = new Set(effQ.data?.rolePerms ?? []);

  const grouped = useMemo(() => groupByModule(allPermissions), [allPermissions]);

  function openDialog(perm: string, effect: "grant" | "deny") {
    setDialogPerm(perm);
    setDialogEffect(effect);
    setMotivo("");
  }

  async function confirm() {
    if (!dialogPerm) return;
    if (motivo.trim().length < 3) {
      toast.error("Informe um motivo (mín. 3 caracteres)");
      return;
    }
    try {
      await upsertFn({ data: { userId: user.userId, permission: dialogPerm, effect: dialogEffect, motivo: motivo.trim() } });
      toast.success(dialogEffect === "grant" ? "Permissão liberada" : "Permissão bloqueada");
      setDialogPerm(null);
      qc.invalidateQueries({ queryKey: ["perm-user", user.userId] });
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(id: string) {
    try {
      await removeFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["perm-user", user.userId] });
      toast.success("Exceção removida");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{user.nome || user.email}</h2>
        <p className="text-xs text-muted-foreground">{user.email} · perfis: {user.roles.join(", ") || "—"}</p>
      </div>

      {ovQ.isLoading || effQ.isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando permissões…</div>
      ) : (
        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2">
          {Object.entries(grouped).map(([mod, perms]) => (
            <div key={mod}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{mod}</h3>
              <div className="space-y-1">
                {perms.map((p) => {
                  const ov = ovByPerm.get(p);
                  const fromRole = rolePerms.has(p);
                  const isGranted = ov?.effect === "grant" || (fromRole && ov?.effect !== "deny");
                  const isBlocked = ov?.effect === "deny";
                  return (
                    <div key={p} className="flex items-center justify-between rounded-md border border-border bg-card/40 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs">{p}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {fromRole && <Badge variant="outline" className="text-[10px]">do perfil</Badge>}
                          {ov?.effect === "grant" && <Badge className="bg-emerald-600 text-[10px]">+ extra</Badge>}
                          {ov?.effect === "deny" && <Badge variant="destructive" className="text-[10px]">bloqueada</Badge>}
                          {isGranted && !isBlocked && <ShieldCheck className="h-3 w-3 text-emerald-600 inline" />}
                        </div>
                        {ov && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">motivo: {ov.motivo}</div>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!fromRole && ov?.effect !== "grant" && (
                          <Button size="sm" variant="outline" onClick={() => openDialog(p, "grant")}>
                            <Check className="h-3 w-3" /> Liberar
                          </Button>
                        )}
                        {(fromRole || ov?.effect === "grant") && ov?.effect !== "deny" && (
                          <Button size="sm" variant="outline" onClick={() => openDialog(p, "deny")}>
                            <X className="h-3 w-3" /> Bloquear
                          </Button>
                        )}
                        {ov && (
                          <Button size="sm" variant="ghost" onClick={() => remove(ov.id)} title="Remover exceção">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!dialogPerm} onOpenChange={(o) => !o && setDialogPerm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogEffect === "grant" ? "Liberar permissão extra" : "Bloquear permissão"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="font-mono text-sm rounded bg-muted px-3 py-2">{dialogPerm}</div>
            <div>
              <label className="text-xs text-muted-foreground">Motivo (obrigatório)</label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: liberado para o supervisor cobrir férias do gerente"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPerm(null)}>Cancelar</Button>
            <Button onClick={confirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
