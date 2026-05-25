import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, SquarePen, Trash2, Landmark, UserCog, Users as UsersIcon, User, Shield } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTabFromHash } from "@/lib/route-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useConsultores, upsertConsultor, removeConsultor, novoConsultorVazio, formatTelefoneBR, type Consultor } from "@/lib/consultores-store";
import { useBancos, upsertBanco, removeBanco, toggleBancoAtivo, type Banco } from "@/lib/bancos-store";
import { useGerentes, upsertGerente, removeGerente, type Gerente } from "@/lib/gerentes-store";
import { useUsuarios, upsertUsuario, removeUsuario, type Usuario } from "@/lib/usuarios-store";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros — Meta Sun Gerencial" }] }),
  component: CadastrosPage,
});

import { useEquipes, setEquipes as setEquipesStore, type Equipe } from "@/lib/equipes-store";

// Confirmação antes de editar qualquer registro.
function confirmEdit(label = "este registro"): boolean {
  if (typeof window === "undefined") return true;
  return window.confirm(`Deseja realmente editar ${label}?`);
}

function CadastrosPage() {
  const [tab, setTab] = useTabFromHash("/cadastros");
  const bancos = useBancos();
  const gerentes = useGerentes();
  const equipes = useEquipes();
  const setEquipes = setEquipesStore;
  const consultores = useConsultores();
  const usuarios = useUsuarios();

  return (
    <>
      <PageHeader title="Cadastros" subtitle="Mantenha as bases auxiliares do sistema." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
          <TabsTrigger value="gerentes">Gerentes</TabsTrigger>
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="bancos" className="mt-5">
          <BancosCrud items={bancos} />
        </TabsContent>
        <TabsContent value="gerentes" className="mt-5">
          <GerentesCrud items={gerentes} bancos={bancos} />
        </TabsContent>
        <TabsContent value="equipes" className="mt-5">
          <EquipesCrud items={equipes} setItems={setEquipes} />
        </TabsContent>
        <TabsContent value="vendedores" className="mt-5">
          <ConsultoresCrud items={consultores} />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-5">
          <UsuariosCrud items={usuarios} />
        </TabsContent>
        <TabsContent value="status" className="mt-5">
          <StatusListing />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ----------------- Bancos ----------------- */
function BancosCrud({ items }: { items: Banco[] }) {
  const [editing, setEditing] = useState<Banco | null>(null);
  const [creating, setCreating] = useState(false);

  const save = (b: Banco) => { upsertBanco(b); toast.success("Banco salvo"); };
  const remove = (id: string) => { if (!window.confirm("Remover este banco?")) return; removeBanco(id); toast.success("Banco removido"); };

  return (
    <CrudCard title="Bancos cadastrados" onNew={() => setCreating(true)}>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Banco</TableHead><TableHead className="text-right">Operações</TableHead>
          <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
          <TableHead className="text-center">Ativo</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.nome}</TableCell>
              <TableCell className="text-right">{b.operacoes}</TableCell>
              <TableCell className="text-right">{b.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
              <TableCell><StatusBadge status={b.status} /></TableCell>
              <TableCell className="text-center">
                <Switch checked={b.status === "Ativo"} onCheckedChange={() => toggleBancoAtivo(b.id)} />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirmEdit(`o banco "${b.nome}"`)) setEditing(b); }}><SquarePen className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <BancoDialog
        open={creating || !!editing}
        initial={editing}
        onClose={() => { setEditing(null); setCreating(false); }}
        onSave={(b) => { save(b); setEditing(null); setCreating(false); }}
      />
    </CrudCard>
  );
}

function BancoDialog({ open, initial, onClose, onSave }: { open: boolean; initial: Banco | null; onClose: () => void; onSave: (b: Banco) => void }) {
  const makeNew = (): Banco => ({ id: `BCO-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`, nome: "", operacoes: 0, total: 0, status: "Ativo" });
  const [form, setForm] = useState<Banco>(() => initial ?? makeNew());
  useEffect(() => { if (open) setForm(initial ?? makeNew()); }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl">{initial ? "Editar banco" : "Novo banco"}</DialogTitle>
            </div>
          </DialogHeader>
        </div>
        <div className="px-6 py-5">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="border-t bg-muted/30 px-6 py-3">
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave(form)} disabled={!form.nome} className="bg-primary text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- Gerentes ----------------- */
function GerentesCrud({ items, bancos }: { items: Gerente[]; bancos: Banco[] }) {
  const [editing, setEditing] = useState<Gerente | null>(null);
  const [creating, setCreating] = useState(false);
  const save = (g: Gerente) => { upsertGerente(g); toast.success("Gerente salvo"); };
  const remove = (id: string) => { if (!window.confirm("Remover este gerente?")) return; removeGerente(id); toast.success("Gerente removido"); };

  return (
    <CrudCard title="Gerentes bancários" onNew={() => setCreating(true)}>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Nome</TableHead><TableHead>Banco</TableHead><TableHead>Telefone</TableHead>
          <TableHead className="text-right">Operações</TableHead><TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.map((g) => (
            <TableRow key={g.id}>
              <TableCell className="font-medium">{g.nome}</TableCell>
              <TableCell>{g.banco}</TableCell>
              <TableCell>{g.telefone}</TableCell>
              <TableCell className="text-right">{g.operacoes}</TableCell>
              <TableCell><StatusBadge status={g.status} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirmEdit(`o gerente "${g.nome}"`)) setEditing(g); }}><SquarePen className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <GerenteDialog
        open={creating || !!editing}
        initial={editing}
        bancos={bancos}
        onClose={() => { setEditing(null); setCreating(false); }}
        onSave={(g) => { save(g); setEditing(null); setCreating(false); }}
      />
    </CrudCard>
  );
}

