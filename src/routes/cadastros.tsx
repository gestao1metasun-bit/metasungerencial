import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, SquarePen, Trash2, Landmark, UserCog, Users as UsersIcon } from "lucide-react";
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
import { equipes as equipesSeed, usuarios } from "@/lib/mock-data";
import { useConsultores } from "@/lib/consultores-store";
import { useBancos, upsertBanco, removeBanco, toggleBancoAtivo, type Banco } from "@/lib/bancos-store";
import { useGerentes, upsertGerente, removeGerente, type Gerente } from "@/lib/gerentes-store";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros — Meta Sun Gerencial" }] }),
  component: CadastrosPage,
});

import { useEquipes, setEquipes as setEquipesStore, type Equipe } from "@/lib/equipes-store";

function CadastrosPage() {
  const [tab, setTab] = useTabFromHash("/cadastros");
  const bancos = useBancos();
  const gerentes = useGerentes();
  const equipes = useEquipes();
  const setEquipes = setEquipesStore;
  const consultores = useConsultores();

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
          <Listing
            title="Consultores"
            cols={["Nome", "E-mail", "Telefone", "Status"]}
            rows={consultores.map((c) => [c.nome, c.email ?? "—", c.telefone ?? "—", <StatusBadge key="s" status={c.ativo ? "Ativo" : "Inativo"} />])}
          />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-5">
          <Listing
            title="Usuários do sistema"
            cols={["Nome", "E-mail", "Perfil", "Status"]}
            rows={usuarios.map((u) => [u.nome, u.email, u.perfil, <StatusBadge key="s" status={u.status} />])}
          />
        </TabsContent>
        <TabsContent value="status" className="mt-5">
          <Listing
            title="Status do sistema"
            cols={["Status", "Módulo"]}
            rows={[
              ["Gerado", "Comercial"], ["Assinado", "Comercial"], ["Pendente", "Comercial"], ["Cancelado", "Comercial"],
              ["Em análise", "Financiamentos"], ["Aprovado", "Financiamentos"], ["Liberado", "Financiamentos"], ["Finalizado", "Financiamentos"],
              ["Executando instalação", "Engenharia"], ["Aguardando instalação", "Engenharia"], ["Em projeto/aprovação", "Engenharia"], ["Standby", "Engenharia"], ["Finalizado", "Engenharia"],
            ].map((r) => [<StatusBadge key="s" status={r[0]} />, r[1]])}
          />
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
  const remove = (id: string) => { removeBanco(id); toast.success("Banco removido"); };

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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(b)}><SquarePen className="h-4 w-4" /></Button>
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
  const [form, setForm] = useState<Banco>(() => initial ?? { id: `BCO-${Math.floor(Math.random() * 9000 + 1000)}`, nome: "", operacoes: 0, total: 0, status: "Ativo" });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
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
  const remove = (id: string) => { removeGerente(id); toast.success("Gerente removido"); };

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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(g)}><SquarePen className="h-4 w-4" /></Button>
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
  const [form, setForm] = useState<Gerente>(() => initial ?? { id: `GER-${Math.floor(Math.random() * 9000 + 1000)}`, nome: "", banco: bancos[0]?.nome ?? "", telefone: "", operacoes: 0, status: "Ativo" });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
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
              <div><Label>Telefone</Label><Input className="mt-1.5" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
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
  const remove = (id: string) => { setItems(items.filter((x) => x.id !== id)); toast.success("Equipe removida"); };

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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(e)}><SquarePen className="h-4 w-4" /></Button>
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
  const [form, setForm] = useState<Equipe>(() => initial ?? { id: `EQ-${Math.floor(Math.random() * 9000 + 1000)}`, nome: "", lider: "", membros: 0, obrasAtivas: 0, status: "Ativo" });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
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

function Listing({ title, cols, rows }: { title: string; cols: string[]; rows: any[][] }) {
  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-semibold">{title}</div>
        <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo</Button>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          {cols.map((c) => <TableHead key={c}>{c}</TableHead>)}
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((cell, j) => <TableCell key={j} className={j === 0 ? "font-medium" : ""}>{cell}</TableCell>)}
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8"><SquarePen className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
