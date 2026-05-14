import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { equipes as equipesSeed, vendedores, usuarios } from "@/lib/mock-data";
import { useBancos, upsertBanco, removeBanco, toggleBancoAtivo, type Banco } from "@/lib/bancos-store";
import { useGerentes, upsertGerente, removeGerente, type Gerente } from "@/lib/gerentes-store";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros — Meta Sun Gerencial" }] }),
  component: CadastrosPage,
});

type Equipe = { id: string; nome: string; lider: string; membros: number; obrasAtivas: number; status: string };

function CadastrosPage() {
  const [tab, setTab] = useTabFromHash("/cadastros");
  const bancos = useBancos();
  const gerentes = useGerentes();
  const [equipes, setEquipes] = useState<Equipe[]>(() => equipesSeed.map((e) => ({ ...e })));

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
            title="Vendedores"
            cols={["Nome", "E-mail", "Contratos", "Status"]}
            rows={vendedores.map((v) => [v.nome, v.email, v.contratos, <StatusBadge key="s" status={v.status} />])}
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(b)}><Pencil className="h-4 w-4" /></Button>
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
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar banco" : "Novo banco"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Operações</Label><Input type="number" value={form.operacoes} onChange={(e) => setForm({ ...form, operacoes: Number(e.target.value) })} /></div>
          <div><Label>Total (R$)</Label><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} /></div>
          <div className="col-span-2"><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.nome}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- Gerentes ----------------- */
function GerentesCrud({ items, setItems, bancos }: { items: Gerente[]; setItems: (v: Gerente[]) => void; bancos: Banco[] }) {
  const [editing, setEditing] = useState<Gerente | null>(null);
  const [creating, setCreating] = useState(false);
  const save = (g: Gerente) => {
    if (items.find((x) => x.id === g.id)) setItems(items.map((x) => (x.id === g.id ? g : x)));
    else setItems([...items, g]);
    toast.success("Gerente salvo");
  };
  const remove = (id: string) => { setItems(items.filter((x) => x.id !== id)); toast.success("Gerente removido"); };

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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(g)}><Pencil className="h-4 w-4" /></Button>
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
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar gerente" : "Novo gerente"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Banco</Label>
            <Select value={form.banco} onValueChange={(v) => setForm({ ...form, banco: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{bancos.map((b) => <SelectItem key={b.id} value={b.nome}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div><Label>Operações</Label><Input type="number" value={form.operacoes} onChange={(e) => setForm({ ...form, operacoes: Number(e.target.value) })} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.nome}>Salvar</Button>
        </DialogFooter>
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></Button>
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
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar equipe" : "Nova equipe"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Líder</Label><Input value={form.lider} onChange={(e) => setForm({ ...form, lider: e.target.value })} /></div>
          <div><Label>Membros</Label><Input type="number" value={form.membros} onChange={(e) => setForm({ ...form, membros: Number(e.target.value) })} /></div>
          <div><Label>Obras ativas</Label><Input type="number" value={form.obrasAtivas} onChange={(e) => setForm({ ...form, obrasAtivas: Number(e.target.value) })} /></div>
          <div className="col-span-2"><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.nome}>Salvar</Button>
        </DialogFooter>
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
                <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