function GerenteDialog({ open, initial, bancos, onClose, onSave }: { open: boolean; initial: Gerente | null; bancos: Banco[]; onClose: () => void; onSave: (g: Gerente) => void }) {
  const makeNew = (): Gerente => ({ id: `GER-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`, nome: "", banco: bancos[0]?.nome ?? "", telefone: "", operacoes: 0, status: "Ativo" });
  const [form, setForm] = useState<Gerente>(() => initial ?? makeNew());
  useEffect(() => { if (open) setForm(initial ?? makeNew()); }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserCog className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl">{initial ? "Editar gerente" : "Novo gerente"}</DialogTitle>
            </div>
          </DialogHeader>
        </div>
        <div className="px-6 py-5">
          <div className="rounded-lg border bg-card p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nome</Label><Input className="mt-1.5" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Banco</Label>
                <Select value={form.banco} onValueChange={(v) => setForm({ ...form, banco: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{bancos.map((b) => <SelectItem key={b.id} value={b.nome}>{b.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Telefone</Label><Input className="mt-1.5" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatTelefoneBR(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t bg-muted/30 px-6 py-3">
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave(form)} disabled={!form.nome} className="bg-primary text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- Equipes ----------------- */
function EquipesCrud({ items, setItems }: { items: Equipe[]; setItems: (v: Equipe[]) => void }) {
  const [editing, setEditing] = useState<Equipe | null>(null);
  const [creating, setCreating] = useState(false);
  const save = (e: Equipe) => {
    if (items.find((x) => x.id === e.id)) setItems(items.map((x) => (x.id === e.id ? e : x)));
    else setItems([...items, e]);
    toast.success("Equipe salva");
  };
  const remove = (id: string) => { if (!window.confirm("Remover esta equipe?")) return; setItems(items.filter((x) => x.id !== id)); toast.success("Equipe removida"); };

  return (
    <CrudCard title="Equipes de instalação" onNew={() => setCreating(true)}>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Equipe</TableHead><TableHead>Líder</TableHead>
          <TableHead className="text-right">Membros</TableHead><TableHead className="text-right">Obras ativas</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.nome}</TableCell>
              <TableCell>{e.lider}</TableCell>
              <TableCell className="text-right">{e.membros}</TableCell>
              <TableCell className="text-right">{e.obrasAtivas}</TableCell>
              <TableCell><StatusBadge status={e.status} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirmEdit(`a equipe "${e.nome}"`)) setEditing(e); }}><SquarePen className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <EquipeDialog
        open={creating || !!editing}
        initial={editing}
        onClose={() => { setEditing(null); setCreating(false); }}
        onSave={(e) => { save(e); setEditing(null); setCreating(false); }}
      />
    </CrudCard>
  );
}

function EquipeDialog({ open, initial, onClose, onSave }: { open: boolean; initial: Equipe | null; onClose: () => void; onSave: (e: Equipe) => void }) {
  const makeNew = (): Equipe => ({ id: `EQ-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`, nome: "", lider: "", membros: 0, obrasAtivas: 0, status: "Ativo" });
  const [form, setForm] = useState<Equipe>(() => initial ?? makeNew());
  useEffect(() => { if (open) setForm(initial ?? makeNew()); }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UsersIcon className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl">{initial ? "Editar equipe" : "Nova equipe"}</DialogTitle>
            </div>
          </DialogHeader>
        </div>
        <div className="px-6 py-5">
          <div className="rounded-lg border bg-card p-5">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input className="mt-1.5" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Líder</Label><Input className="mt-1.5" value={form.lider} onChange={(e) => setForm({ ...form, lider: e.target.value })} /></div>
              <div><Label>Membros</Label><Input className="mt-1.5" type="number" value={form.membros} onChange={(e) => setForm({ ...form, membros: Number(e.target.value) })} /></div>
              <div><Label>Obras ativas</Label><Input className="mt-1.5" type="number" value={form.obrasAtivas} onChange={(e) => setForm({ ...form, obrasAtivas: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t bg-muted/30 px-6 py-3">
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave(form)} disabled={!form.nome} className="bg-primary text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- Consultores ----------------- */
function ConsultoresCrud({ items }: { items: Consultor[] }) {
  const [editing, setEditing] = useState<Consultor | null>(null);
  const [creating, setCreating] = useState(false);
  const save = (c: Consultor) => { upsertConsultor(c); toast.success("Consultor salvo"); };
  const remove = (id: string) => { if (!window.confirm("Remover este consultor?")) return; removeConsultor(id); toast.success("Consultor removido"); };

  return (
    <CrudCard title="Consultores" onNew={() => setCreating(true)}>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.nome}</TableCell>
              <TableCell>{c.email || "—"}</TableCell>
              <TableCell>{c.telefone || "—"}</TableCell>
              <TableCell><StatusBadge status={c.ativo ? "Ativo" : "Inativo"} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirmEdit(`o consultor "${c.nome}"`)) setEditing(c); }}><SquarePen className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ConsultorDialog
        open={creating || !!editing}
        initial={editing}
        onClose={() => { setEditing(null); setCreating(false); }}
        onSave={(c) => { save(c); setEditing(null); setCreating(false); }}
      />
    </CrudCard>
  );
}

function ConsultorDialog({ open, initial, onClose, onSave }: { open: boolean; initial: Consultor | null; onClose: () => void; onSave: (c: Consultor) => void }) {
  const [form, setForm] = useState<Consultor>(() => initial ?? novoConsultorVazio());
  useEffect(() => { if (open) setForm(initial ?? novoConsultorVazio()); }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl">{initial ? "Editar consultor" : "Novo consultor"}</DialogTitle>
            </div>
          </DialogHeader>
        </div>
        <div className="px-6 py-5">
          <div className="rounded-lg border bg-card p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nome</Label><Input className="mt-1.5" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input className="mt-1.5" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input className="mt-1.5" value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: formatTelefoneBR(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Status</Label>
                <Select value={form.ativo ? "Ativo" : "Inativo"} onValueChange={(v) => setForm({ ...form, ativo: v === "Ativo" })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t bg-muted/30 px-6 py-3">
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave(form)} disabled={!form.nome} className="bg-primary text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- Usuários ----------------- */
const PERFIS = ["Administrador", "Comercial", "Engenharia", "Financeiro", "Estoque"];

function UsuariosCrud({ items }: { items: Usuario[] }) {
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [creating, setCreating] = useState(false);
  const save = (u: Usuario) => { upsertUsuario(u); toast.success("Usuário salvo"); };
  const remove = (id: string) => { if (!window.confirm("Remover este usuário?")) return; removeUsuario(id); toast.success("Usuário removido"); };

  return (
    <CrudCard title="Usuários do sistema" onNew={() => setCreating(true)}>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Perfil</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.nome}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.perfil}</TableCell>
              <TableCell><StatusBadge status={u.status} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirmEdit(`o usuário "${u.nome}"`)) setEditing(u); }}><SquarePen className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(u.id)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <UsuarioDialog
        open={creating || !!editing}
        initial={editing}
        onClose={() => { setEditing(null); setCreating(false); }}
        onSave={(u) => { save(u); setEditing(null); setCreating(false); }}
      />
    </CrudCard>
  );
}

function UsuarioDialog({ open, initial, onClose, onSave }: { open: boolean; initial: Usuario | null; onClose: () => void; onSave: (u: Usuario) => void }) {
  const makeNew = (): Usuario => ({ id: `U-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`, nome: "", email: "", perfil: PERFIS[0], status: "Ativo" });
  const [form, setForm] = useState<Usuario>(() => initial ?? makeNew());
  useEffect(() => { if (open) setForm(initial ?? makeNew()); }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl">{initial ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            </div>
          </DialogHeader>
        </div>
        <div className="px-6 py-5">
          <div className="rounded-lg border bg-card p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nome</Label><Input className="mt-1.5" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input className="mt-1.5" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Perfil</Label>
                <Select value={form.perfil} onValueChange={(v) => setForm({ ...form, perfil: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{PERFIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t bg-muted/30 px-6 py-3">
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave(form)} disabled={!form.nome || !form.email} className="bg-primary text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- Status (catálogo do sistema) ----------------- */
function StatusListing() {
  const rows: Array<[string, string]> = [
    ["Gerado", "Comercial"], ["Assinado", "Comercial"], ["Pendente", "Comercial"], ["Cancelado", "Comercial"],
    ["Em análise", "Financiamentos"], ["Aprovado", "Financiamentos"], ["Liberado", "Financiamentos"], ["Finalizado", "Financiamentos"],
    ["Executando instalação", "Engenharia"], ["Aguardando instalação", "Engenharia"], ["Em projeto/aprovação", "Engenharia"], ["Standby", "Engenharia"], ["Finalizado", "Engenharia"],
  ];
  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-semibold">Status do sistema</div>
        <span className="text-xs text-muted-foreground">Catálogo interno — somente leitura</span>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Status</TableHead><TableHead>Módulo</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium"><StatusBadge status={r[0]} /></TableCell>
              <TableCell>{r[1]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ----------------- Helpers ----------------- */
function CrudCard({ title, onNew, children }: { title: string; onNew: () => void; children: React.ReactNode }) {
  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-semibold">{title}</div>
        <Button onClick={onNew} className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo</Button>
      </div>
      {children}
    </Card>
  );
}
