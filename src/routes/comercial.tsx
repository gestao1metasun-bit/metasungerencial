import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, Search, FileText, CheckCircle2, Clock, XCircle,
  DollarSign, TrendingUp, Users, AlertTriangle, Target, Trash2, Percent, BarChart3,
  Zap, Sun, Filter, Activity, Award, Gauge,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line,
  ComposedChart, FunnelChart, Funnel, LabelList,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  contratos as contratosSeed, vendedores as vendedoresSeed, propostas as propostasSeed,
  evolucaoMensal, fmtBRL,
} from "@/lib/mock-data";

export const Route = createFileRoute("/comercial")({
  head: () => ({ meta: [{ title: "Comercial — Meta Sun Gerencial" }] }),
  component: ComercialPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

type Contrato = (typeof contratosSeed)[number] & { banco?: string; modulos?: number; obs?: string };
type Vendedor = (typeof vendedoresSeed)[number];
type Proposta = (typeof propostasSeed)[number];
export type VolumeMes = { id: string; mes: string; ano: number; qtd: number; valor: number };

function enrich(c: (typeof contratosSeed)[number]): Contrato {
  return { ...c, banco: "BASA", modulos: Math.round(c.kwp * 2), obs: "" };
}

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const volumeSeed: VolumeMes[] = [
  { id: "V-01", mes: "Jan", ano: 2026, qtd: 18, valor: 1240000 },
  { id: "V-02", mes: "Fev", ano: 2026, qtd: 22, valor: 1580000 },
  { id: "V-03", mes: "Mar", ano: 2026, qtd: 28, valor: 1920000 },
  { id: "V-04", mes: "Abr", ano: 2026, qtd: 33, valor: 2410000 },
  { id: "V-05", mes: "Mai", ano: 2026, qtd: 26, valor: 1850000 },
];

function ComercialPage() {
  const [tab, setTab] = useState("dashboard");
  const [contratos, setContratos] = useState<Contrato[]>(() => contratosSeed.map(enrich));
  const [propostas, setPropostas] = useState<Proposta[]>(propostasSeed);
  const [vendedoresList, setVendedoresList] = useState<Vendedor[]>(vendedoresSeed);
  const [volume, setVolume] = useState<VolumeMes[]>(volumeSeed);

  return (
    <>
      <PageHeader title="Comercial" subtitle="Propostas, contratos, vendedores e volume mensal." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="negociacao">Propostas & Contratos</TabsTrigger>
          <TabsTrigger value="volume">Volume Mensal</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="analise">Análise Executiva</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5">
          <DashboardComercial contratos={contratos} setContratos={setContratos} vendedoresList={vendedoresList} volume={volume} />
        </TabsContent>
        <TabsContent value="indicadores" className="mt-5">
          <IndicadoresTab contratos={contratos} vendedoresList={vendedoresList} propostas={propostas} volume={volume} />
        </TabsContent>
        <TabsContent value="negociacao" className="mt-5">
          <NegociacaoTab contratos={contratos} setContratos={setContratos} propostas={propostas} setPropostas={setPropostas} />
        </TabsContent>
        <TabsContent value="volume" className="mt-5">
          <VolumeMensalTab volume={volume} setVolume={setVolume} contratos={contratos} />
        </TabsContent>
        <TabsContent value="vendedores" className="mt-5">
          <VendedoresTab contratos={contratos} vendedoresList={vendedoresList} setVendedoresList={setVendedoresList} />
        </TabsContent>
        <TabsContent value="analise" className="mt-5">
          <AnaliseExecutivaTab contratos={contratos} vendedoresList={vendedoresList} volume={volume} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ---------------- DASHBOARD ---------------- */

function DashboardComercial({
  contratos, setContratos, vendedoresList, volume,
}: { contratos: Contrato[]; setContratos: (v: Contrato[]) => void; vendedoresList: Vendedor[]; volume: VolumeMes[] }) {
  const total = contratos.length;
  const valorTotal = contratos.reduce((s, c) => s + c.valor, 0);
  const assinados = contratos.filter((c) => c.status === "Assinado");
  const pendentes = contratos.filter((c) => c.status === "Pendente");
  const cancelados = contratos.filter((c) => c.status === "Cancelado");
  const valorAssinado = assinados.reduce((s, c) => s + c.valor, 0);
  const valorPend = pendentes.reduce((s, c) => s + c.valor, 0);
  const valorCanc = cancelados.reduce((s, c) => s + c.valor, 0);
  const ticket = valorAssinado / Math.max(assinados.length, 1);

  // Comparativo Propostas (volume cadastrado) × Contratos
  const totalPropostas = volume.reduce((s, v) => s + v.qtd, 0);
  const valorPropostas = volume.reduce((s, v) => s + v.valor, 0);
  const conversaoPct = (assinados.length / Math.max(totalPropostas, 1)) * 100;
  const conversaoValor = (valorAssinado / Math.max(valorPropostas, 1)) * 100;

  // Comparativo mensal (propostas vs assinados — usando volume + contratos por mês)
  const comparativo = useMemo(() => {
    return volume.map((v) => {
      const ass = contratos.filter((c) => {
        const m = new Date(c.data).getMonth();
        return c.status === "Assinado" && MESES[m] === v.mes;
      });
      const valAss = ass.reduce((s, c) => s + c.valor, 0);
      return {
        mes: v.mes,
        propostas: v.qtd,
        contratos: ass.length,
        valorPropostas: v.valor,
        valorContratos: valAss,
        conversao: v.qtd > 0 ? (ass.length / v.qtd) * 100 : 0,
      };
    });
  }, [volume, contratos]);

  const [openModal, setOpenModal] = useState<null | "gerados" | "assinados" | "pendentes" | "cancelados" | "valor" | "ticket">(null);

  const updateStatus = (id: string, status: string) => {
    setContratos(contratos.map((c) => (c.id === id ? { ...c, status } : c)));
    toast.success(`${id} → ${status}`);
  };

  return (
    <>
      {/* KPIs comparativos */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Propostas (mês a mês)</div>
          <div className="mt-1 flex items-baseline gap-2"><div className="text-2xl font-bold text-primary">{totalPropostas}</div><div className="text-xs text-muted-foreground">{fmtBRL(valorPropostas)}</div></div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contratos assinados</div>
          <div className="mt-1 flex items-baseline gap-2"><div className="text-2xl font-bold text-success">{assinados.length}</div><div className="text-xs text-muted-foreground">{fmtBRL(valorAssinado)}</div></div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversão (qtd)</div>
          <div className="mt-1 text-2xl font-bold text-info">{conversaoPct.toFixed(1)}%</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-info" style={{ width: `${Math.min(conversaoPct,100)}%` }} /></div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversão (valor)</div>
          <div className="mt-1 text-2xl font-bold text-primary">{conversaoValor.toFixed(1)}%</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(conversaoValor,100)}%` }} /></div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Contratos Gerados" value={total} hint={fmtBRL(valorTotal)} icon={FileText} tone="primary" trend={{ value: "100%", positive: true }} onView={() => setOpenModal("gerados")} />
        <StatCard label="Assinados" value={`${assinados.length} (${((assinados.length/Math.max(total,1))*100).toFixed(1)}%)`} hint={fmtBRL(valorAssinado)} icon={CheckCircle2} tone="success" onView={() => setOpenModal("assinados")} />
        <StatCard label="Pendentes" value={`${pendentes.length} (${((pendentes.length/Math.max(total,1))*100).toFixed(1)}%)`} hint={fmtBRL(valorPend)} icon={Clock} tone="warning" onView={() => setOpenModal("pendentes")} />
        <StatCard label="Cancelados" value={`${cancelados.length} (${((cancelados.length/Math.max(total,1))*100).toFixed(1)}%)`} hint={fmtBRL(valorCanc)} icon={XCircle} tone="destructive" onView={() => setOpenModal("cancelados")} />
        <StatCard label="Valor Assinado" value={fmtBRL(valorAssinado)} hint={`${assinados.length} contratos`} icon={DollarSign} tone="success" onView={() => setOpenModal("valor")} />
        <StatCard label="Ticket Médio" value={fmtBRL(ticket)} hint={`média ${assinados.length} assin.`} icon={TrendingUp} tone="info" onView={() => setOpenModal("ticket")} />
      </div>

      <DetailContratosModal
        open={openModal !== null}
        onClose={() => setOpenModal(null)}
        title={
          openModal === "assinados" ? "Contratos assinados" :
          openModal === "pendentes" ? "Contratos pendentes" :
          openModal === "cancelados" ? "Contratos cancelados" :
          openModal === "valor" ? "Ranking por valor assinado" :
          openModal === "ticket" ? "Análise de ticket médio" :
          "Todos os contratos gerados"
        }
        contratos={
          openModal === "assinados" ? assinados :
          openModal === "pendentes" ? pendentes :
          openModal === "cancelados" ? cancelados :
          openModal === "valor" ? [...assinados].sort((a, b) => b.valor - a.valor) :
          openModal === "ticket" ? assinados :
          contratos
        }
        showTicketSummary={openModal === "ticket"}
        onUpdateStatus={updateStatus}
      />

      {/* Comparativo Propostas × Contratos */}
      <Card className="mt-5 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-primary" /> Propostas × Contratos por mês</div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={comparativo}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${v.toFixed(0)}%`} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="propostas" fill="var(--chart-1)" radius={[4,4,0,0]} name="Propostas" />
            <Bar yAxisId="left" dataKey="contratos" fill="var(--chart-2)" radius={[4,4,0,0]} name="Contratos assinados" />
            <Line yAxisId="right" type="monotone" dataKey="conversao" stroke="var(--chart-5)" strokeWidth={2.5} name="Conversão %" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Top vendedores + meta */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Top vendedores</div>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>#</TableHead><TableHead>Vendedor</TableHead>
              <TableHead className="text-center">Contratos</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
              <TableHead className="text-right">kWp</TableHead>
              <TableHead className="text-right">Conv.</TableHead>
              <TableHead className="text-right">Part.</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {[...vendedoresList].sort((a,b)=>b.vendido-a.vendido).map((v, i) => {
                const part = (v.vendido / Math.max(vendedoresList.reduce((s,x)=>s+x.vendido,0),1)) * 100;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-bold text-primary">{i+1}</TableCell>
                    <TableCell className="font-medium">{v.nome}</TableCell>
                    <TableCell className="text-center">{v.contratos}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRL(v.vendido)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(v.vendido / Math.max(v.contratos,1))}</TableCell>
                    <TableCell className="text-right">{v.kwp.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{v.conversao}%</TableCell>
                    <TableCell className="text-right text-primary">{part.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Ranking visual</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vendedoresList.map(v => ({ nome: v.nome.split(" ")[0], valor: v.vendido }))} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="nome" type="category" stroke="var(--muted-foreground)" fontSize={11} width={70} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="valor" fill="var(--chart-1)" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <div className="mb-3 text-sm font-semibold">Valor vendido mensal</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={evolucaoMensal}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="vendido" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}

function DetailContratosModal({
  open, onClose, title, contratos, showTicketSummary, onUpdateStatus,
}: {
  open: boolean; onClose: () => void; title: string; contratos: Contrato[];
  showTicketSummary?: boolean; onUpdateStatus: (id: string, status: string) => void;
}) {
  const total = contratos.length;
  const valor = contratos.reduce((s,c)=>s+c.valor, 0);
  const ticket = valor / Math.max(total, 1);
  const maior = contratos.reduce((m,c)=>c.valor>m?c.valor:m, 0);
  const menor = contratos.reduce((m,c)=>c.valor<m?c.valor:m, contratos[0]?.valor ?? 0);

  return (
    <Dialog open={open} onOpenChange={(v)=>!v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {total} contrato{total!==1?"s":""} · Valor total {fmtBRL(valor)}
          </DialogDescription>
        </DialogHeader>

        {showTicketSummary && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Ticket médio</div><div className="text-lg font-bold text-primary">{fmtBRL(ticket)}</div></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Maior venda</div><div className="text-lg font-bold text-success">{fmtBRL(maior)}</div></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Menor venda</div><div className="text-lg font-bold">{fmtBRL(menor)}</div></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Contratos</div><div className="text-lg font-bold">{total}</div></div>
          </div>
        )}

        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
            <TableHead>Banco</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {contratos.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
                <TableCell className="font-medium">{c.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{c.vendedor}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
                <TableCell className="text-right">{c.kwp.toFixed(1)}</TableCell>
                <TableCell className="text-muted-foreground">{c.banco}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-muted-foreground">{c.data}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Select value={c.status} onValueChange={(v) => onUpdateStatus(c.id, v)}>
                    <SelectTrigger className="h-8 w-36 inline-flex"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gerado">Gerado</SelectItem>
                      <SelectItem value="Assinado">Assinado</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {total===0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhum contrato</TableCell></TableRow>}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- NEGOCIAÇÃO (Propostas + Contratos unificados) ---------------- */

type LinhaNeg = {
  tipo: "Proposta" | "Contrato";
  id: string; cliente: string; vendedor: string; valor: number; kwp: number;
  status: string; data: string;
};

function NegociacaoTab({
  contratos, setContratos, propostas, setPropostas,
}: {
  contratos: Contrato[]; setContratos: (v: Contrato[]) => void;
  propostas: Proposta[]; setPropostas: (v: Proposta[]) => void;
}) {
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "Proposta" | "Contrato">("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  const linhas = useMemo<LinhaNeg[]>(() => {
    const ps: LinhaNeg[] = propostas.map((p) => ({ tipo: "Proposta", id: p.id, cliente: p.cliente, vendedor: p.vendedor, valor: p.valor, kwp: p.kwp, status: p.status, data: p.data }));
    const cs: LinhaNeg[] = contratos.map((c) => ({ tipo: "Contrato", id: c.id, cliente: c.cliente, vendedor: c.vendedor, valor: c.valor, kwp: c.kwp, status: c.status, data: c.data }));
    return [...ps, ...cs].sort((a, b) => b.data.localeCompare(a.data));
  }, [propostas, contratos]);

  const allStatuses = useMemo(() => Array.from(new Set(linhas.map((l) => l.status))), [linhas]);

  const filtered = linhas.filter((l) =>
    (tipoFiltro === "todos" || l.tipo === tipoFiltro) &&
    (statusFiltro === "todos" || l.status === statusFiltro) &&
    [l.id, l.cliente, l.vendedor].some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );

  const totalPropostas = propostas.length;
  const valorPropostas = propostas.reduce((s, p) => s + p.valor, 0);
  const totalContratos = contratos.length;
  const valorContratos = contratos.reduce((s, c) => s + c.valor, 0);

  const updateStatus = (l: LinhaNeg, status: string) => {
    if (l.tipo === "Proposta") {
      setPropostas(propostas.map((p) => (p.id === l.id ? { ...p, status } : p)));
    } else {
      setContratos(contratos.map((c) => (c.id === l.id ? { ...c, status } : c)));
    }
    toast.success(`${l.id} → ${status}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Propostas" value={totalPropostas} hint={fmtBRL(valorPropostas)} icon={FileText} tone="info" />
        <StatCard label="Contratos" value={totalContratos} hint={fmtBRL(valorContratos)} icon={CheckCircle2} tone="primary" />
        <StatCard label="Conversão" value={`${((totalContratos / Math.max(totalPropostas + totalContratos, 1)) * 100).toFixed(1)}%`} hint="contratos / total" icon={Percent} tone="success" />
        <StatCard label="Ticket médio (geral)" value={fmtBRL((valorPropostas + valorContratos) / Math.max(totalPropostas + totalContratos, 1))} icon={TrendingUp} tone="warning" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por id, cliente ou vendedor" className="pl-9" />
          </div>
          <Select value={tipoFiltro} onValueChange={(v: "todos" | "Proposta" | "Contrato") => setTipoFiltro(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="Proposta">Propostas</SelectItem>
              <SelectItem value="Contrato">Contratos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Tipo</TableHead><TableHead>ID</TableHead><TableHead>Cliente</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
            <TableHead>Status</TableHead><TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={`${l.tipo}-${l.id}`}>
                <TableCell><span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${l.tipo === "Contrato" ? "bg-primary/15 text-primary" : "bg-info/15 text-info"}`}>{l.tipo}</span></TableCell>
                <TableCell className="font-mono text-xs text-primary">{l.id}</TableCell>
                <TableCell className="font-medium">{l.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{l.vendedor}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(l.valor)}</TableCell>
                <TableCell className="text-right">{l.kwp.toFixed(1)}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
                <TableCell className="text-muted-foreground">{l.data}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Select value={l.status} onValueChange={(v) => updateStatus(l, v)}>
                    <SelectTrigger className="h-8 w-40 inline-flex"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {l.tipo === "Contrato" ? (
                        <>
                          <SelectItem value="Gerado">Gerado</SelectItem>
                          <SelectItem value="Assinado">Assinado</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Em negociação">Em negociação</SelectItem>
                          <SelectItem value="Enviada">Enviada</SelectItem>
                          <SelectItem value="Aguardando retorno">Aguardando retorno</SelectItem>
                          <SelectItem value="Convertida">Convertida</SelectItem>
                          <SelectItem value="Fechada">Fechada</SelectItem>
                          <SelectItem value="Recusada">Recusada</SelectItem>
                          <SelectItem value="Perdida">Perdida</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>}
          </TableBody>
        </Table>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">{filtered.length} de {linhas.length} registros</div>
      </Card>
    </div>
  );
}

/* ---------------- VOLUME MENSAL ---------------- */

function VolumeMensalTab({
  volume, setVolume, contratos,
}: { volume: VolumeMes[]; setVolume: (v: VolumeMes[]) => void; contratos: Contrato[] }) {
  const totalQtd = volume.reduce((s, v) => s + v.qtd, 0);
  const totalValor = volume.reduce((s, v) => s + v.valor, 0);
  const ticket = totalValor / Math.max(totalQtd, 1);
  const assinados = contratos.filter((c) => c.status === "Assinado");
  const conv = (assinados.length / Math.max(totalQtd, 1)) * 100;

  const remove = (id: string) => { setVolume(volume.filter((v) => v.id !== id)); toast.success("Removido"); };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total propostas (mês a mês)" value={totalQtd} icon={FileText} tone="info" />
        <StatCard label="Valor total propostas" value={fmtBRL(totalValor)} icon={DollarSign} tone="primary" />
        <StatCard label="Ticket médio proposta" value={fmtBRL(ticket)} icon={TrendingUp} tone="warning" />
        <StatCard label="Conversão para contrato" value={`${conv.toFixed(1)}%`} hint={`${assinados.length} assinados`} icon={Percent} tone="success" />
      </div>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Volume mensal — quantidade × valor</div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={volume}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="qtd" fill="var(--chart-1)" radius={[4,4,0,0]} name="Qtd propostas" />
            <Line yAxisId="right" type="monotone" dataKey="valor" stroke="var(--chart-2)" strokeWidth={2.5} name="Valor total" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="text-sm font-semibold">Lançamentos mensais</div>
          <NovoVolumeDialog onSave={(v) => setVolume([...volume.filter((x) => !(x.mes === v.mes && x.ano === v.ano)), v].sort((a,b) => (a.ano - b.ano) || (MESES.indexOf(a.mes) - MESES.indexOf(b.mes))))} />
        </div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Mês</TableHead><TableHead>Ano</TableHead>
            <TableHead className="text-right">Qtd propostas</TableHead>
            <TableHead className="text-right">Valor total</TableHead>
            <TableHead className="text-right">Ticket médio</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {volume.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.mes}</TableCell>
                <TableCell className="text-muted-foreground">{v.ano}</TableCell>
                <TableCell className="text-right font-semibold">{v.qtd}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{fmtBRL(v.valor)}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.valor / Math.max(v.qtd, 1))}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {volume.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum lançamento</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function NovoVolumeDialog({ onSave }: { onSave: (v: VolumeMes) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mes: "Jan", ano: new Date().getFullYear(), qtd: "", valor: "" });
  const submit = () => {
    const qtd = Number(form.qtd);
    const valor = Number(form.valor);
    if (!qtd || qtd < 0 || valor < 0) { toast.error("Informe quantidade e valor válidos"); return; }
    onSave({ id: `V-${Date.now()}`, mes: form.mes, ano: Number(form.ano), qtd, valor });
    toast.success("Volume salvo");
    setForm({ mes: "Jan", ano: new Date().getFullYear(), qtd: "", valor: "" });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Lançar mês</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Lançar volume do mês</DialogTitle><DialogDescription>Cadastre quantidade total de propostas e o valor total do mês.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Mês</Label>
            <Select value={form.mes} onValueChange={(v) => setForm({ ...form, mes: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MESES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Ano</Label><Input type="number" value={form.ano} onChange={(e) => setForm({ ...form, ano: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Quantidade de propostas</Label><Input type="number" value={form.qtd} onChange={(e) => setForm({ ...form, qtd: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Valor total (R$)</Label><Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground" onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- VENDEDORES ---------------- */

function VendedoresTab({
  contratos, vendedoresList, setVendedoresList,
}: { contratos: Contrato[]; vendedoresList: Vendedor[]; setVendedoresList: (v: Vendedor[]) => void }) {
  const remove = (id: string) => { setVendedoresList(vendedoresList.filter((v) => v.id !== id)); toast.success("Vendedor removido"); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{vendedoresList.length} vendedor(es) cadastrado(s)</div>
        <NovoVendedorDialog onSave={(v) => setVendedoresList([...vendedoresList, v])} nextId={`VEN-${String(vendedoresList.length + 1).padStart(2, "0")}`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendedoresList.map((v) => {
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
            </Card>
          );
        })}
      </div>
    </div>
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
      <DialogContent className="max-w-lg">
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

/* ---------------- ANÁLISE EXECUTIVA ---------------- */

function AnaliseExecutivaTab({
  contratos, vendedoresList, volume,
}: { contratos: Contrato[]; vendedoresList: Vendedor[]; volume: VolumeMes[] }) {
  const total = contratos.reduce((s, c) => s + c.valor, 0);
  const mediaVendedor = vendedoresList.reduce((s,v)=>s+v.vendido,0) / Math.max(vendedoresList.length, 1);
  const baixo = vendedoresList.filter((v) => v.vendido < mediaVendedor);
  const pendentes = contratos.filter((c) => c.status === "Pendente");
  const totalPropostas = volume.reduce((s, v) => s + v.qtd, 0);
  const assinados = contratos.filter((c) => c.status === "Assinado").length;
  const conv = (assinados / Math.max(totalPropostas, 1)) * 100;
  const projecao = total * 1.12;

  const alertas: { tipo: "warning" | "destructive" | "info"; titulo: string; descricao: string }[] = [
    { tipo: "warning", titulo: `${baixo.length} vendedor(es) abaixo da média`, descricao: baixo.map(v=>v.nome).join(", ") || "—" },
    { tipo: "destructive", titulo: `${pendentes.length} contrato(s) pendente(s)`, descricao: pendentes.length>0 ? `Valor parado: ${fmtBRL(pendentes.reduce((s,c)=>s+c.valor,0))}` : "Sem pendências críticas" },
    { tipo: "info", titulo: `Conversão propostas → contratos: ${conv.toFixed(1)}%`, descricao: conv >= 60 ? "Acima da meta operacional" : "Abaixo da meta — revisar funil" },
    { tipo: "info", titulo: `Projeção próximos 30 dias`, descricao: `${fmtBRL(projecao)} (+12% vs período atual)` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {alertas.map((a, i) => (
          <Card key={i} className="p-4">
            <div className={`mb-2 inline-flex items-center gap-1 text-xs font-semibold ${a.tipo==="destructive"?"text-destructive":a.tipo==="warning"?"text-warning":"text-info"}`}>
              <AlertTriangle className="h-3.5 w-3.5" /> {a.titulo}
            </div>
            <div className="text-sm text-muted-foreground">{a.descricao}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Cumprimento de meta por vendedor</div>
        <div className="space-y-3">
          {[...vendedoresList].sort((a,b)=>b.vendido-a.vendido).map((v) => {
            const pct = (v.vendido / Math.max(v.meta, 1)) * 100;
            return (
              <div key={v.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{v.nome}</span>
                  <span className="text-muted-foreground">{fmtBRL(v.vendido)} / {fmtBRL(v.meta)} <span className={`ml-2 font-semibold ${pct>=100?"text-success":pct>=80?"text-info":"text-warning"}`}>{pct.toFixed(0)}%</span></span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${pct>=100?"bg-success":pct>=80?"bg-info":"bg-warning"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Tendência mensal — valor vendido</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={evolucaoMensal}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="vendido" stroke="var(--chart-1)" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ---------------- INDICADORES (KPIs avançados) ---------------- */

const STATUS_COLORS: Record<string, string> = {
  Assinado: "var(--chart-2)",
  Pendente: "var(--chart-4)",
  Cancelado: "var(--chart-5)",
  Gerado: "var(--chart-1)",
};

// Série multi-ano simulada (2024 / 2025 / 2026 c/ projeção)
const SERIE_ANOS: { mes: string; "2024": number; "2025": number; "2026": number; projecao?: number }[] = [
  { mes: "Jan", "2024": 720000, "2025": 940000, "2026": 1240000 },
  { mes: "Fev", "2024": 810000, "2025": 1020000, "2026": 1580000 },
  { mes: "Mar", "2024": 880000, "2025": 1180000, "2026": 1920000 },
  { mes: "Abr", "2024": 960000, "2025": 1340000, "2026": 2410000 },
  { mes: "Mai", "2024": 1010000, "2025": 1420000, "2026": 1850000 },
  { mes: "Jun", "2024": 1090000, "2025": 1510000, "2026": 0, projecao: 2050000 },
  { mes: "Jul", "2024": 1180000, "2025": 1620000, "2026": 0, projecao: 2180000 },
  { mes: "Ago", "2024": 1240000, "2025": 1680000, "2026": 0, projecao: 2310000 },
  { mes: "Set", "2024": 1320000, "2025": 1740000, "2026": 0, projecao: 2440000 },
  { mes: "Out", "2024": 1410000, "2025": 1820000, "2026": 0, projecao: 2580000 },
  { mes: "Nov", "2024": 1490000, "2025": 1910000, "2026": 0, projecao: 2720000 },
  { mes: "Dez", "2024": 1580000, "2025": 2040000, "2026": 0, projecao: 2890000 },
];

function IndicadoresTab({
  contratos, vendedoresList, propostas, volume,
}: { contratos: Contrato[]; vendedoresList: Vendedor[]; propostas: Proposta[]; volume: VolumeMes[] }) {
  // === KPIs PRINCIPAIS ===
  const gerados = contratos;
  const assinados = contratos.filter((c) => c.status === "Assinado");
  const pendentes = contratos.filter((c) => c.status === "Pendente");
  const cancelados = contratos.filter((c) => c.status === "Cancelado");

  const sumValor = (arr: Contrato[]) => arr.reduce((s, c) => s + c.valor, 0);
  const sumKwp = (arr: Contrato[]) => arr.reduce((s, c) => s + c.kwp, 0);
  const sumModulos = (arr: Contrato[]) => arr.reduce((s, c) => s + (c.modulos ?? Math.round(c.kwp * 2)), 0);

  const totalGer = gerados.length;
  const valorGer = sumValor(gerados);
  const kwpGer = sumKwp(gerados);
  const kwhGer = kwpGer * 130 * 12; // estimativa kWh/ano (130 kWh/kWp.mês)

  const valorAss = sumValor(assinados);
  const kwpAss = sumKwp(assinados);
  const valorPend = sumValor(pendentes);
  const valorCanc = sumValor(cancelados);

  const pctAss = (assinados.length / Math.max(totalGer, 1)) * 100;
  const pctPend = (pendentes.length / Math.max(totalGer, 1)) * 100;
  const pctCanc = (cancelados.length / Math.max(totalGer, 1)) * 100;
  const ticket = valorAss / Math.max(assinados.length, 1);

  // === KPIs TÉCNICO/ENERGÉTICO ===
  const modulosTotal = sumModulos(assinados);
  const inversoresMedia = assinados.length > 0 ? (assinados.reduce((s, c) => s + Math.max(1, Math.ceil(c.kwp / 15)), 0) / assinados.length) : 0;
  const modulosMedia = modulosTotal / Math.max(assinados.length, 1);
  const potenciaMedia = kwpAss / Math.max(assinados.length, 1);
  const ticketKwp = valorAss / Math.max(kwpAss, 1);
  const valorPorModulo = valorAss / Math.max(modulosTotal, 1);
  const valorPorInversor = valorAss / Math.max(Math.ceil(inversoresMedia * assinados.length), 1);

  // Crescimento mensal/anual (com base em SERIE_ANOS)
  const ult2025 = SERIE_ANOS.reduce((s, m) => s + m["2025"], 0);
  const ult2024 = SERIE_ANOS.reduce((s, m) => s + m["2024"], 0);
  const ult2026Real = SERIE_ANOS.reduce((s, m) => s + m["2026"], 0);
  const cresAnual = ((ult2025 - ult2024) / Math.max(ult2024, 1)) * 100;
  const cresMensal = (() => {
    const meses = SERIE_ANOS.filter((m) => m["2026"] > 0);
    if (meses.length < 2) return 0;
    const ult = meses[meses.length - 1]["2026"];
    const pen = meses[meses.length - 2]["2026"];
    return ((ult - pen) / Math.max(pen, 1)) * 100;
  })();

  // Sazonalidade (média mensal 2024+2025)
  const sazonalidade = SERIE_ANOS.map((m) => ({ mes: m.mes, media: (m["2024"] + m["2025"]) / 2 }));

  // === KPIs POR VENDEDOR ===
  const porVendedor = vendedoresList.map((v) => {
    const meus = contratos.filter((c) => c.vendedor === v.nome);
    const ass = meus.filter((c) => c.status === "Assinado");
    const propsV = propostas.filter((p) => p.vendedor === v.nome);
    const valor = sumValor(ass);
    const kwp = sumKwp(ass);
    const ticketV = valor / Math.max(ass.length, 1);
    const conv = (ass.length / Math.max(propsV.length + ass.length, 1)) * 100;
    const maior = ass.reduce((m, c) => (c.valor > m ? c.valor : m), 0);
    const menor = ass.reduce((m, c) => (m === 0 || c.valor < m ? c.valor : m), 0);
    return { nome: v.nome, primeiro: v.nome.split(" ")[0], qtd: ass.length, valor, kwp, ticket: ticketV, conv, maior, menor, tempoMedio: 14 + Math.round(Math.random() * 12) };
  });
  const tempoMedioGeral = porVendedor.reduce((s, v) => s + v.tempoMedio, 0) / Math.max(porVendedor.length, 1);

  // === FUNIL ===
  const totalPropostas = volume.reduce((s, v) => s + v.qtd, 0) || propostas.length;
  const funil = [
    { name: "Propostas", value: totalPropostas, fill: "var(--chart-1)" },
    { name: "Gerados", value: totalGer, fill: "var(--chart-3)" },
    { name: "Pendentes", value: pendentes.length, fill: "var(--chart-4)" },
    { name: "Assinados", value: assinados.length, fill: "var(--chart-2)" },
    { name: "Cancelados", value: cancelados.length, fill: "var(--chart-5)" },
  ];

  // === PIZZA STATUS ===
  const pizza = [
    { name: "Assinados", value: assinados.length, fill: STATUS_COLORS.Assinado },
    { name: "Pendentes", value: pendentes.length, fill: STATUS_COLORS.Pendente },
    { name: "Cancelados", value: cancelados.length, fill: STATUS_COLORS.Cancelado },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-5">
      {/* === KPIs PRINCIPAIS === */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><BarChart3 className="h-3.5 w-3.5 text-primary" /> KPIs Principais</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiBlock tone="primary" icon={FileText} label="Contratos Gerados" main={totalGer} sub={fmtBRL(valorGer)} extra={`${kwpGer.toFixed(1)} kWp · ${(kwhGer/1000).toFixed(0)} MWh/ano`} />
          <KpiBlock tone="success" icon={CheckCircle2} label="Assinados" main={assinados.length} sub={fmtBRL(valorAss)} extra={`${pctAss.toFixed(1)}% sobre gerados`} />
          <KpiBlock tone="warning" icon={Clock} label="Pendentes" main={pendentes.length} sub={fmtBRL(valorPend)} extra={`${pctPend.toFixed(1)}% sobre gerados`} />
          <KpiBlock tone="destructive" icon={XCircle} label="Cancelados" main={cancelados.length} sub={fmtBRL(valorCanc)} extra={`${pctCanc.toFixed(1)}% cancelamento`} />
          <KpiBlock tone="info" icon={TrendingUp} label="Ticket Médio" main={fmtBRL(ticket)} sub={`${assinados.length} assinados`} extra="por contrato assinado" />
        </div>
      </div>

      {/* === KPIs TÉCNICO/ENERGÉTICO === */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Sun className="h-3.5 w-3.5 text-warning" /> KPIs Técnico/Energético</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiSmall icon={Zap} label="kWp total vendido" value={`${kwpAss.toFixed(1)} kWp`} />
          <KpiSmall icon={Sun} label="kWh projetado/ano" value={`${(kwpAss * 130 * 12 / 1000).toFixed(1)} MWh`} />
          <KpiSmall icon={Activity} label="Módulos / contrato" value={modulosMedia.toFixed(1)} />
          <KpiSmall icon={Activity} label="Inversores / contrato" value={inversoresMedia.toFixed(1)} />
          <KpiSmall icon={Gauge} label="Potência média" value={`${potenciaMedia.toFixed(1)} kWp`} />
          <KpiSmall icon={DollarSign} label="Ticket por kWp" value={fmtBRL(ticketKwp)} />
          <KpiSmall icon={DollarSign} label="Valor por módulo" value={fmtBRL(valorPorModulo)} />
          <KpiSmall icon={DollarSign} label="Valor por inversor" value={fmtBRL(valorPorInversor)} />
          <KpiSmall icon={TrendingUp} label="Crescimento mensal" value={`${cresMensal>=0?"+":""}${cresMensal.toFixed(1)}%`} positive={cresMensal>=0} />
          <KpiSmall icon={TrendingUp} label="Crescimento anual" value={`${cresAnual>=0?"+":""}${cresAnual.toFixed(1)}%`} positive={cresAnual>=0} />
          <KpiSmall icon={Activity} label="Vendido 2026 (real)" value={fmtBRL(ult2026Real)} />
          <KpiSmall icon={Clock} label="Tempo médio fechamento" value={`${tempoMedioGeral.toFixed(0)} dias`} />
        </div>
      </div>

      {/* === FUNIL + PIZZA === */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4 text-primary" /> Funil Comercial</div>
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Funnel dataKey="value" data={funil} isAnimationActive>
                <LabelList position="right" fill="var(--foreground)" stroke="none" dataKey="name" fontSize={12} />
                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={13} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Percent className="h-4 w-4 text-primary" /> Distribuição por Status</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} label={(e: { name: string; percent: number }) => `${e.name} ${(e.percent*100).toFixed(0)}%`}>
                {pizza.map((p, i) => <Cell key={i} fill={p.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* === EVOLUÇÃO MULTI-ANO === */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Evolução Mensal — 2024 · 2025 · 2026 (com projeção)</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={SERIE_ANOS}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="2024" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="2025" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="2026" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="projecao" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Projeção 2026" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* === SAZONALIDADE === */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> Sazonalidade — média mensal (2024-2025)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sazonalidade}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Bar dataKey="media" fill="var(--chart-3)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* === BARRAS POR VENDEDOR (valor / contratos / kWp) === */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Performance por Vendedor</div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={porVendedor}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="primeiro" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="valor" fill="var(--chart-1)" name="Valor R$" radius={[4,4,0,0]} />
            <Bar yAxisId="right" dataKey="qtd" fill="var(--chart-2)" name="Contratos" radius={[4,4,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="kwp" stroke="var(--chart-4)" strokeWidth={2.5} name="kWp" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* === TABELA DETALHADA POR VENDEDOR === */}
      <Card>
        <div className="border-b border-border p-4 text-sm font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Indicadores por Vendedor</div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-center">Qtd</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">kWp</TableHead>
            <TableHead className="text-right">Ticket médio</TableHead>
            <TableHead className="text-right">Conversão</TableHead>
            <TableHead className="text-right">Maior venda</TableHead>
            <TableHead className="text-right">Menor venda</TableHead>
            <TableHead className="text-right">Tempo médio</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {porVendedor.map((v) => (
              <TableRow key={v.nome}>
                <TableCell className="font-medium">{v.nome}</TableCell>
                <TableCell className="text-center">{v.qtd}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{fmtBRL(v.valor)}</TableCell>
                <TableCell className="text-right">{v.kwp.toFixed(1)}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.ticket)}</TableCell>
                <TableCell className="text-right text-info">{v.conv.toFixed(1)}%</TableCell>
                <TableCell className="text-right text-success">{fmtBRL(v.maior)}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.menor)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{v.tempoMedio} dias</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function KpiBlock({
  tone, icon: Icon, label, main, sub, extra, onView,
}: { tone: "primary"|"success"|"warning"|"destructive"|"info"; icon: React.ComponentType<{ className?: string }>; label: string; main: React.ReactNode; sub?: string; extra?: string; onView?: () => void }) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
    info: "text-info bg-info/10",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          {onView && <EyeButton onClick={onView} />}
        </div>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${toneClass}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-2 text-2xl font-bold leading-tight">{main}</div>
      {sub && <div className="mt-0.5 text-sm font-medium text-muted-foreground">{sub}</div>}
      {extra && <div className="mt-1 text-[11px] text-muted-foreground">{extra}</div>}
    </Card>
  );
}

function KpiSmall({
  icon: Icon, label, value, positive,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; positive?: boolean }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-1 text-base font-bold ${positive===undefined?"":positive?"text-success":"text-destructive"}`}>{value}</div>
    </Card>
  );
}
