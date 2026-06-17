/**
 * Comercial — Aba de Vendedores.
 * Extraído de `src/routes/comercial.tsx` em C-ENT.11.a (split puro, ZERO mudança funcional).
 */
import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EnterpriseRecordToolbar, ribbonRmComercial, layoutBarRm } from "@/components/app/enterprise";
import { fmtBRL } from "@/lib/mock-data";
import type { Contrato, Vendedor } from "./_shared";

export function VendedoresTab({
  contratos, vendedoresList, setVendedoresList,
}: { contratos: Contrato[]; vendedoresList: Vendedor[]; setVendedoresList: (v: Vendedor[]) => void }) {
  const remove = (id: string) => { setVendedoresList(vendedoresList.filter((v) => v.id !== id)); toast.success("Vendedor removido"); };
  const [busca, setBusca] = useState("");
  const filtrados = vendedoresList.filter((v) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return v.nome.toLowerCase().includes(q) || (v.email || "").toLowerCase().includes(q);
  });
  return (
    <div className="space-y-4">
      {/* D17.UI Fase 2b — Vendedores: barra Enterprise RM/TOTVS */}
      <EnterpriseRecordToolbar
        entityType="contratos"
        selectedIds={[]}
        availableActions={["atualizar", "filtroAvancado", "colunas", "exportar", "imprimir"]}
        searchPlaceholder="Buscar vendedor, e-mail…"
        search={busca}
        onSearchChange={setBusca}
        onAction={(a) => {
          if (a === "atualizar") toast.info("Lista de vendedores atualizada.");
          else if (a === "exportar") toast.info("Exportação CSV chega em D17.UI.3.");
          else if (a === "colunas") toast.info("Gestor de colunas chega em D17.UI.3.");
          else if (a === "filtroAvancado") toast.info("Filtros avançados chegam em D17.UI.3.");
        }}
        statusActions={ribbonRmComercial()}
        layoutBar={layoutBarRm()}
      />
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{filtrados.length} de {vendedoresList.length} vendedor(es)</div>
        <NovoVendedorDialog onSave={(v) => setVendedoresList([...vendedoresList, v])} nextId={`VEN-${String(vendedoresList.length + 1).padStart(2, "0")}`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((v) => {
          const meus = contratos.filter((c) => c.vendedor === v.nome);
          const valor = meus.reduce((s, c) => s + c.valor, 0);
          const ass = meus.filter((c) => c.status === "Assinado").length;
          const pct = (valor / Math.max(v.meta, 1)) * 100;
          return (
            <Card key={v.id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {v.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{v.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">{v.email}</div>
                </div>
                <StatusBadge status={v.status} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Contratos</div><div className="font-bold">{meus.length}</div></div>
                <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Assinados</div><div className="font-bold text-success">{ass}</div></div>
                <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Vendido</div><div className="font-bold text-primary">{fmtBRL(valor)}</div></div>
                <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Conversão</div><div className="font-bold">{v.conversao}%</div></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Meta {fmtBRL(v.meta)}</span><span className="font-semibold">{pct.toFixed(0)}%</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              </div>
              <div className="mt-3">
                <HistoricoVendedorDialog vendedor={v.nome} contratos={meus} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function HistoricoVendedorDialog({ vendedor, contratos }: { vendedor: string; contratos: Contrato[] }) {
  const [open, setOpen] = useState(false);
  const total = contratos.reduce((s, c) => s + c.valor, 0);
  const totalKwp = contratos.reduce((s, c) => s + c.kwp, 0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <FileText className="mr-2 h-3.5 w-3.5" /> Histórico de vendas ({contratos.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de vendas — {vendedor}</DialogTitle>
          <DialogDescription>
            {contratos.length} contrato(s) · Total {fmtBRL(total)} · {totalKwp.toFixed(2)} kWp
          </DialogDescription>
        </DialogHeader>
        {contratos.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhum contrato vinculado a este vendedor.</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead>
              <TableHead className="text-right">kWp</TableHead><TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {[...contratos].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell>{c.cliente}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.data}</TableCell>
                  <TableCell className="text-right font-mono">{c.kwp.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtBRL(c.valor)}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NovoVendedorDialog({ onSave, nextId }: { onSave: (v: Vendedor) => void; nextId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", meta: "", status: "Ativo" });
  const submit = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome"); return; }
    onSave({
      id: nextId, nome: form.nome.trim(), email: form.email.trim(),
      contratos: 0, vendido: 0, kwp: 0, conversao: 0,
      meta: Number(form.meta) || 0, status: form.status,
    });
    toast.success("Vendedor cadastrado");
    setForm({ nome: "", email: "", meta: "", status: "Ativo" });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo Vendedor</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Vendedor</DialogTitle><DialogDescription>Cadastre um novo vendedor da equipe comercial.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1.5"><Label>Nome completo</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="md:col-span-2 space-y-1.5"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Meta (R$)</Label><Input type="number" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground" onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
