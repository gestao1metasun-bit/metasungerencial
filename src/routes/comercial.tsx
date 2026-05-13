import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, Search, FileText, CheckCircle2, Clock, XCircle,
  DollarSign, TrendingUp, Users, AlertTriangle, Target, Trash2, Percent, BarChart3,
  Zap, Sun, Filter, Activity, Award, Gauge, Pencil, Layers, History, MapPin,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line,
  ComposedChart, FunnelChart, Funnel, LabelList,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { EyeButton } from "@/components/app/EyeButton";
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
import { addPendencia } from "@/lib/fin-pendencias";
import { appendLancamentos, readLancamentos, updateLancamento, removeLancamentosDoProjeto, type Lancamento } from "@/lib/financeiro-store";
import { useNaturezas } from "@/lib/financeiro-store";
import {
  contratos as contratosSeed, vendedores as vendedoresSeed, propostas as propostasSeed,
  evolucaoMensal, fmtBRL, estoqueItens,
} from "@/lib/mock-data";
import {
  useContratos, setContratos as storeSetContratos, upsertContrato, updateContratoAudit,
  addProjeto, updateProjeto, removeProjeto, buscarCEP,
  validateContratoCompleto, solicitarAlteracaoContrato,
  setComposicaoPagto, composicaoSomaOk, aprovarProjeto, calcularLancamentosProjeto,
  type ContratoFull, type ClienteFull, type ProjetoVinculado,
  type ParcelaPagto, type FormaPagamento, type ComposicaoLinha,
} from "@/lib/contratos-store";
import { useClientesFull, addClienteFull, type ClienteRecord } from "@/lib/clientes-store";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/comercial")({
  head: () => ({ meta: [{ title: "Comercial — Meta Sun Gerencial" }] }),
  component: ComercialPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/* ---------------- Máscaras / formatadores ---------------- */
const onlyDigits = (v: string) => v.replace(/\D/g, "");
function maskDoc(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    // CPF 000.000.000-00
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  // CNPJ 00.000.000/0000-00
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}
function maskTel(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^\((\d{2})\) (\d{4})(\d)/, "($1) $2-$3");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^\((\d{2})\) (\d{5})(\d)/, "($1) $2-$3");
}
const isDocValid = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 11 || d.length === 14;
};
const isTelValid = (v: string) => onlyDigits(v).length === 11;

type Contrato = ContratoFull;
type Vendedor = (typeof vendedoresSeed)[number];
type Proposta = (typeof propostasSeed)[number];
export type VolumeMes = { id: string; mes: string; ano: number; qtd: number; valor: number };

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
  const contratos = useContratos();
  const setContratos = (next: Contrato[] | ((p: Contrato[]) => Contrato[])) => {
    const v = typeof next === "function" ? (next as any)(contratos) : next;
    storeSetContratos(v);
  };
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
          <TabsTrigger value="cad-proposta">Cadastrar Proposta</TabsTrigger>
          <TabsTrigger value="cad-contrato">Cadastrar Contrato</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos de venda</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="analise">Análise Executiva</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5">
          <DashboardComercial contratos={contratos} setContratos={setContratos} vendedoresList={vendedoresList} volume={volume} />
        </TabsContent>
        <TabsContent value="indicadores" className="mt-5">
          <IndicadoresTab contratos={contratos} vendedoresList={vendedoresList} propostas={propostas} volume={volume} />
        </TabsContent>
        <TabsContent value="cad-proposta" className="mt-5">
          <VolumeMensalTab volume={volume} setVolume={setVolume} contratos={contratos} />
        </TabsContent>
        <TabsContent value="cad-contrato" className="mt-5">
          <CadastrarContratoTab contratos={contratos} setContratos={setContratos} vendedoresList={vendedoresList} />
        </TabsContent>
        <TabsContent value="pedidos" className="mt-5">
          <PedidosVendaTab contratos={contratos} />
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

/* ---------------- CADASTRAR CONTRATO ---------------- */

