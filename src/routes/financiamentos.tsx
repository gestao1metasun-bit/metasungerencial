import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Pencil, CheckCircle2, Copy, Banknote, Building2,
  TrendingUp, Clock, AlertCircle, FileText, Hourglass, XCircle,
  DollarSign, Users, Target, Calendar, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { financiamentos as finSeed, bancos, gerentes, finsSemContrato, fmtBRL } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/financiamentos")({
  head: () => ({ meta: [{ title: "Financiamentos — Meta Sun Gerencial" }] }),
  component: FinanciamentosPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const STATUS_LIST = [
  "Sem contrato", "Com contrato", "Em análise", "Pendente banco", "Pendente cliente",
  "Aguardando documentação", "Aguardando liberação", "Aprovado", "Liberado", "Finalizado", "Cancelado",
];

type FinOp = (typeof finSeed)[number];

/* ---------------- Página ---------------- */

function FinanciamentosPage() {
  const [ops, setOps] = useState<FinOp[]>(() => finSeed);

  const updateOp = (id: string, patch: Partial<FinOp>) => {
    setOps((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  return (
    <>
      <PageHeader
        title="Financiamentos"
        subtitle="Painel executivo de operações bancárias, prazos, liberações e recebimentos."
      />
      <Tabs defaultValue="dashboard">
        <TabsList className="bg-card border border-border flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="carteira">Carteira</TabsTrigger>
          <TabsTrigger value="sem">Sem Contrato</TabsTrigger>
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
          <TabsTrigger value="gerentes">Gerentes</TabsTrigger>
          <TabsTrigger value="previsao">Previsão</TabsTrigger>
          <TabsTrigger value="finalizados">Finalizados</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-5">
          <DashboardFin ops={ops} updateOp={updateOp} />
        </TabsContent>
        <TabsContent value="carteira" className="mt-5">
          <Carteira ops={ops} updateOp={updateOp} />
        </TabsContent>
        <TabsContent value="sem" className="mt-5"><SemContratoTab /></TabsContent>
        <TabsContent value="bancos" className="mt-5"><BancosTab ops={ops} /></TabsContent>
        <TabsContent value="gerentes" className="mt-5"><GerentesTab ops={ops} /></TabsContent>
        <TabsContent value="previsao" className="mt-5"><PrevisaoTab ops={ops} /></TabsContent>
        <TabsContent value="finalizados" className="mt-5">
          <Carteira ops={ops} updateOp={updateOp} filterFin />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ---------------- Helpers ---------------- */

function pct(part: number, total: number) {
  return total > 0 ? ((part / total) * 100).toFixed(1) + "%" : "0%";
}

function diasRestantes(previsao: string): number {
  if (!previsao || previsao === "—") return 0;
  const d = new Date(previsao + "T00:00:00").getTime();
  const t = Date.now();
  return Math.max(0, Math.ceil((d - t) / 86400000));
}

function faixaPrevisao(dias: number): string {
  if (dias <= 7) return "Até 7 dias";
  if (dias <= 15) return "8–15 dias";
  if (dias <= 30) return "16–30 dias";
  if (dias <= 60) return "31–60 dias";
  if (dias <= 90) return "61–90 dias";
  return "Acima de 90 dias";
}

/* ---------------- DASHBOARD ---------------- */

function DashboardFin({
  ops, updateOp,
}: { ops: FinOp[]; updateOp: (id: string, patch: Partial<FinOp>) => void }) {
  const total = ops.length;
  const valorTotal = ops.reduce((s, o) => s + o.valorFinanciado, 0);
  const comContrato = ops.filter((o) => !!o.contrato);
  const semContrato = finsSemContrato;
  const emAnalise = ops.filter((o) => o.statusOp === "Em análise");
  const aguardandoLib = ops.filter((o) => ["Aguardando documentação", "Aguardando liberação", "Aprovado"].includes(o.statusOp));
  const liberados = ops.filter((o) => o.statusOp === "Liberado");
  const finalizados = ops.filter((o) => o.statusOp === "Finalizado");
  const ativos = ops.filter((o) => !["Finalizado", "Cancelado"].includes(o.statusOp));

  const ticket = valorTotal / Math.max(total, 1);
  const valorMedioLib = liberados.reduce((s, o) => s + o.valorFinanciado, 0) / Math.max(liberados.length, 1);
  const tempoMedio = Math.round(
    ops.filter((o) => o.prazo > 0).reduce((s, o) => s + o.prazo, 0) /
    Math.max(ops.filter((o) => o.prazo > 0).length, 1)
  );

  const [openModal, setOpenModal] = useState<null | string>(null);

  const modalContent: Record<string, { title: string; ops: FinOp[] }> = {
    total: { title: "Todas as operações", ops },
    operacoes: { title: "Operações ativas", ops: ativos },
    com: { title: "Operações com contrato vinculado", ops: comContrato },
    analise: { title: "Operações em análise", ops: emAnalise },
    aguardando: { title: "Aguardando liberação", ops: aguardandoLib },
    liberados: { title: "Operações liberadas", ops: liberados },
    finalizados: { title: "Operações finalizadas", ops: finalizados },
    ticket: { title: "Análise de ticket médio", ops: [...ops].sort((a, b) => b.valorFinanciado - a.valorFinanciado) },
    medio: { title: "Valor médio liberado", ops: liberados },
    tempo: { title: "Tempo médio de liberação", ops: [...ops].sort((a, b) => b.prazo - a.prazo) },
  };

  // Gráficos
  const porBanco = bancos.map((b) => ({
    name: b.nome,
    qtd: ops.filter((o) => o.banco === b.nome).length,
    valor: ops.filter((o) => o.banco === b.nome).reduce((s, o) => s + o.valorFinanciado, 0),
  }));
  const porStatus = ["Em análise", "Aguardando documentação", "Aguardando liberação", "Aprovado", "Liberado", "Finalizado"].map((s) => ({
    name: s, qtd: ops.filter((o) => o.statusOp === s).length,
  }));
  const evolMensal = [
    { mes: "Dez", financiado: 980000, liberado: 720000 },
    { mes: "Jan", financiado: 1120000, liberado: 880000 },
    { mes: "Fev", financiado: 1480000, liberado: 1100000 },
    { mes: "Mar", financiado: 1650000, liberado: 1320000 },
    { mes: "Abr", financiado: 1850000, liberado: 1430000 },
    { mes: "Mai", financiado: 1320000, liberado: 980000 },
  ];

  return (
    <>
      {/* Cards executivos */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total Financiado" value={fmtBRL(valorTotal)} hint={`${total} operações`} icon={Banknote} tone="primary" trend={{ value: "12.4%", positive: true }} onView={() => setOpenModal("total")} />
        <StatCard label="Operações" value={`${ativos.length} (${pct(ativos.length, total)})`} hint={fmtBRL(ativos.reduce((s, o) => s + o.valorFinanciado, 0))} icon={FileText} tone="info" onView={() => setOpenModal("operacoes")} />
        <StatCard label="Com Contrato" value={`${comContrato.length} (${pct(comContrato.length, total)})`} hint={fmtBRL(comContrato.reduce((s, o) => s + o.valorFinanciado, 0))} icon={CheckCircle2} tone="success" onView={() => setOpenModal("com")} />
        <StatCard label="Sem Contrato" value={semContrato.length} hint={fmtBRL(semContrato.reduce((s, o) => s + o.valor, 0))} icon={AlertCircle} tone="warning" />
        <StatCard label="Em Análise" value={`${emAnalise.length} (${pct(emAnalise.length, total)})`} hint={fmtBRL(emAnalise.reduce((s, o) => s + o.valorFinanciado, 0))} icon={Hourglass} tone="info" onView={() => setOpenModal("analise")} />
        <StatCard label="Aguardando Liberação" value={`${aguardandoLib.length} (${pct(aguardandoLib.length, total)})`} hint={fmtBRL(aguardandoLib.reduce((s, o) => s + o.valorFinanciado, 0))} icon={Clock} tone="warning" onView={() => setOpenModal("aguardando")} />
        <StatCard label="Liberados" value={`${liberados.length} (${pct(liberados.length, total)})`} hint={fmtBRL(liberados.reduce((s, o) => s + o.valorFinanciado, 0))} icon={CheckCircle2} tone="success" onView={() => setOpenModal("liberados")} />
        <StatCard label="Finalizados" value={`${finalizados.length} (${pct(finalizados.length, total)})`} hint={fmtBRL(finalizados.reduce((s, o) => s + o.valorFinanciado, 0))} icon={CheckCircle2} tone="muted" onView={() => setOpenModal("finalizados")} />
        <StatCard label="Ticket Médio" value={fmtBRL(ticket)} hint={`${total} operações`} icon={TrendingUp} tone="info" onView={() => setOpenModal("ticket")} />
        <StatCard label="Valor Médio Liberado" value={fmtBRL(valorMedioLib)} hint={`${liberados.length} liberados`} icon={DollarSign} tone="success" onView={() => setOpenModal("medio")} />
        <StatCard label="Tempo Médio Liberação" value={`${tempoMedio} dias`} hint="média carteira" icon={Calendar} tone="warning" onView={() => setOpenModal("tempo")} />
        <StatCard label="Cancelados" value={ops.filter((o) => o.statusOp === "Cancelado").length} hint="período" icon={XCircle} tone="destructive" />
      </div>

      <DetailFinModal
        open={openModal !== null}
        onClose={() => setOpenModal(null)}
        title={openModal ? modalContent[openModal].title : ""}
        ops={openModal ? modalContent[openModal].ops : []}
        onUpdateStatus={(id, status) => { updateOp(id, { statusOp: status }); toast.success(`${id} → ${status}`); }}
      />

      {/* Performance por Gerente + Banco */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Performance por Gerente</div>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>#</TableHead><TableHead>Gerente</TableHead>
              <TableHead className="text-center">Op.</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
              <TableHead className="text-right">Aprov.</TableHead>
              <TableHead className="text-right">Pend.</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {gerentes.map((g, i) => {
                const lista = ops.filter((o) => o.gerente === g.nome);
                const valor = lista.reduce((s, o) => s + o.valorFinanciado, 0);
                const aprov = lista.filter((o) => ["Aprovado", "Liberado", "Finalizado"].includes(o.statusOp)).length;
                const pend = lista.filter((o) => ["Em análise", "Pendente banco", "Pendente cliente", "Aguardando documentação", "Aguardando liberação"].includes(o.statusOp)).length;
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                    <TableCell className="font-medium">{g.nome}<div className="text-xs text-muted-foreground">{g.banco}</div></TableCell>
                    <TableCell className="text-center">{lista.length}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRL(valor)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(valor / Math.max(lista.length, 1))}</TableCell>
                    <TableCell className="text-right text-success">{aprov}</TableCell>
                    <TableCell className="text-right text-warning">{pend}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" /> Performance por Banco</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porBanco}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="valor" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {porBanco.map((b, i) => (
              <div key={b.name} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {b.name}</div>
                <div className="font-semibold">{b.qtd} · {pct(b.valor, valorTotal)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Previsão de Liberação + Status */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary" /> Previsão de Liberação</div>
          {(["Até 7 dias", "8–15 dias", "16–30 dias", "31–60 dias", "61–90 dias", "Acima de 90 dias"] as const).map((faixa) => {
            const lista = ativos.filter((o) => faixaPrevisao(diasRestantes(o.previsao)) === faixa);
            const v = lista.reduce((s, o) => s + o.valorFinanciado, 0);
            return (
              <div key={faixa} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div>
                  <div className="text-sm font-medium">{faixa}</div>
                  <div className="text-xs text-muted-foreground">{lista.length} operações</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">{fmtBRL(v)}</div>
                  <div className="text-xs text-muted-foreground">{pct(v, valorTotal)}</div>
                </div>
              </div>
            );
          })}
        </Card>

        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Operações por status</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porStatus} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={140} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="qtd" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recebimento + Evolução */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Previsão de recebimento (mensal)</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={evolMensal}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="financiado" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} />
              <Area type="monotone" dataKey="liberado" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Tempo médio de aprovação por banco</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={bancos.map((b) => {
              const lista = ops.filter((o) => o.banco === b.nome && o.prazo > 0);
              return { banco: b.nome, dias: Math.round(lista.reduce((s, o) => s + o.prazo, 0) / Math.max(lista.length, 1)) };
            })}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="banco" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="dias" stroke="var(--chart-3)" strokeWidth={2.5} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

/* ---------------- Modal Detalhes ---------------- */

function DetailFinModal({
  open, onClose, title, ops, onUpdateStatus,
}: {
  open: boolean; onClose: () => void; title: string; ops: FinOp[];
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => { if (!open) setQ(""); }, [open]);
  const list = ops.filter((o) =>
    [o.id, o.cliente, o.banco, o.gerente].some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );
  const total = list.length;
  const valor = list.reduce((s, o) => s + o.valorFinanciado, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {total} operação{total !== 1 ? "ões" : ""} · Valor total {fmtBRL(valor)}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, banco, gerente, ID" className="pl-9" />
        </div>

        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Operação</TableHead><TableHead>Cliente</TableHead>
            <TableHead>Banco</TableHead><TableHead>Gerente</TableHead>
            <TableHead className="text-right">Financiado</TableHead>
            <TableHead>Status</TableHead><TableHead>Previsão</TableHead>
            <TableHead className="text-center">Restantes</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {list.map((o) => {
              const dias = diasRestantes(o.previsao);
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs text-primary">{o.id}</TableCell>
                  <TableCell className="font-medium">{o.cliente}</TableCell>
                  <TableCell>{o.banco}</TableCell>
                  <TableCell className="text-muted-foreground">{o.gerente}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRL(o.valorFinanciado)}</TableCell>
                  <TableCell><StatusBadge status={o.statusOp} /></TableCell>
                  <TableCell className="text-muted-foreground">{o.previsao}</TableCell>
                  <TableCell className="text-center">
                    {dias > 0 ? <span className={dias <= 5 ? "font-semibold text-warning" : ""}>{dias}d</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select value={o.statusOp} onValueChange={(v) => onUpdateStatus(o.id, v)}>
                      <SelectTrigger className="h-8 w-44 inline-flex"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
            {total === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhuma operação</TableCell></TableRow>}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Carteira ---------------- */

function Carteira({
  ops, updateOp, filterFin = false,
}: { ops: FinOp[]; updateOp: (id: string, patch: Partial<FinOp>) => void; filterFin?: boolean }) {
  const [q, setQ] = useState("");
  const [banco, setBanco] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [editing, setEditing] = useState<FinOp | null>(null);

  const list = useMemo(() =>
    ops
      .filter((o) => (filterFin ? o.statusOp === "Finalizado" : o.statusOp !== "Finalizado"))
      .filter((o) => banco === "todos" || o.banco === banco)
      .filter((o) => status === "todos" || o.statusOp === status)
      .filter((o) => [o.id, o.cliente, o.contrato, o.gerente].some((v) => v.toLowerCase().includes(q.toLowerCase()))),
    [ops, q, banco, status, filterFin]
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, contrato ou gerente" className="pl-9" />
        </div>
        <Select value={banco} onValueChange={setBanco}>
          <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os bancos</SelectItem>
            {bancos.map((b) => <SelectItem key={b.id} value={b.nome}>{b.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {!filterFin && (
          <Button className="bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> Nova operação
          </Button>
        )}
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Operação</TableHead><TableHead>Cliente</TableHead><TableHead>Contrato</TableHead>
          <TableHead>Banco</TableHead><TableHead>Gerente</TableHead>
          <TableHead className="text-right">Contrato</TableHead>
          <TableHead className="text-right">Financiado</TableHead>
          <TableHead>Status</TableHead><TableHead>Prazo</TableHead>
          <TableHead className="text-center">Dias rest.</TableHead>
          <TableHead>Previsão lib.</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {list.map((o) => {
            const dias = diasRestantes(o.previsao);
            return (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs text-primary">{o.id}</TableCell>
                <TableCell className="font-medium">{o.cliente}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{o.contrato}</TableCell>
                <TableCell>{o.banco}</TableCell>
                <TableCell className="text-muted-foreground">{o.gerente}</TableCell>
                <TableCell className="text-right">{fmtBRL(o.valorContrato)}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(o.valorFinanciado)}</TableCell>
                <TableCell><StatusBadge status={o.statusOp} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{o.prazo > 0 ? `${o.prazo}d` : "—"}</TableCell>
                <TableCell className="text-center">
                  {dias > 0
                    ? <span className={dias <= 5 ? "font-semibold text-warning" : dias <= 15 ? "font-semibold text-info" : ""}>{dias}d</span>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{o.previsao}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => setEditing(o)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Replicar" onClick={() => toast.success("Operação replicada")}><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Finalizar" onClick={() => { updateOp(o.id, { statusOp: "Finalizado" }); toast.success("Operação finalizada"); }}><CheckCircle2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            );
          })}
          {list.length === 0 && (
            <TableRow><TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-2 h-6 w-6" /> Nenhuma operação encontrada
            </TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
        <span>{list.length} operações</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled>Anterior</Button>
          <Button variant="outline" size="sm">Próxima</Button>
        </div>
      </div>

      <EditOpDialog op={editing} onClose={() => setEditing(null)} onSave={(patch) => {
        if (editing) updateOp(editing.id, patch);
        setEditing(null);
        toast.success("Operação atualizada");
      }} />
    </Card>
  );
}

function EditOpDialog({
  op, onClose, onSave,
}: { op: FinOp | null; onClose: () => void; onSave: (patch: Partial<FinOp>) => void }) {
  const [form, setForm] = useState<Partial<FinOp>>({});
  useEffect(() => { setForm(op ?? {}); }, [op]);
  if (!op) return null;
  return (
    <Dialog open={!!op} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar operação {op.id}</DialogTitle>
          <DialogDescription>{op.cliente} · {op.contrato}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Banco</Label>
            <Select value={form.banco ?? op.banco} onValueChange={(v) => setForm({ ...form, banco: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{bancos.map((b) => <SelectItem key={b.id} value={b.nome}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Gerente</Label>
            <Select value={form.gerente ?? op.gerente} onValueChange={(v) => setForm({ ...form, gerente: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{gerentes.map((g) => <SelectItem key={g.id} value={g.nome}>{g.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.statusOp ?? op.statusOp} onValueChange={(v) => setForm({ ...form, statusOp: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Prazo (dias)</Label>
            <Input type="number" value={form.prazo ?? op.prazo} onChange={(e) => setForm({ ...form, prazo: Number(e.target.value) })} />
          </div>
          <div><Label>Valor financiado</Label>
            <Input type="number" value={form.valorFinanciado ?? op.valorFinanciado} onChange={(e) => setForm({ ...form, valorFinanciado: Number(e.target.value) })} />
          </div>
          <div><Label>Previsão liberação</Label>
            <Input type="date" value={form.previsao ?? op.previsao} onChange={(e) => setForm({ ...form, previsao: e.target.value })} />
          </div>
          <div className="col-span-2"><Label>Observações</Label>
            <Textarea value={form.obs ?? op.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Sem Contrato ---------------- */

function SemContratoTab() {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <div className="text-sm font-semibold">Operações sem contrato vinculado</div>
          <div className="text-xs text-muted-foreground">{finsSemContrato.length} operações · {fmtBRL(finsSemContrato.reduce((s, f) => s + f.valor, 0))}</div>
        </div>
        <Button className="bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> Novo financiamento avulso
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>ID</TableHead><TableHead>Cliente</TableHead><TableHead>CPF/CNPJ</TableHead>
          <TableHead>Banco</TableHead><TableHead>Gerente</TableHead>
          <TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {finsSemContrato.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-mono text-xs text-primary">{f.id}</TableCell>
              <TableCell className="font-medium">{f.cliente}</TableCell>
              <TableCell className="text-muted-foreground">{f.doc}</TableCell>
              <TableCell>{f.banco}</TableCell>
              <TableCell className="text-muted-foreground">{f.gerente}</TableCell>
              <TableCell className="text-right font-medium">{fmtBRL(f.valor)}</TableCell>
              <TableCell><StatusBadge status={f.statusOp} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => toast.success("Contrato vinculado")}>
                  <ArrowRight className="mr-1 h-3 w-3" /> Vincular contrato
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ---------------- Bancos ---------------- */

function BancosTab({ ops }: { ops: FinOp[] }) {
  const totalGeral = ops.reduce((s, o) => s + o.valorFinanciado, 0);
  const data = bancos.map((b) => {
    const lista = ops.filter((o) => o.banco === b.nome);
    return {
      ...b,
      qtd: lista.length,
      valor: lista.reduce((s, o) => s + o.valorFinanciado, 0),
      aprov: lista.filter((o) => ["Aprovado", "Liberado", "Finalizado"].includes(o.statusOp)).length,
      analise: lista.filter((o) => o.statusOp === "Em análise").length,
      liberado: lista.filter((o) => o.statusOp === "Liberado").length,
      tempo: Math.round(lista.filter((o) => o.prazo > 0).reduce((s, o) => s + o.prazo, 0) / Math.max(lista.filter((o) => o.prazo > 0).length, 1)),
    };
  });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((b, i) => (
          <Card key={b.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: COLORS[i % COLORS.length], color: "white" }}><Building2 className="h-5 w-5" /></div>
              <StatusBadge status={b.status} />
            </div>
            <div className="mt-4 text-lg font-semibold">{b.nome}</div>
            <div className="mt-1 text-xs text-muted-foreground">{b.qtd} operações · {pct(b.valor, totalGeral)}</div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-primary">{fmtBRL(b.valor)}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="font-bold text-success">{b.aprov}</div><div className="text-muted-foreground">Aprov.</div></div>
              <div><div className="font-bold text-info">{b.analise}</div><div className="text-muted-foreground">Análise</div></div>
              <div><div className="font-bold text-warning">{b.tempo}d</div><div className="text-muted-foreground">Tempo</div></div>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Participação por banco</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.map((b) => ({ name: b.nome, value: b.valor }))} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">BASA × SICREDI × Outros</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="aprov" stackId="a" fill="var(--chart-2)" radius={[0, 0, 0, 0]} name="Aprovados" />
              <Bar dataKey="analise" stackId="a" fill="var(--chart-3)" radius={[0, 0, 0, 0]} name="Em análise" />
              <Bar dataKey="liberado" stackId="a" fill="var(--chart-1)" radius={[6, 6, 0, 0]} name="Liberados" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

/* ---------------- Gerentes ---------------- */

function GerentesTab({ ops }: { ops: FinOp[] }) {
  const data = gerentes.map((g) => {
    const lista = ops.filter((o) => o.gerente === g.nome);
    const valor = lista.reduce((s, o) => s + o.valorFinanciado, 0);
    const aprov = lista.filter((o) => ["Aprovado", "Liberado", "Finalizado"].includes(o.statusOp)).length;
    const liberado = lista.filter((o) => o.statusOp === "Liberado").reduce((s, o) => s + o.valorFinanciado, 0);
    const pend = lista.filter((o) => ["Em análise", "Pendente banco", "Pendente cliente", "Aguardando documentação", "Aguardando liberação"].includes(o.statusOp)).length;
    const tempo = Math.round(lista.filter((o) => o.prazo > 0).reduce((s, o) => s + o.prazo, 0) / Math.max(lista.filter((o) => o.prazo > 0).length, 1));
    const taxa = lista.length > 0 ? Math.round((aprov / lista.length) * 100) : 0;
    return { ...g, qtd: lista.length, valor, aprov, liberado, pend, tempo, taxa };
  });

  return (
    <>
      <Card>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>#</TableHead><TableHead>Gerente</TableHead><TableHead>Banco</TableHead>
            <TableHead className="text-center">Op.</TableHead>
            <TableHead className="text-right">Valor total</TableHead>
            <TableHead className="text-right">Ticket</TableHead>
            <TableHead className="text-right">Taxa aprov.</TableHead>
            <TableHead className="text-right">Tempo</TableHead>
            <TableHead className="text-right">Liberado</TableHead>
            <TableHead className="text-right">Pend.</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {[...data].sort((a, b) => b.valor - a.valor).map((g, i) => (
              <TableRow key={g.id}>
                <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                <TableCell className="font-medium">{g.nome}</TableCell>
                <TableCell>{g.banco}</TableCell>
                <TableCell className="text-center">{g.qtd}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(g.valor)}</TableCell>
                <TableCell className="text-right">{fmtBRL(g.valor / Math.max(g.qtd, 1))}</TableCell>
                <TableCell className="text-right text-success">{g.taxa}%</TableCell>
                <TableCell className="text-right">{g.tempo}d</TableCell>
                <TableCell className="text-right text-success">{fmtBRL(g.liberado)}</TableCell>
                <TableCell className="text-right text-warning">{g.pend}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="mt-4 p-5">
        <div className="mb-3 text-sm font-semibold">Ranking visual por gerente</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis dataKey="nome" type="category" stroke="var(--muted-foreground)" fontSize={11} width={140} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Bar dataKey="valor" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}

/* ---------------- Previsão ---------------- */

function PrevisaoTab({ ops }: { ops: FinOp[] }) {
  const ativos = ops.filter((o) => !["Finalizado", "Cancelado"].includes(o.statusOp));
  const faixas = ["Até 7 dias", "8–15 dias", "16–30 dias", "31–60 dias", "61–90 dias", "Acima de 90 dias"];
  return (
    <div className="space-y-4">
      {faixas.map((faixa) => {
        const lista = ativos.filter((o) => faixaPrevisao(diasRestantes(o.previsao)) === faixa);
        const v = lista.reduce((s, o) => s + o.valorFinanciado, 0);
        return (
          <Card key={faixa}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <div className="text-sm font-semibold">{faixa}</div>
                <div className="text-xs text-muted-foreground">{lista.length} operações</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{fmtBRL(v)}</div>
              </div>
            </div>
            {lista.length > 0 && (
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent">
                  <TableHead>Operação</TableHead><TableHead>Cliente</TableHead><TableHead>Banco</TableHead>
                  <TableHead>Gerente</TableHead><TableHead className="text-right">Valor</TableHead>
                  <TableHead>Previsão</TableHead><TableHead className="text-center">Restantes</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lista.map((o) => {
                    const dias = diasRestantes(o.previsao);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs text-primary">{o.id}</TableCell>
                        <TableCell className="font-medium">{o.cliente}</TableCell>
                        <TableCell>{o.banco}</TableCell>
                        <TableCell className="text-muted-foreground">{o.gerente}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtBRL(o.valorFinanciado)}</TableCell>
                        <TableCell className="text-muted-foreground">{o.previsao}</TableCell>
                        <TableCell className="text-center">
                          <span className={dias <= 5 ? "font-semibold text-warning" : dias <= 15 ? "font-semibold text-info" : ""}>{dias}d</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        );
      })}
    </div>
  );
}