function nextContratoId(contratos: Contrato[]): string {
  const ano = new Date().getFullYear();
  const sufixo = `/${ano}`;
  const nums = contratos
    .map((c) => {
      // suporta tanto novo formato "090/2026" quanto antigo "CT-2026-0143"
      const m = c.id.match(/^(\d{1,4})\s*\/\s*\d{4}$/) ?? c.id.match(/(\d+)\s*$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${String(next).padStart(3, "0")}${sufixo}`;
}

/** Faixas de comissão definidas pelo parâmetro (R$/kWp). */
function comissaoFromParametro(parametro: number): { pct: number | null; aprovacao: boolean } {
  if (!isFinite(parametro) || parametro <= 0) return { pct: null, aprovacao: false };
  if (parametro < 2000) return { pct: null, aprovacao: true };
  if (parametro <= 2100) return { pct: 3, aprovacao: false };
  if (parametro <= 2300) return { pct: 4, aprovacao: false };
  if (parametro <= 2449) return { pct: 5, aprovacao: false };
  return { pct: 6, aprovacao: false };
}

/* ---------------- CLIENTE PICKER + NOVO CLIENTE ---------------- */

function ClientePicker({ value, onPick }: { value?: string; onPick: (c: ClienteRecord) => void }) {
  const clientes = useClientesFull();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clientes.slice(0, 10);
    return clientes.filter((c) =>
      c.nome.toLowerCase().includes(s) ||
      (c.doc ?? "").toLowerCase().includes(s) ||
      (c.cidade ?? "").toLowerCase().includes(s),
    ).slice(0, 20);
  }, [q, clientes]);
  const selecionado = clientes.find((c) => c.id === value);

  return (
    <>
      <div className="space-y-1.5">
        <Label>Cliente *</Label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={open ? q : (selecionado?.nome ?? q)}
              placeholder="Buscar cliente por nome, CPF/CNPJ ou cidade…"
              onFocus={() => setOpen(true)}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
            />
            {open && filtrados.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {filtrados.map((c) => (
                  <button
                    type="button" key={c.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onPick(c); setOpen(false); setQ(""); }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {c.doc || "—"} · {c.cidade}/{c.uf} · {c.telefone || "—"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => setNovoOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </div>
      <NovoClienteDialog open={novoOpen} onClose={() => setNovoOpen(false)} onCreated={(c) => { onPick(c); setNovoOpen(false); }} />
    </>
  );
}

function NovoClienteDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: ClienteRecord) => void }) {
  const [f, setF] = useState({
    nome: "", doc: "", telefone: "", email: "",
    cep: "", rua: "", numero: "", bairro: "", complemento: "", cidade: "", uf: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const lookupCEP = async (cep: string) => {
    set("cep", cep);
    if (cep.replace(/\D/g, "").length !== 8) return;
    const r = await buscarCEP(cep);
    if (r) setF((p) => ({ ...p, rua: r.rua ?? p.rua, bairro: r.bairro ?? p.bairro, cidade: r.cidade ?? p.cidade, uf: r.uf ?? p.uf }));
  };
  const salvar = () => {
    if (!f.nome.trim()) { toast.error("Informe o nome"); return; }
    if (f.doc && !isDocValid(f.doc)) { toast.error("CPF/CNPJ inválido"); return; }
    if (f.telefone && !isTelValid(f.telefone)) { toast.error("Telefone inválido"); return; }
    const c = addClienteFull({ ...f, nome: f.nome.trim() });
    toast.success(`Cliente cadastrado: ${c.nome}`);
    onCreated(c);
    setF({ nome: "", doc: "", telefone: "", email: "", cep: "", rua: "", numero: "", bairro: "", complemento: "", cidade: "", uf: "" });
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Cadastro rápido. E-mail é opcional.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2"><Label>Nome / Razão social *</Label>
            <Input value={f.nome} onChange={(e) => set("nome", e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label>CPF / CNPJ *</Label>
            <Input value={f.doc} onChange={(e) => set("doc", maskDoc(e.target.value))} maxLength={18} />
          </div>
          <div className="space-y-1.5"><Label>Telefone *</Label>
            <Input value={f.telefone} onChange={(e) => set("telefone", maskTel(e.target.value))} maxLength={15} />
          </div>
          <div className="space-y-1.5 md:col-span-2"><Label>E-mail (opcional)</Label>
            <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label>CEP</Label>
            <Input value={f.cep} onChange={(e) => lookupCEP(e.target.value)} maxLength={10} />
          </div>
          <div className="space-y-1.5 md:col-span-2"><Label>Rua</Label>
            <Input value={f.rua} onChange={(e) => set("rua", e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label>Número</Label>
            <Input value={f.numero} onChange={(e) => set("numero", e.target.value)} maxLength={10} />
          </div>
          <div className="space-y-1.5"><Label>Bairro</Label>
            <Input value={f.bairro} onChange={(e) => set("bairro", e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label>Cidade</Label>
            <Input value={f.cidade} onChange={(e) => set("cidade", e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label>UF</Label>
            <Input value={f.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} maxLength={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="bg-primary text-primary-foreground">Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- COMPOSIÇÃO DE PAGAMENTO ---------------- */

function ComposicaoEditor({
  valorContrato, value, onChange, disabled,
}: {
  valorContrato: number;
  value: ComposicaoLinha[];
  onChange: (next: ComposicaoLinha[]) => void;
  disabled?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const linhas = value ?? [];
  const soma = linhas.reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const diff = valorContrato - soma;
  const bate = Math.abs(diff) <= 0.5 && linhas.length > 0;

  const addLinha = () => {
    const nova: ComposicaoLinha = {
      id: `CP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      formaPagamento: "Pix", valor: 0, parcelas: 1,
      dataPrevista: today, competencia: today.slice(0, 7),
    };
    onChange([...linhas, nova]);
  };
  const setL = (id: string, patch: Partial<ComposicaoLinha>) =>
    onChange(linhas.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const del = (id: string) => onChange(linhas.filter((l) => l.id !== id));
  const distribuir = () => {
    if (linhas.length === 0 || valorContrato <= 0) return;
    const each = Math.round((valorContrato / linhas.length) * 100) / 100;
    const last = Math.round((valorContrato - each * (linhas.length - 1)) * 100) / 100;
    onChange(linhas.map((l, i) => ({ ...l, valor: i === linhas.length - 1 ? last : each })));
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Composição de pagamento</span>
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={distribuir}>Distribuir</Button>
            <Button type="button" size="sm" onClick={addLinha} className="bg-primary text-primary-foreground"><Plus className="mr-1 h-3.5 w-3.5" /> Linha</Button>
          </div>
        )}
      </div>
      {linhas.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">Adicione ao menos 1 linha (forma + valor + previsão).</div>
      ) : (
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Forma</TableHead>
            <TableHead className="text-right">Valor (R$)</TableHead>
            <TableHead className="text-right">Parcelas</TableHead>
            <TableHead>Previsão</TableHead>
            <TableHead>Competência</TableHead>
            <TableHead>Obs.</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Select value={l.formaPagamento} onValueChange={(v) => setL(l.id, { formaPagamento: v as FormaPagamento })} disabled={disabled}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Pix","Boleto","Cartão","Transferência","Dinheiro","Financiamento"] as FormaPagamento[]).map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input type="number" className="h-8 text-right" value={l.valor} onChange={(e) => setL(l.id, { valor: Number(e.target.value) || 0 })} disabled={disabled} /></TableCell>
                <TableCell><Input type="number" min={1} className="h-8 text-right w-20" value={l.parcelas} onChange={(e) => setL(l.id, { parcelas: Math.max(1, Number(e.target.value) || 1) })} disabled={disabled} /></TableCell>
                <TableCell><Input type="date" className="h-8" value={l.dataPrevista} onChange={(e) => setL(l.id, { dataPrevista: e.target.value, competencia: e.target.value.slice(0, 7) })} disabled={disabled} /></TableCell>
                <TableCell><Input type="month" className="h-8" value={l.competencia} onChange={(e) => setL(l.id, { competencia: e.target.value })} disabled={disabled} /></TableCell>
                <TableCell><Input className="h-8" value={l.observacao ?? ""} onChange={(e) => setL(l.id, { observacao: e.target.value })} disabled={disabled} /></TableCell>
                <TableCell>
                  {!disabled && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className={`rounded-md border p-2 text-xs flex flex-wrap items-center justify-between gap-2 ${bate ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Contrato: <b className="font-mono">{fmtBRL(valorContrato)}</b></span>
          <span>Soma composição: <b className="font-mono">{fmtBRL(soma)}</b></span>
          <span className={bate ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>
            Diferença: <b className="font-mono">{fmtBRL(Math.abs(diff))}</b> {bate ? "✓ OK" : (diff > 0 ? "(falta)" : "(excesso)")}
          </span>
        </div>
        {!bate && <span className="text-destructive">Aprovação financeira bloqueada até bater.</span>}
      </div>
    </div>
  );
}

function CadastrarContratoTab({
  contratos, setContratos, vendedoresList,
}: { contratos: Contrato[]; setContratos: (c: Contrato[]) => void; vendedoresList: Vendedor[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const proximo = nextContratoId(contratos);
  const emptyCliente: ClienteFull = {
    nome: "", doc: "", telefone: "", telefone2: "", email: "",
    cep: "", rua: "", numero: "", bairro: "", complemento: "", cidade: "", uf: "",
  };
  const [form, setForm] = useState({
    dataCadastro: today, dataAssinatura: "",
    valor: "", vendedor: "",
    modulosContrato: "", potenciaContrato: "550",
    inv1: "", inv2: "", inv3: "", inv4: "", inv5: "", inv6: "",
    pagamento: "", banco: "", obs: "",
  });
  const [cli, setCli] = useState<ClienteFull>(emptyCliente);
  const [clienteId, setClienteId] = useState<string>("");
  const [composicao, setComposicao] = useState<ComposicaoLinha[]>([]);
  const [cepLoading, setCepLoading] = useState(false);

  const setCliField = (k: keyof ClienteFull, v: string) => setCli((p) => ({ ...p, [k]: v }));
  const lookupCEP = async (cep: string) => {
    setCliField("cep", cep);
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    const r = await buscarCEP(cep);
    setCepLoading(false);
    if (r) {
      setCli((p) => ({ ...p, ...r } as ClienteFull));
      toast.success("Endereço preenchido pelo CEP");
    } else { toast.error("CEP não encontrado"); }
  };

  const pickCliente = (c: ClienteRecord) => {
    setClienteId(c.id);
    setCli({
      nome: c.nome, doc: c.doc ?? "", telefone: c.telefone ?? "", telefone2: "",
      email: c.email ?? "",
      cep: c.cep ?? "", rua: c.rua ?? "", numero: c.numero ?? "", bairro: c.bairro ?? "",
      complemento: c.complemento ?? "", cidade: c.cidade ?? "", uf: c.uf ?? "",
    });
    toast.success(`Cliente ${c.nome} selecionado`);
  };

  const valorNum = Number(form.valor) || 0;
  const modulosNum = Number(form.modulosContrato) || 0;
  const potenciaNum = Number(form.potenciaContrato) || 0;
  const kwpEsperado = (modulosNum * potenciaNum) / 1000;
  const parametroNum = kwpEsperado > 0 ? valorNum / kwpEsperado : 0;
  const parametroFmt = parametroNum > 0 ? String(Math.round(parametroNum)) : "";
  const { pct: comissaoPct, aprovacao } = comissaoFromParametro(parametroNum);
  const comissaoValor = comissaoPct != null ? (valorNum * comissaoPct) / 100 : 0;

  const [openForm, setOpenForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"cliente" | "contrato" | "pagamento">("cliente");

  const limpar = () => {
    setForm({
      dataCadastro: today, dataAssinatura: "", valor: "", vendedor: "",
      modulosContrato: "", potenciaContrato: "550",
      inv1: "", inv2: "", inv3: "", inv4: "", inv5: "", inv6: "",
      pagamento: "", banco: "", obs: "",
    });
    setCli(emptyCliente);
    setClienteId("");
    setComposicao([]);
    setActiveTab("cliente");
  };

  const buildContrato = (): Contrato => {
    const novoId = nextContratoId(contratos);
    return {
      id: novoId,
      cliente: cli.nome.trim() || "—",
      clienteId: clienteId || undefined,
      vendedor: form.vendedor,
      valor: valorNum,
      kwp: kwpEsperado,
      status: "Pendente de informações",
      data: form.dataCadastro || today,
      pagamento: form.pagamento,
      banco: form.banco,
      modulos: modulosNum,
      obs: form.obs,
      potencia: potenciaNum,
      inv1: form.inv1, inv2: form.inv2, inv3: form.inv3,
      inv4: form.inv4, inv5: form.inv5, inv6: form.inv6,
      parametro: parametroFmt,
      dataCadastro: form.dataCadastro || today,
      dataAssinatura: form.dataAssinatura,
      comissaoPct: comissaoPct ?? 0,
      comissaoValor,
      clienteFull: { ...cli, nome: cli.nome.trim() },
      projetos: [],
      composicaoPagto: composicao,
      auditoria: [{
        id: `A-${Date.now()}`, data: new Date().toISOString(),
        usuario: "Operador", campo: "criação", de: "", para: novoId,
      }],
    };
  };

  // Validação ao vivo (para mostrar pendências e travar botão)
  const previewContrato = buildContrato();
  const validation = validateContratoCompleto(previewContrato);

  const submit = () => {
    if (aprovacao) { toast.error("Parâmetro abaixo de 2000 — necessária aprovação da diretoria"); return; }
    if (cli.doc && !isDocValid(cli.doc)) { toast.error("CPF/CNPJ inválido"); return; }
    if (cli.telefone && !isTelValid(cli.telefone)) { toast.error("Telefone inválido"); return; }
    if (!validation.ok) {
      toast.error(`Não foi possível salvar. Preencha: ${validation.missing.slice(0, 5).join(", ")}${validation.missing.length > 5 ? "…" : ""}`);
      return;
    }
    const novo = { ...previewContrato, status: "Em análise" };
    upsertContrato(novo);
    toast.success(`Contrato ${novo.id} cadastrado · status Em análise · clique em Validar para liberar a aprovação`);
    limpar();
    setOpenForm(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Cadastro de contratos</div>
            <div className="text-xs text-muted-foreground">Próximo nº: <span className="font-mono text-primary">{proximo}</span> · Hoje: {today} · Nasce como <b>Pendente</b>; projetos e financeiro são adicionados no lápis.</div>
          </div>
          <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={() => setOpenForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar contrato
          </Button>
        </div>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent
          className="max-w-5xl max-h-[92vh] overflow-hidden p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Novo contrato</DialogTitle>
                  <DialogDescription className="text-xs">
                    Nº <span className="font-mono font-semibold text-primary">{proximo}</span> · Cadastro {today} · será criado como <b>Pendente</b>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(92vh - 140px)" }}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-5">
              <TabsList className="grid w-full grid-cols-3 h-11">
                <TabsTrigger value="cliente" className="gap-2"><Users className="h-4 w-4" /> 1. Cliente</TabsTrigger>
                <TabsTrigger value="contrato" className="gap-2"><FileText className="h-4 w-4" /> 2. Contrato</TabsTrigger>
                <TabsTrigger value="pagamento" className="gap-2"><DollarSign className="h-4 w-4" /> 3. Pagamento</TabsTrigger>
              </TabsList>

              <TabsContent value="cliente" className="mt-0 space-y-4">
                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <ClientePicker value={clienteId} onPick={pickCliente} />
                </div>
                <div className="rounded-lg border bg-card p-5">
                  <div className="mb-4 flex items-center gap-2 border-b pb-3">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Dados do cliente</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>CPF / CNPJ</Label>
                      <Input value={cli.doc} onChange={(e) => setCliField("doc", maskDoc(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" maxLength={18} />
                      {cli.doc && !isDocValid(cli.doc) && <p className="text-[10px] text-destructive">CPF (11) ou CNPJ (14 dígitos)</p>}
                    </div>
                    <div className="space-y-1.5"><Label>Telefone</Label>
                      <Input value={cli.telefone} onChange={(e) => setCliField("telefone", maskTel(e.target.value))} placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15} />
                      {cli.telefone && !isTelValid(cli.telefone) && <p className="text-[10px] text-destructive">DDD (2) + 9 dígitos</p>}
                    </div>
                    <div className="space-y-1.5"><Label>Telefone 2</Label>
                      <Input value={cli.telefone2 ?? ""} onChange={(e) => setCliField("telefone2", maskTel(e.target.value))} placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2"><Label>E-mail</Label>
                      <Input type="email" value={cli.email} onChange={(e) => setCliField("email", e.target.value)} maxLength={120} />
                    </div>
                    <div className="space-y-1.5"><Label>CEP {cepLoading && <span className="text-xs text-muted-foreground">(buscando…)</span>}</Label>
                      <Input value={cli.cep} onChange={(e) => lookupCEP(e.target.value)} placeholder="69000-000" maxLength={10} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2"><Label>Rua</Label>
                      <Input value={cli.rua} onChange={(e) => setCliField("rua", e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label>Número</Label>
                      <Input value={cli.numero} onChange={(e) => setCliField("numero", e.target.value)} maxLength={10} />
                    </div>
                    <div className="space-y-1.5"><Label>Bairro</Label>
                      <Input value={cli.bairro} onChange={(e) => setCliField("bairro", e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label>Complemento</Label>
                      <Input value={cli.complemento} onChange={(e) => setCliField("complemento", e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label>Cidade</Label>
                      <Input value={cli.cidade} onChange={(e) => setCliField("cidade", e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label>UF</Label>
                      <Input value={cli.uf} onChange={(e) => setCliField("uf", e.target.value.toUpperCase())} maxLength={2} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contrato" className="mt-0 space-y-4">
                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Identificação</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5"><Label>Nº contrato (auto)</Label>
                      <Input value={proximo} readOnly className="bg-muted font-mono" />
                    </div>
                    <div className="space-y-1.5"><Label>Vendedor</Label>
                      <Select value={form.vendedor} onValueChange={(v) => setForm({ ...form, vendedor: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar vendedor da base" /></SelectTrigger>
                        <SelectContent>{vendedoresList.map((v) => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Data cadastro</Label>
                      <Input type="date" value={form.dataCadastro} onChange={(e) => setForm({ ...form, dataCadastro: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label>Data assinatura</Label>
                      <Input type="date" value={form.dataAssinatura} onChange={(e) => setForm({ ...form, dataAssinatura: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <span className="text-sm font-semibold">Valores e comissão</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>Valor da venda (R$)</Label>
                      <Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label>Parâmetro</Label>
                      <Input value={parametroFmt} readOnly className="bg-muted font-mono" />
                    </div>
                    <div className="space-y-1.5"><Label>Comissão (auto)</Label>
                      {aprovacao ? (
                        <Input value="APROVAÇÃO DIRETORIA" readOnly className="bg-destructive/10 font-bold text-destructive" />
                      ) : (
                        <Input value={comissaoPct != null ? `${comissaoPct.toFixed(2)}% · ${fmtBRL(comissaoValor)}` : ""} readOnly className="bg-muted font-semibold text-primary" />
                      )}
                    </div>
                  </div>
                  {parametroNum > 0 && (
                    <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold">Faixas de comissão:</span> &lt;2000 = aprovação diretoria · 2000–2100 = 3% · 2101–2300 = 4% · 2301–2449 = 5% · 2450+ = 6%
                    </div>
                  )}
                </div>

                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <span className="text-sm font-semibold">Dados técnicos do contrato</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>Qtd módulos (contrato)</Label>
                      <Input type="number" value={form.modulosContrato} onChange={(e) => setForm({ ...form, modulosContrato: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label>Potência/módulo (W)</Label>
                      <Input type="number" value={form.potenciaContrato} onChange={(e) => setForm({ ...form, potenciaContrato: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label>kWp esperado</Label>
                      <Input value={kwpEsperado.toFixed(2)} readOnly className="bg-muted font-mono" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-medium text-muted-foreground">Inversores (até 6)</div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {(["inv1","inv2","inv3","inv4","inv5","inv6"] as const).map((k, idx) => (
                        <div key={k} className="space-y-1.5"><Label className="text-xs">Inversor {idx + 1}</Label>
                          <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={idx === 0 ? "Modelo / potência" : "Opcional"} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <span className="text-sm font-semibold">Forma de pagamento</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>Forma de pagamento</Label>
                      <Select value={form.pagamento} onValueChange={(v) => setForm({ ...form, pagamento: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          {["À vista","Pix","Boleto","Cartão","Transferência","Financiamento","Misto"].map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.pagamento === "Financiamento" && (
                      <div className="space-y-1.5 md:col-span-2"><Label>Banco (financiamento)</Label>
                        <Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} placeholder="BASA, SICREDI, BB…" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5"><Label>Observações</Label>
                    <Textarea value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} placeholder="Observações do contrato" rows={3} />
                  </div>
                </div>

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground">
                  <b className="text-foreground">Próximos passos:</b> ao salvar com tudo preenchido o contrato vai para <b>Em análise</b>. Use o botão <b>Validar</b> na lista para liberar a aprovação. Projetos só podem ser cadastrados após o contrato ser aprovado.
                </div>
              </TabsContent>

              <TabsContent value="pagamento" className="mt-0 space-y-4">
                <ComposicaoEditor valorContrato={valorNum} value={composicao} onChange={setComposicao} />
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground">
                  A soma das linhas precisa fechar com o valor do contrato. O financeiro será gerado proporcionalmente para cada projeto aprovado (rateio por % do contrato).
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t bg-muted/30 px-6 py-3 space-y-2">
            {!validation.ok && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive">
                <b>Pendente:</b> {validation.missing.join(" · ")}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={limpar}>Limpar</Button>
              <Button
                className="bg-primary text-primary-foreground"
                onClick={submit}
                disabled={aprovacao || !validation.ok}
              >
                <Plus className="mr-2 h-4 w-4" /> Cadastrar contrato
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <div className="border-b border-border p-4 text-sm font-semibold">Últimos contratos cadastrados</div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
            <TableHead className="text-right">kWp</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Parâmetro</TableHead>
            <TableHead className="text-right">% Com.</TableHead>
            <TableHead className="text-right">R$ Comissão</TableHead>
            <TableHead className="text-center">Projetos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {contratos.slice(0, 12).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
                <TableCell className="font-medium">{c.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{c.vendedor}</TableCell>
                <TableCell className="text-right">{(c.kwp ?? 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{c.parametro || "—"}</TableCell>
                <TableCell className="text-right">{c.comissaoPct ? `${c.comissaoPct}%` : "—"}</TableCell>
                <TableCell className="text-right text-primary">{c.comissaoValor ? fmtBRL(c.comissaoValor) : "—"}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-bold text-primary">
                    {c.projetos?.length ?? 0}
                  </span>
                </TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <ValidarContratoButton contrato={c} />
                    <AprovarContratoButton contrato={c} />
                    <EditarContratoDialog contrato={c} vendedoresList={vendedoresList} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------------- VALIDAR / APROVAR CONTRATO ---------------- */

function ValidarContratoButton({ contrato }: { contrato: Contrato }) {
  if (contrato.status === "Aprovado" || contrato.status === "Pronto para aprovação" || contrato.status === "Cancelado") return null;
  const validar = () => {
    const r = validateContratoCompleto(contrato);
    if (r.ok) {
      updateContratoAudit(contrato.id, { status: "Pronto para aprovação" });
      toast.success(`Contrato ${contrato.id} validado · pronto para aprovação`);
    } else {
      updateContratoAudit(contrato.id, { status: "Pendente de informações" });
      toast.error(`Faltam: ${r.missing.join(" · ")}`, { duration: 6000 });
    }
  };
  return (
    <Button variant="ghost" size="sm" className="h-7 text-xs" title="Validar contrato" onClick={validar}>
      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Validar
    </Button>
  );
}

function SolicitarAlteracaoButton({ contrato }: { contrato: Contrato }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const enviar = () => {
    if (motivo.trim().length < 5) { toast.error("Descreva o motivo (mínimo 5 caracteres)"); return; }
    solicitarAlteracaoContrato(contrato.id, motivo.trim(), "Operador", {});
    toast.success("Solicitação registrada na auditoria");
    setMotivo(""); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs"><History className="mr-1 h-3.5 w-3.5" /> Solicitar alteração</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar alteração — {contrato.id}</DialogTitle>
          <DialogDescription>O contrato está aprovado. Informe o motivo da alteração; ficará registrado na auditoria com data, hora e usuário.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Motivo</Label>
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} placeholder="Descreva o motivo da alteração" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={enviar}>Registrar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AprovarContratoButton({ contrato }: { contrato: Contrato }) {
  const [open, setOpen] = useState(false);
  if (contrato.status === "Aprovado" || contrato.status === "Cancelado") return null;
  const liberado = contrato.status === "Pronto para aprovação";
  const cli = contrato.clienteFull;
  const aprovar = () => {
    const r = validateContratoCompleto(contrato);
    if (!r.ok) {
      toast.error(`Não pode aprovar. Faltam: ${r.missing.join(", ")}`);
      return;
    }
    updateContratoAudit(contrato.id, { status: "Aprovado" });
    toast.success(`Contrato ${contrato.id} aprovado · libere os projetos na aba Projetos do lápis`);
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-7 px-2 text-xs bg-success text-success-foreground hover:opacity-90"
          disabled={!liberado}
          title={liberado ? "Aprovar contrato" : "Use Validar primeiro"}
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprovar contrato {contrato.id}</DialogTitle>
          <DialogDescription>
            Confirmar aprovação deste contrato? Após aprovado, dados estruturais terão controle de alteração.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          <div><b>Cliente:</b> {cli?.nome || contrato.cliente}</div>
          <div><b>Nº contrato:</b> <span className="font-mono">{contrato.id}</span></div>
          <div><b>Valor:</b> {fmtBRL(contrato.valor)}</div>
          <div><b>Potência contratada:</b> {(contrato.kwp ?? 0).toFixed(2)} kWp · {contrato.modulos ?? 0} mód</div>
          <div><b>Forma de pagamento:</b> {contrato.pagamento || "—"}{contrato.banco ? ` · ${contrato.banco}` : ""}</div>
          <div><b>Vendedor:</b> {contrato.vendedor}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-success text-success-foreground" onClick={aprovar}>Confirmar aprovação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- EDITAR CONTRATO + PROJETOS + AUDITORIA ---------------- */

function EditarContratoDialog({ contrato, vendedoresList }: { contrato: Contrato; vendedoresList: Vendedor[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"dados" | "cliente" | "composicao" | "projetos" | "auditoria">("dados");
  const [f, setF] = useState<Contrato>(contrato);
  const [cli, setCli] = useState<ClienteFull>(contrato.clienteFull ?? {
    nome: contrato.cliente, doc: "", telefone: "", telefone2: "", email: "",
    cep: "", rua: "", numero: "", bairro: "", complemento: "", cidade: "", uf: "",
  });
  const [cepLoading, setCepLoading] = useState(false);

  const setCliField = (k: keyof ClienteFull, v: string) => setCli((p) => ({ ...p, [k]: v }));
  const lookupCEP = async (cep: string) => {
    setCliField("cep", cep);
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    const r = await buscarCEP(cep);
    setCepLoading(false);
    if (r) setCli((p) => ({ ...p, ...r } as ClienteFull));
  };

  const salvar = () => {
    // valida CPF/CNPJ e telefone se preenchidos
    if (cli.doc && !isDocValid(cli.doc)) { toast.error("CPF deve ter 11 dígitos ou CNPJ 14 dígitos"); return; }
    if (cli.telefone && !isTelValid(cli.telefone)) { toast.error("Telefone deve ter DDD (2) + 9 dígitos"); return; }
    if (cli.telefone2 && !isTelValid(cli.telefone2)) { toast.error("Telefone 2 inválido"); return; }

    const aprovouAgora = f.status === "Aprovado" && contrato.status !== "Aprovado";

    updateContratoAudit(contrato.id, {
      cliente: f.cliente, vendedor: f.vendedor, valor: f.valor, kwp: f.kwp,
      status: f.status, data: f.data, dataCadastro: f.dataCadastro ?? f.data,
      dataAssinatura: f.dataAssinatura, banco: f.banco, obs: f.obs,
      modulos: f.modulos, potencia: f.potencia, inv1: f.inv1, inv2: f.inv2, inv3: f.inv3,
      clienteFull: cli,
    });

    // Se aprovou agora, libera projetos para Engenharia e gera financeiro
    if (aprovouAgora) {
      const projs = contrato.projetos ?? [];
      const novosLanc: import("@/lib/financeiro-store").Lancamento[] = [];
      projs.forEach((p) => {
        if (!p.financeiroGerado) {
          updateProjeto(contrato.id, p.id, { enviadoEngenharia: true, financeiroGerado: true });
          const parc = p.parcelasPagto ?? [];
          parc.forEach((pg, pi) => {
            if (pg.valor <= 0) return;
            novosLanc.push({
              id: `L-REC-${Date.now()}-${p.id}-${pi}`,
              data: pg.dataVencimento,
              descricao: `Parc ${pi + 1}/${parc.length} · ${pg.formaPagamento} · ${p.id} · ${contrato.cliente}`,
              tipo: "Entrada", valor: pg.valor, camada: "A realizar",
              natureza: "Recebimento de cliente", centroCusto: "Comercial",
              obra: p.id, empresa: "Meta Sun", filial: "Manaus",
              contrato: contrato.id, cliente: contrato.cliente,
              formaPagamento: pg.formaPagamento,
              parcelaLabel: `${pi + 1}/${parc.length}`,
              competencia: pg.competencia, dataEmissao: pg.dataEmissao,
            });
          });
        }
      });
      if (novosLanc.length > 0) appendLancamentos(novosLanc);
      toast.success(`Contrato ${contrato.id} aprovado · ${projs.length} projeto(s) à Engenharia${novosLanc.length ? ` · ${novosLanc.length} parcela(s) no Financeiro` : ""}`);
    } else {
      toast.success(`Contrato ${contrato.id} atualizado · auditoria registrada`);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar contrato <span className="font-mono text-primary">{contrato.id}</span></DialogTitle>
          <DialogDescription>Edite dados, cliente, desdobre em projetos e veja auditoria.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="dados">Dados do contrato</TabsTrigger>
            <TabsTrigger value="cliente">Cliente</TabsTrigger>
            <TabsTrigger value="composicao">Composição</TabsTrigger>
            <TabsTrigger value="projetos">Projetos ({contrato.projetos?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="auditoria"><History className="mr-1 h-3.5 w-3.5" /> Auditoria ({contrato.auditoria?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            {contrato.status === "Aprovado" && (
              <div className="mb-3 flex items-center justify-between rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs">
                <span className="text-success font-medium">Contrato aprovado · campos estruturais bloqueados.</span>
                <SolicitarAlteracaoButton contrato={contrato} />
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5"><Label>Cliente (nome no contrato)</Label>
                <Input value={f.cliente} disabled={contrato.status === "Aprovado"} onChange={(e) => setF({ ...f, cliente: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Vendedor</Label>
                <Select value={f.vendedor} onValueChange={(v) => setF({ ...f, vendedor: v })} disabled={contrato.status === "Aprovado"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{vendedoresList.map((v) => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={f.status} onValueChange={(v) => {
                  if (v === "Aprovado" && f.status !== "Aprovado") {
                    const r = validateContratoCompleto(contrato);
                    if (!r.ok) { toast.error(`Faltam: ${r.missing.join(", ")}`); return; }
                    if (!window.confirm(`Aprovar contrato ${contrato.id}?\n\nApós aprovado, dados estruturais terão controle de alteração.`)) return;
                  }
                  setF({ ...f, status: v });
                }} disabled={contrato.status === "Aprovado"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pendente de informações", "Em análise", "Pronto para aprovação", "Aprovado", "Cancelado"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Data cadastro</Label>
                <Input type="date" value={f.data ?? ""} onChange={(e) => setF({ ...f, data: e.target.value, dataCadastro: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Data assinatura</Label>
                <Input type="date" value={f.dataAssinatura ?? ""} onChange={(e) => setF({ ...f, dataAssinatura: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Forma de pagamento</Label>
                <Select value={f.pagamento ?? ""} onValueChange={(v) => setF({ ...f, pagamento: v })} disabled={contrato.status === "Aprovado"}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {["À vista","Pix","Boleto","Cartão","Transferência","Financiamento","Misto"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Banco</Label>
                <Input value={f.banco ?? ""} onChange={(e) => setF({ ...f, banco: e.target.value })} disabled={contrato.status === "Aprovado"} />
              </div>
              <div className="space-y-1.5"><Label>Valor (R$)</Label>
                <Input type="number" value={f.valor} disabled={contrato.status === "Aprovado"} onChange={(e) => setF({ ...f, valor: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5"><Label>Módulos</Label>
                <Input type="number" value={f.modulos ?? 0} disabled={contrato.status === "Aprovado"} onChange={(e) => setF({ ...f, modulos: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5"><Label>Potência módulo (W)</Label>
                <Input type="number" value={f.potencia ?? 0} disabled={contrato.status === "Aprovado"} onChange={(e) => setF({ ...f, potencia: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5"><Label>kWp total</Label>
                <Input type="number" step="0.01" value={f.kwp} disabled={contrato.status === "Aprovado"} onChange={(e) => setF({ ...f, kwp: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5"><Label>Inversor 1</Label>
                <Input value={f.inv1 ?? ""} onChange={(e) => setF({ ...f, inv1: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Inversor 2</Label>
                <Input value={f.inv2 ?? ""} onChange={(e) => setF({ ...f, inv2: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Inversor 3</Label>
                <Input value={f.inv3 ?? ""} onChange={(e) => setF({ ...f, inv3: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-3"><Label>Observações</Label>
                <Textarea value={f.obs ?? ""} onChange={(e) => setF({ ...f, obs: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Aprovação para Engenharia</div>
                  <div className="text-xs text-muted-foreground">Apenas contratos <b>Aprovados</b> e projetos <b>liberados</b> aparecem na Engenharia. Configure o financeiro de cada projeto na aba <b>Pedidos de venda</b>.</div>
                </div>
                <AprovarEnviarDialog contrato={contrato} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cliente" className="mt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2"><Label>Nome</Label>
                <Input value={cli.nome} onChange={(e) => setCliField("nome", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>CPF / CNPJ</Label>
                <Input value={cli.doc} onChange={(e) => setCliField("doc", maskDoc(e.target.value))} inputMode="numeric" maxLength={18} />
                {cli.doc && !isDocValid(cli.doc) && <p className="text-[10px] text-destructive">CPF (11) ou CNPJ (14 dígitos)</p>}
              </div>
              <div className="space-y-1.5"><Label>Telefone</Label>
                <Input value={cli.telefone} onChange={(e) => setCliField("telefone", maskTel(e.target.value))} inputMode="numeric" maxLength={15} />
                {cli.telefone && !isTelValid(cli.telefone) && <p className="text-[10px] text-destructive">DDD (2) + 9 dígitos</p>}
              </div>
              <div className="space-y-1.5"><Label>Telefone 2</Label>
                <Input value={cli.telefone2 ?? ""} onChange={(e) => setCliField("telefone2", maskTel(e.target.value))} inputMode="numeric" maxLength={15} />
              </div>
              <div className="space-y-1.5"><Label>E-mail</Label>
                <Input type="email" value={cli.email} onChange={(e) => setCliField("email", e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1.5"><Label>CEP {cepLoading && <span className="text-xs text-muted-foreground">(buscando…)</span>}</Label>
                <Input value={cli.cep} onChange={(e) => lookupCEP(e.target.value)} maxLength={10} />
              </div>
              <div className="space-y-1.5 md:col-span-2"><Label>Rua</Label>
                <Input value={cli.rua} onChange={(e) => setCliField("rua", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Número</Label>
                <Input value={cli.numero} onChange={(e) => setCliField("numero", e.target.value)} maxLength={10} />
              </div>
              <div className="space-y-1.5"><Label>Bairro</Label>
                <Input value={cli.bairro} onChange={(e) => setCliField("bairro", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Complemento</Label>
                <Input value={cli.complemento} onChange={(e) => setCliField("complemento", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Cidade</Label>
                <Input value={cli.cidade} onChange={(e) => setCliField("cidade", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>UF</Label>
                <Input value={cli.uf} onChange={(e) => setCliField("uf", e.target.value.toUpperCase())} maxLength={2} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="composicao" className="mt-4">
            <ComposicaoTabPanel contrato={contrato} />
          </TabsContent>

          <TabsContent value="projetos" className="mt-4">
            <ProjetosManager contrato={contrato} />
          </TabsContent>

          <TabsContent value="auditoria" className="mt-4">
            <Card className="p-3">
              {(contrato.auditoria ?? []).length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma alteração registrada.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data/hora</TableHead><TableHead>Usuário</TableHead>
                    <TableHead>Campo</TableHead><TableHead>De</TableHead><TableHead>Para</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[...(contrato.auditoria ?? [])].reverse().map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{new Date(a.data).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{a.usuario}</TableCell>
                        <TableCell className="font-medium">{a.campo}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[180px] truncate">{a.de || "—"}</TableCell>
                        <TableCell className="text-primary max-w-[180px] truncate">{a.para || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-5">
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          {(tab === "dados" || tab === "cliente") && (
            <Button className="bg-primary text-primary-foreground" onClick={salvar}>Salvar alterações</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- APROVAR E ENVIAR PROJETOS À ENGENHARIA ---------------- */

function AprovarEnviarDialog({ contrato }: { contrato: Contrato }) {
  const [open, setOpen] = useState(false);
  const projetos = contrato.projetos ?? [];
  const [sel, setSel] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(projetos.map((p) => [p.id, !p.enviadoEngenharia])),
  );

  // Quotas do contrato vs soma dos projetos selecionados + já liberados
  const valorContrato = Number(contrato.valor) || 0;
  const modulosContrato = Number(contrato.modulos) || 0;
  const ativos = projetos.filter((p) => p.enviadoEngenharia || sel[p.id]);
  const somaValor = ativos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const somaMod = ativos.reduce((s, p) => s + (Number(p.modulos) || 0), 0);
  const excedeValor = valorContrato > 0 && somaValor - valorContrato > 0.5;
  const excedeMod = modulosContrato > 0 && somaMod > modulosContrato;
  const algumLiberado = ativos.length > 0;

  const aprovar = () => {
    if (!algumLiberado) { toast.error("Selecione ao menos 1 projeto para liberar."); return; }
    if (excedeValor) { toast.error(`Soma de valores (${fmtBRL(somaValor)}) excede o contrato (${fmtBRL(valorContrato)}).`); return; }
    if (excedeMod) { toast.error(`Soma de módulos (${somaMod}) excede o contrato (${modulosContrato}).`); return; }
    if (contrato.status !== "Aprovado") {
      updateContratoAudit(contrato.id, { status: "Aprovado" });
    }
    const liberados = Object.entries(sel).filter(([, v]) => v).map(([id]) => id);
    liberados.forEach((id) => {
      updateProjeto(contrato.id, id, { enviadoEngenharia: true });
    });
    toast.success(`Contrato aprovado · ${liberados.length} projeto(s) liberado(s) · configure o financeiro na aba Pedidos de venda`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-success text-success-foreground hover:opacity-90">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar contrato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aprovar contrato {contrato.id}</DialogTitle>
          <DialogDescription>
            Selecione os projetos a liberar para a Engenharia. A soma de valor e módulos não pode exceder o contrato. O financeiro de cada projeto é configurado em <b>Pedidos de venda</b>.
          </DialogDescription>
        </DialogHeader>
        <div className={`rounded-md border p-2 text-xs ${(excedeValor || excedeMod) ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/40 bg-emerald-500/5"}`}>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Valor: <b className="font-mono">{fmtBRL(somaValor)}</b> / {fmtBRL(valorContrato)}</span>
            <span>Módulos: <b className="font-mono">{somaMod}</b> / {modulosContrato}</span>
            {(excedeValor || excedeMod) && <span className="text-destructive font-semibold">Excede o contrato</span>}
          </div>
        </div>
        {projetos.length > 0 && (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {projetos.map((p) => (
              <label key={p.id} className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${sel[p.id] || p.enviadoEngenharia ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="checkbox" className="mt-1" checked={!!sel[p.id] || !!p.enviadoEngenharia} disabled={p.enviadoEngenharia} onChange={(e) => setSel({ ...sel, [p.id]: e.target.checked })} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="font-mono text-primary">{p.id}</span>
                    <span>{p.tipo || "Projeto"}</span>
                    {p.enviadoEngenharia && <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">JÁ LIBERADO</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{p.endereco}{p.numero ? `, ${p.numero}` : ""} · {p.cidade}/{p.uf} · {p.modulos} mód · {p.kwp.toFixed(2)} kWp · <b>{fmtBRL(Number(p.valor) || 0)}</b></div>
                </div>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-success text-success-foreground" onClick={aprovar} disabled={excedeValor || excedeMod || !algumLiberado}>Aprovar e enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



type NovoProjForm = Omit<ProjetoVinculado, "id" | "contratoId">;

function emptyProjeto(contrato: Contrato, tipoLabel: string): NovoProjForm {
  return {
    tipo: tipoLabel,
    endereco: contrato.clienteFull?.rua ?? "",
    numero: contrato.clienteFull?.numero ?? "",
    bairro: contrato.clienteFull?.bairro ?? "",
    cep: contrato.clienteFull?.cep ?? "",
    cidade: contrato.clienteFull?.cidade ?? "",
    uf: contrato.clienteFull?.uf ?? "",
    modulos: contrato.modulos ?? 0,
    potenciaModuloW: contrato.potencia ?? 620,
    kwp: contrato.kwp ?? 0,
    inversor: contrato.inv1 ?? "",
    inv2: contrato.inv2 ?? "",
    inv3: contrato.inv3 ?? "",
    equipe: "",
    status: "Em projeto/aprovação",
    inicio: "",
    previsto: "",
    obs: "",
    cronograma: "",
    enviadoEngenharia: false,
    valor: 0,
  };
}

function ProjetoFinanceiro({ contrato, projeto }: { contrato: Contrato; projeto: ProjetoVinculado }) {
  const today = new Date().toISOString().slice(0, 10);
  const addMonthsISO = (iso: string, n: number) => {
    if (!iso) return iso;
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, (m - 1) + n, d);
    return dt.toISOString().slice(0, 10);
  };
  const novaParcela = (base?: ParcelaPagto): ParcelaPagto => ({
    id: `P-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    valor: 0,
    dataEmissao: base?.dataEmissao ?? today,
    dataVencimento: base ? addMonthsISO(base.dataVencimento, 1) : today,
    competencia: base ? addMonthsISO(base.dataVencimento, 1).slice(0, 7) : today.slice(0, 7),
    formaPagamento: base?.formaPagamento ?? "Pix",
  });
  const parcelas = projeto.parcelasPagto ?? [];
  const valorProj = projeto.valor ?? 0;
  const totalParc = parcelas.reduce((a, p) => a + (Number(p.valor) || 0), 0);

  const save = (next: ParcelaPagto[]) => updateProjeto(contrato.id, projeto.id, { parcelasPagto: next });
  const setValor = (v: number) => updateProjeto(contrato.id, projeto.id, { valor: v });
  const add = () => save([...parcelas, novaParcela(parcelas[parcelas.length - 1])]);
  const del = (id: string) => save(parcelas.filter((p) => p.id !== id));
  const setP = (id: string, patch: Partial<ParcelaPagto>) =>
    save(parcelas.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const distribuirValor = () => {
    if (parcelas.length === 0 || valorProj <= 0) return;
    const each = Math.round((valorProj / parcelas.length) * 100) / 100;
    const last = Math.round((valorProj - each * (parcelas.length - 1)) * 100) / 100;
    save(parcelas.map((p, i) => ({ ...p, valor: i === parcelas.length - 1 ? last : each })));
  };
  const vencPlus1 = () => {
    if (parcelas.length === 0) return;
    save(parcelas.map((p, i) => {
      if (i === 0) return p;
      const venc = addMonthsISO(parcelas[0].dataVencimento, i);
      return { ...p, dataVencimento: venc, competencia: venc.slice(0, 7) };
    }));
  };
  const mesmaComp = () => parcelas.length && save(parcelas.map((p) => ({ ...p, competencia: parcelas[0].competencia })));
  const mesmaEmiss = () => parcelas.length && save(parcelas.map((p) => ({ ...p, dataEmissao: parcelas[0].dataEmissao })));

  return (
    <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <DollarSign className="h-4 w-4 text-primary" /> Financeiro do projeto
          {projeto.financeiroGerado && <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">GERADO NO FINANCEIRO</span>}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Valor do projeto (R$)</Label>
          <Input type="number" className="h-8 w-32" value={valorProj} onChange={(e) => setValor(Number(e.target.value) || 0)} />
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={distribuirValor}>Distribuir valor</Button>
        <Button type="button" size="sm" variant="outline" onClick={vencPlus1}>Vencimentos +1 mês</Button>
        <Button type="button" size="sm" variant="outline" onClick={mesmaComp}>Mesma competência</Button>
        <Button type="button" size="sm" variant="outline" onClick={mesmaEmiss}>Mesma emissão</Button>
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="mr-1 h-3.5 w-3.5" /> Parcela</Button>
      </div>
      {parcelas.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">Sem parcelas. Adicione para gerar o financeiro deste projeto.</div>
      ) : (
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead className="w-10">#</TableHead>
            <TableHead>Emissão</TableHead><TableHead>Vencimento</TableHead><TableHead>Competência</TableHead>
            <TableHead>Forma</TableHead><TableHead className="text-right">Valor (R$)</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {parcelas.map((p, i) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                <TableCell><Input type="date" className="h-8" value={p.dataEmissao} onChange={(e) => setP(p.id, { dataEmissao: e.target.value })} /></TableCell>
                <TableCell><Input type="date" className="h-8" value={p.dataVencimento} onChange={(e) => setP(p.id, { dataVencimento: e.target.value })} /></TableCell>
                <TableCell><Input type="month" className="h-8" value={p.competencia} onChange={(e) => setP(p.id, { competencia: e.target.value })} /></TableCell>
                <TableCell>
                  <Select value={p.formaPagamento} onValueChange={(v) => setP(p.id, { formaPagamento: v as FormaPagamento })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Pix","Boleto","Cartão","Transferência","Dinheiro","Financiamento"] as FormaPagamento[]).map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Input type="number" className="h-8 text-right" value={p.valor} onChange={(e) => setP(p.id, { valor: Number(e.target.value) || 0 })} />
                </TableCell>
                <TableCell>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="mt-2 flex justify-end text-xs">
        <span>Total parcelas: <b className="font-mono">{fmtBRL(totalParc)}</b>
        {valorProj > 0 && (
          <span className={`ml-2 font-mono ${Math.abs(totalParc - valorProj) > 0.5 ? "text-destructive" : "text-emerald-600"}`}>
            {Math.abs(totalParc - valorProj) > 0.5 ? `≠ valor projeto (${fmtBRL(valorProj)})` : "✓ bate com valor do projeto"}
          </span>
        )}
        </span>
      </div>
    </div>
  );
}

function ProjetosManager({ contrato }: { contrato: Contrato }) {
  const projetos = contrato.projetos ?? [];
  const [activeTab, setActiveTab] = useState<string>(projetos[0]?.id ?? "novo");
  const [draft, setDraft] = useState<NovoProjForm>(() =>
    emptyProjeto(contrato, `Projeto ${projetos.length + 1}`),
  );

  const setD = (k: keyof NovoProjForm, v: any) => setDraft((p) => ({ ...p, [k]: v }));
  const kwpAuto = (draft.modulos * draft.potenciaModuloW) / 1000;

  const adicionar = () => {
    if (!draft.endereco.trim()) { toast.error("Informe o endereço do projeto"); return; }
    if (!(Number(draft.valor) > 0)) { toast.error("Informe o valor do projeto"); return; }
    const somaAtual = projetos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const valorContrato = Number(contrato.valor) || 0;
    if (valorContrato > 0 && somaAtual + Number(draft.valor) - valorContrato > 0.5) {
      toast.error(`Soma dos projetos (${fmtBRL(somaAtual + Number(draft.valor))}) excede o valor do contrato (${fmtBRL(valorContrato)}).`);
      return;
    }
    addProjeto(contrato.id, { ...draft, kwp: kwpAuto || draft.kwp });
    toast.success(`Projeto vinculado ao contrato ${contrato.id}`);
    setDraft(emptyProjeto(contrato, `Projeto ${projetos.length + 2}`));
    setActiveTab("novo");
  };

  const lookupCEP = async (cep: string) => {
    setD("cep", cep);
    if (cep.replace(/\D/g, "").length !== 8) return;
    const r = await buscarCEP(cep);
    if (r) setDraft((p) => ({ ...p, endereco: r.rua ?? p.endereco, bairro: r.bairro ?? p.bairro, cidade: r.cidade ?? p.cidade, uf: r.uf ?? p.uf }));
  };

  const lookupCEPExisting = async (projId: string, cep: string) => {
    updateProjeto(contrato.id, projId, { cep });
    if (cep.replace(/\D/g, "").length !== 8) return;
    const r = await buscarCEP(cep);
    if (r) updateProjeto(contrato.id, projId, { endereco: r.rua ?? "", bairro: r.bairro ?? "", cidade: r.cidade ?? "", uf: r.uf ?? "" });
  };

  const somaProjetos = projetos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const valorContrato = Number(contrato.valor) || 0;
  const diff = valorContrato - somaProjetos;
  const bate = Math.abs(diff) <= 0.5;

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Cada projeto vira uma obra independente (tipo, endereço, módulos, equipe) mas mantém vínculo com o contrato {contrato.id}. Valor de venda, comissão e parâmetro permanecem no contrato.
      </div>
      {projetos.length > 0 && (
        <div className={`rounded-md border p-3 text-xs flex flex-wrap items-center justify-between gap-2 ${bate ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Contrato: <b className="font-mono">{fmtBRL(valorContrato)}</b></span>
            <span>Soma projetos: <b className="font-mono">{fmtBRL(somaProjetos)}</b></span>
            <span className={bate ? "text-emerald-600" : "text-destructive"}>
              {bate ? "✓ valores batem" : `Diferença: ${fmtBRL(Math.abs(diff))} ${diff > 0 ? "(faltam)" : "(excesso)"}`}
            </span>
          </div>
          <span className="text-muted-foreground">Soma de valor/módulos não pode exceder o contrato. Pode aprovar por blocos.</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          {projetos.map((p, i) => (
            <TabsTrigger key={p.id} value={p.id} className="text-xs">
              <span className="font-mono mr-1">{p.id.split("-").pop()}</span>
              {p.tipo || `Projeto ${i + 1}`}
              {p.enviadoEngenharia && <span className="ml-1 text-success">●</span>}
            </TabsTrigger>
          ))}
          <TabsTrigger value="novo" className="text-xs"><Plus className="h-3 w-3 mr-1" />Novo projeto</TabsTrigger>
        </TabsList>

        {projetos.map((p) => (
          <TabsContent key={p.id} value={p.id} className="mt-3">
            <Card className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-mono text-primary">{p.id}</span>
                  {p.enviadoEngenharia ? <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">ENVIADO À ENGENHARIA</span> : <span className="text-[10px] rounded bg-warning/15 px-2 py-0.5 text-warning font-bold">PENDENTE</span>}
                </div>
                <div className="flex items-center gap-2">
                  {!p.aprovado && contrato.status === "Aprovado" && (
                    <Button size="sm" className="bg-success text-success-foreground" onClick={() => {
                      const faltam: string[] = [];
                      if (!(Number(p.valor) > 0)) faltam.push("valor");
                      if (!(Number(p.modulos) > 0)) faltam.push("módulos");
                      if (!(Number(p.kwp) > 0)) faltam.push("potência (kWp)");
                      if (!p.endereco?.trim()) faltam.push("endereço");
                      if (!p.status?.trim()) faltam.push("status");
                      if (faltam.length) { toast.error(`Faltam: ${faltam.join(", ")}`); return; }
                      const comp = composicaoSomaOk(contrato);
                      if (!comp.ok) { toast.error(`Composição do contrato não fecha (diff ${fmtBRL(Math.abs(comp.diff))}).`); return; }
                      if (!window.confirm(`Aprovar projeto ${p.id}?\nApós aprovado, o financeiro pode ser gerado proporcionalmente em Pedidos de venda.`)) return;
                      aprovarProjeto(contrato.id, p.id);
                      toast.success(`Projeto ${p.id} aprovado · pronto para gerar financeiro`);
                    }}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Aprovar projeto</Button>
                  )}
                  {p.aprovado && (
                    <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">APROVADO</span>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { removeProjeto(contrato.id, p.id); toast.success("Projeto removido"); setActiveTab(projetos[0]?.id !== p.id ? projetos[0]?.id ?? "novo" : "novo"); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5"><Label>Tipo do projeto</Label>
                  <Input value={p.tipo} onChange={(e) => updateProjeto(contrato.id, p.id, { tipo: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>CEP</Label>
                  <Input value={p.cep ?? ""} onChange={(e) => lookupCEPExisting(p.id, e.target.value)} maxLength={10} />
                </div>
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={p.status} onValueChange={(v) => updateProjeto(contrato.id, p.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Em projeto/aprovação", "Aguardando instalação", "Executando instalação", "Standby", "Finalizado"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2"><Label>Endereço (rua)</Label>
                  <Input value={p.endereco} onChange={(e) => updateProjeto(contrato.id, p.id, { endereco: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Número</Label>
                  <Input value={p.numero ?? ""} onChange={(e) => updateProjeto(contrato.id, p.id, { numero: e.target.value })} maxLength={10} />
                </div>
                <div className="space-y-1.5"><Label>Bairro</Label>
                  <Input value={p.bairro ?? ""} onChange={(e) => updateProjeto(contrato.id, p.id, { bairro: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Cidade</Label>
                  <Input value={p.cidade} onChange={(e) => updateProjeto(contrato.id, p.id, { cidade: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>UF</Label>
                  <Input value={p.uf} onChange={(e) => updateProjeto(contrato.id, p.id, { uf: e.target.value.toUpperCase() })} maxLength={2} />
                </div>
                <div className="space-y-1.5"><Label>Qtd módulos</Label>
                  <Input type="number" value={p.modulos} onChange={(e) => { const m = Number(e.target.value) || 0; updateProjeto(contrato.id, p.id, { modulos: m, kwp: (m * p.potenciaModuloW) / 1000 }); }} />
                </div>
                <div className="space-y-1.5"><Label>Potência módulo (W)</Label>
                  <Input type="number" value={p.potenciaModuloW} onChange={(e) => { const w = Number(e.target.value) || 0; updateProjeto(contrato.id, p.id, { potenciaModuloW: w, kwp: (p.modulos * w) / 1000 }); }} />
                </div>
                <div className="space-y-1.5"><Label>kWp</Label>
                  <Input value={p.kwp.toFixed(2)} readOnly className="bg-muted font-mono" />
                </div>
                <div className="space-y-1.5"><Label>Valor do projeto (R$) *</Label>
                  <Input type="number" step="0.01" value={p.valor ?? 0} onChange={(e) => {
                    const novo = Number(e.target.value) || 0;
                    const valorContrato = Number(contrato.valor) || 0;
                    const somaOutros = projetos.filter((x) => x.id !== p.id).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                    if (valorContrato > 0 && somaOutros + novo - valorContrato > 0.5) {
                      toast.error(`Soma excederia o contrato (${fmtBRL(valorContrato)}).`);
                      return;
                    }
                    updateProjeto(contrato.id, p.id, { valor: novo });
                  }} />
                </div>
                <div className="space-y-1.5"><Label>Inversor 1</Label>
                  <Input value={p.inversor} onChange={(e) => updateProjeto(contrato.id, p.id, { inversor: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Inversor 2</Label>
                  <Input value={p.inv2 ?? ""} onChange={(e) => updateProjeto(contrato.id, p.id, { inv2: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Inversor 3</Label>
                  <Input value={p.inv3 ?? ""} onChange={(e) => updateProjeto(contrato.id, p.id, { inv3: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Equipe</Label>
                  <Input value={p.equipe} onChange={(e) => updateProjeto(contrato.id, p.id, { equipe: e.target.value })} placeholder="Equipe A, B…" />
                </div>
                <div className="space-y-1.5"><Label>Início previsto</Label>
                  <Input type="date" value={p.inicio} onChange={(e) => updateProjeto(contrato.id, p.id, { inicio: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Conclusão prevista</Label>
                  <Input type="date" value={p.previsto} onChange={(e) => updateProjeto(contrato.id, p.id, { previsto: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:col-span-3"><Label>Observações</Label>
                  <Textarea value={p.obs} onChange={(e) => updateProjeto(contrato.id, p.id, { obs: e.target.value })} />
                </div>
              </div>
              <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 p-2 text-xs text-muted-foreground">
                <DollarSign className="inline h-3.5 w-3.5 mr-1" /> Financeiro deste projeto agora é configurado na aba <b>Pedidos de venda</b> (após o contrato estar Aprovado e o projeto liberado).
              </div>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="novo" className="mt-3">
          <Card className="p-3">
            <div className="mb-2 text-sm font-semibold">Novo projeto vinculado ao contrato {contrato.id}</div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5"><Label>Tipo do projeto</Label>
                <Input value={draft.tipo} onChange={(e) => setD("tipo", e.target.value)} placeholder={`Projeto ${projetos.length + 1}`} />
              </div>
              <div className="space-y-1.5"><Label>CEP</Label>
                <Input value={draft.cep ?? ""} onChange={(e) => lookupCEP(e.target.value)} maxLength={10} />
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setD("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Em projeto/aprovação", "Aguardando instalação", "Executando instalação", "Standby", "Finalizado"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2"><Label>Endereço (rua)</Label>
                <Input value={draft.endereco} onChange={(e) => setD("endereco", e.target.value)} placeholder="Rua, av…" />
              </div>
              <div className="space-y-1.5"><Label>Número</Label>
                <Input value={draft.numero ?? ""} onChange={(e) => setD("numero", e.target.value)} maxLength={10} />
              </div>
              <div className="space-y-1.5"><Label>Bairro</Label>
                <Input value={draft.bairro ?? ""} onChange={(e) => setD("bairro", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Cidade</Label>
                <Input value={draft.cidade} onChange={(e) => setD("cidade", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>UF</Label>
                <Input value={draft.uf} onChange={(e) => setD("uf", e.target.value.toUpperCase())} maxLength={2} />
              </div>
              <div className="space-y-1.5"><Label>Qtd módulos</Label>
                <Input type="number" value={draft.modulos} onChange={(e) => setD("modulos", Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5"><Label>Potência módulo (W)</Label>
                <Input type="number" value={draft.potenciaModuloW} onChange={(e) => setD("potenciaModuloW", Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5"><Label>kWp (auto)</Label>
                <Input value={kwpAuto ? kwpAuto.toFixed(2) : ""} readOnly className="bg-muted font-mono" />
              </div>
              <div className="space-y-1.5"><Label>Valor do projeto (R$) *</Label>
                <Input type="number" step="0.01" value={draft.valor ?? 0} onChange={(e) => setD("valor", Number(e.target.value) || 0)} placeholder="Obrigatório" />
              </div>
              <div className="space-y-1.5"><Label>Inversor 1</Label>
                <Input value={draft.inversor} onChange={(e) => setD("inversor", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Inversor 2</Label>
                <Input value={draft.inv2 ?? ""} onChange={(e) => setD("inv2", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Inversor 3</Label>
                <Input value={draft.inv3 ?? ""} onChange={(e) => setD("inv3", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Equipe</Label>
                <Input value={draft.equipe} onChange={(e) => setD("equipe", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Início previsto</Label>
                <Input type="date" value={draft.inicio} onChange={(e) => setD("inicio", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Conclusão prevista</Label>
                <Input type="date" value={draft.previsto} onChange={(e) => setD("previsto", e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-3"><Label>Observação</Label>
                <Textarea value={draft.obs} onChange={(e) => setD("obs", e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button className="bg-primary text-primary-foreground" onClick={adicionar}><Plus className="mr-2 h-4 w-4" /> Adicionar projeto</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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

  const [openKpi, setOpenKpi] = useState<null | "gerados" | "assinados" | "pendentes" | "cancelados" | "ticket">(null);
  const listKpi =
    openKpi === "assinados" ? assinados :
    openKpi === "pendentes" ? pendentes :
    openKpi === "cancelados" ? cancelados :
    openKpi === "ticket" ? [...assinados].sort((a,b)=>b.valor-a.valor) :
    contratos;
  const titlesKpi: Record<string, string> = {
    gerados: "Contratos Gerados", assinados: "Contratos Assinados",
    pendentes: "Contratos Pendentes", cancelados: "Contratos Cancelados",
    ticket: "Análise de Ticket Médio",
  };

  return (
    <div className="space-y-5">
      {/* === KPIs PRINCIPAIS === */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><BarChart3 className="h-3.5 w-3.5 text-primary" /> KPIs Principais</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiBlock tone="primary" icon={FileText} label="Contratos Gerados" main={totalGer} sub={fmtBRL(valorGer)} extra={`${kwpGer.toFixed(1)} kWp · ${(kwhGer/1000).toFixed(0)} MWh/ano`} onView={() => setOpenKpi("gerados")} />
          <KpiBlock tone="success" icon={CheckCircle2} label="Assinados" main={assinados.length} sub={fmtBRL(valorAss)} extra={`${pctAss.toFixed(1)}% sobre gerados`} onView={() => setOpenKpi("assinados")} />
          <KpiBlock tone="warning" icon={Clock} label="Pendentes" main={pendentes.length} sub={fmtBRL(valorPend)} extra={`${pctPend.toFixed(1)}% sobre gerados`} onView={() => setOpenKpi("pendentes")} />
          <KpiBlock tone="destructive" icon={XCircle} label="Cancelados" main={cancelados.length} sub={fmtBRL(valorCanc)} extra={`${pctCanc.toFixed(1)}% cancelamento`} onView={() => setOpenKpi("cancelados")} />
          <KpiBlock tone="info" icon={TrendingUp} label="Ticket Médio" main={fmtBRL(ticket)} sub={`${assinados.length} assinados`} extra="por contrato assinado" onView={() => setOpenKpi("ticket")} />
        </div>
      </div>

      <Dialog open={openKpi !== null} onOpenChange={(v) => !v && setOpenKpi(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openKpi ? titlesKpi[openKpi] : ""}</DialogTitle>
            <DialogDescription>
              {listKpi.length} contrato(s) · Valor {fmtBRL(listKpi.reduce((s,c)=>s+c.valor,0))} · kWp {listKpi.reduce((s,c)=>s+c.kwp,0).toFixed(1)}
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
              <TableHead>Status</TableHead><TableHead>Data</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {listKpi.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">{c.vendedor}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
                  <TableCell className="text-right">{c.kwp.toFixed(1)}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{c.data}</TableCell>
                </TableRow>
              ))}
              {listKpi.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

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

// ============================================================
// Pedidos de venda — financeiro de cada projeto liberado
// ============================================================
function PedidosVendaTab({ contratos }: { contratos: Contrato[] }) {
  const aprovados = contratos.filter((c) => c.status === "Aprovado" && (c.projetos ?? []).length > 0);
  const [filtro, setFiltro] = useState("");
  const [editando, setEditando] = useState<Record<string, boolean>>({});
  const toggleEdit = (id: string) => setEditando((s) => ({ ...s, [id]: !s[id] }));

  const filtrados = aprovados.filter((c) => {
    const q = filtro.toLowerCase();
    if (!q) return true;
    return (
      c.id.toLowerCase().includes(q) ||
      c.cliente.toLowerCase().includes(q) ||
      (c.projetos ?? []).some((p) => p.id.toLowerCase().includes(q) || (p.tipo ?? "").toLowerCase().includes(q))
    );
  });

  const totalProjetosLiberados = aprovados.reduce(
    (s, c) => s + (c.projetos ?? []).filter((p) => p.enviadoEngenharia).length, 0,
  );
  const totalFinGerado = aprovados.reduce(
    (s, c) => s + (c.projetos ?? []).filter((p) => p.financeiroGerado).length, 0,
  );
  const totalPendente = aprovados.reduce(
    (s, c) => s + (c.projetos ?? []).filter((p) => !p.financeiroGerado).length, 0,
  );

  const gerarFinanceiro = (contrato: Contrato, projeto: ProjetoVinculado) => {
    if (!projeto.aprovado) { toast.error("Aprove o projeto antes de gerar o financeiro."); return; }
    const valorProj = Number(projeto.valor) || 0;
    if (valorProj <= 0) { toast.error("Defina o valor do projeto."); return; }
    const comp = composicaoSomaOk(contrato);
    if (!comp.ok) { toast.error(`Composição do contrato não fecha (diff ${fmtBRL(Math.abs(comp.diff))}). Edite no contrato.`); return; }
    const novos = calcularLancamentosProjeto(contrato, projeto);
    if (novos.length === 0) { toast.error("Nada a gerar — verifique composição e valor do projeto."); return; }
    removeLancamentosDoProjeto(projeto.id);
    appendLancamentos(novos as any);
    updateProjeto(contrato.id, projeto.id, {
      financeiroGerado: true,
      dataGeracaoFinanceiro: new Date().toISOString(),
      usuarioGeracao: "Operador",
    });
    toast.success(`${novos.length} lançamento(s) gerado(s) por rateio · ${projeto.id}`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold">Pedidos de venda</div>
            <div className="text-xs text-muted-foreground">Cada contrato aprovado lista seus projetos. Cada projeto tem financeiro próprio (forma de pagamento, parcelas, emissão, vencimento, competência).</div>
          </div>
          <Input className="max-w-xs" placeholder="Buscar por contrato, cliente ou projeto…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 text-xs">
          <KpiSmall icon={FileText} label="Contratos aprovados" value={String(aprovados.length)} />
          <KpiSmall icon={Layers} label="Projetos liberados" value={String(totalProjetosLiberados)} />
          <KpiSmall icon={CheckCircle2} label="Financeiro gerado" value={String(totalFinGerado)} positive />
          <KpiSmall icon={Clock} label="Pendentes de financeiro" value={String(totalPendente)} />
        </div>
      </Card>

      {filtrados.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum contrato aprovado com projetos. Aprove um contrato e cadastre projetos.
        </Card>
      ) : (
        <div className="space-y-4">
          {filtrados.map((contrato) => {
            const projs = contrato.projetos ?? [];
            const valorContrato = Number(contrato.valor) || 0;
            const soma = projs.reduce((s, p) => s + (Number(p.valor) || 0), 0);
            const diff = valorContrato - soma;
            const bate = Math.abs(diff) <= 0.5;
            return (
              <Card key={contrato.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Contrato {contrato.cliente}</span>
                    <span className="font-mono text-primary">{contrato.id}</span>
                    <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">APROVADO</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span>Valor total: <b className="font-mono">{fmtBRL(valorContrato)}</b></span>
                    <span>Soma projetos: <b className="font-mono">{fmtBRL(soma)}</b></span>
                    <span className={bate ? "text-emerald-600" : "text-destructive"}>
                      Diferença: <b className="font-mono">{fmtBRL(Math.abs(diff))}</b> {bate ? "✓" : (diff > 0 ? "(faltam)" : "(excesso — requer aprovação)")}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {projs.map((projeto) => {
                    const open = !!editando[projeto.id];
                    const totalParc = (projeto.parcelasPagto ?? []).reduce((a, p) => a + (Number(p.valor) || 0), 0);
                    const valorProj = Number(projeto.valor) || 0;
                    const parcOk = valorProj > 0 && Math.abs(totalParc - valorProj) <= 0.5;
                    return (
                      <div key={projeto.id} className="rounded-md border bg-card">
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                          <div className="flex flex-wrap items-center gap-2 text-sm min-w-0">
                            <Layers className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-mono text-primary font-bold">{projeto.id}</span>
                            <span className="font-semibold truncate">{projeto.tipo || "Projeto"}</span>
                            <span className="text-muted-foreground">·</span>
                            <span>Valor: <b className="font-mono">{fmtBRL(valorProj)}</b></span>
                            {projeto.enviadoEngenharia
                              ? <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">LIBERADO</span>
                              : <span className="text-[10px] rounded bg-warning/15 px-2 py-0.5 text-warning font-bold">NÃO LIBERADO</span>}
                            {projeto.financeiroGerado
                              ? <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">FIN. GERADO</span>
                              : <span className="text-[10px] rounded bg-muted px-2 py-0.5 text-muted-foreground font-bold">SEM FIN.</span>}
                            {(projeto.parcelasPagto?.length ?? 0) > 0 && (
                              <span className={`text-[10px] rounded px-2 py-0.5 font-bold ${parcOk ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}`}>
                                Parcelas {fmtBRL(totalParc)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => toggleEdit(projeto.id)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" /> {open ? "Fechar" : "Editar financeiro"}
                            </Button>
                            <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => gerarFinanceiro(contrato, projeto)}>
                              <DollarSign className="mr-1 h-4 w-4" /> {projeto.financeiroGerado ? "Atualizar" : "Gerar"} financeiro
                            </Button>
                          </div>
                        </div>
                        {open && (
                          <div className="border-t p-3">
                            <ProjetoFinanceiro contrato={contrato} projeto={projeto} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
