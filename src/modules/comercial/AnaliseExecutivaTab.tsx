/**
 * Comercial — Análise Executiva + Indicadores avançados.
 * Extraído de `src/routes/comercial.tsx` em C-ENT.11.a (split puro, ZERO mudança funcional).
 * `IndicadoresTab` segue exportado (consumido também por `/dashboard`).
 */
import { useState } from "react";
import {
  Activity, AlertTriangle, Award, BarChart3, CheckCircle2, Clock, DollarSign, FileText,
  Filter, Gauge, Percent, Sun, TrendingUp, Users, XCircle, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Funnel, FunnelChart,
  LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/app/StatusBadge";
import { evolucaoMensal, fmtBRL } from "@/lib/mock-data";
import { KpiBlock, KpiSmall, type Contrato, type Vendedor, type VolumeMes } from "./_shared";

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

export function AnaliseExecutivaTab({
  contratos, vendedoresList, volume,
}: { contratos: Contrato[]; vendedoresList: Vendedor[]; volume: VolumeMes[] }) {
  const total = contratos.reduce((s, c) => s + c.valor, 0);
  const mediaVendedor = vendedoresList.reduce((s, v) => s + v.vendido, 0) / Math.max(vendedoresList.length, 1);
  const baixo = vendedoresList.filter((v) => v.vendido < mediaVendedor);
  const pendentes = contratos.filter((c) => c.status === "Pendente");
  const totalPropostas = volume.reduce((s, v) => s + v.qtd, 0);
  const assinados = contratos.filter((c) => c.status === "Assinado").length;
  const conv = (assinados / Math.max(totalPropostas, 1)) * 100;
  const projecao = total * 1.12;

  const alertas: { tipo: "warning" | "destructive" | "info"; titulo: string; descricao: string }[] = [
    { tipo: "warning", titulo: `${baixo.length} vendedor(es) abaixo da média`, descricao: baixo.map(v => v.nome).join(", ") || "—" },
    { tipo: "destructive", titulo: `${pendentes.length} contrato(s) pendente(s)`, descricao: pendentes.length > 0 ? `Valor parado: ${fmtBRL(pendentes.reduce((s, c) => s + c.valor, 0))}` : "Sem pendências críticas" },
    { tipo: "info", titulo: `Conversão propostas → contratos: ${conv.toFixed(1)}%`, descricao: conv >= 60 ? "Acima da meta operacional" : "Abaixo da meta — revisar funil" },
    { tipo: "info", titulo: `Projeção próximos 30 dias`, descricao: `${fmtBRL(projecao)} (+12% vs período atual)` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {alertas.map((a, i) => (
          <Card key={i} className="p-4">
            <div className={`mb-2 inline-flex items-center gap-1 text-xs font-semibold ${a.tipo === "destructive" ? "text-destructive" : a.tipo === "warning" ? "text-warning" : "text-info"}`}>
              <AlertTriangle className="h-3.5 w-3.5" /> {a.titulo}
            </div>
            <div className="text-sm text-muted-foreground">{a.descricao}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Cumprimento de meta por vendedor</div>
        <div className="space-y-3">
          {[...vendedoresList].sort((a, b) => b.vendido - a.vendido).map((v) => {
            const pct = (v.vendido / Math.max(v.meta, 1)) * 100;
            return (
              <div key={v.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{v.nome}</span>
                  <span className="text-muted-foreground">{fmtBRL(v.vendido)} / {fmtBRL(v.meta)} <span className={`ml-2 font-semibold ${pct >= 100 ? "text-success" : pct >= 80 ? "text-info" : "text-warning"}`}>{pct.toFixed(0)}%</span></span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${pct >= 100 ? "bg-success" : pct >= 80 ? "bg-info" : "bg-warning"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
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
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="vendido" stroke="var(--chart-1)" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ---------------- INDICADORES (KPIs avançados) ---------------- */

export function IndicadoresTab({
  contratos, vendedoresList, propostas, volume,
}: { contratos: Contrato[]; vendedoresList: any[]; propostas: any[]; volume: VolumeMes[] }) {
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
  const kwhGer = kwpGer * 130 * 12;

  const valorAss = sumValor(assinados);
  const kwpAss = sumKwp(assinados);
  const valorPend = sumValor(pendentes);
  const valorCanc = sumValor(cancelados);

  const pctAss = (assinados.length / Math.max(totalGer, 1)) * 100;
  const pctPend = (pendentes.length / Math.max(totalGer, 1)) * 100;
  const pctCanc = (cancelados.length / Math.max(totalGer, 1)) * 100;
  const ticket = valorAss / Math.max(assinados.length, 1);

  const modulosTotal = sumModulos(assinados);
  const inversoresMedia = assinados.length > 0 ? (assinados.reduce((s, c) => s + Math.max(1, Math.ceil(c.kwp / 15)), 0) / assinados.length) : 0;
  const modulosMedia = modulosTotal / Math.max(assinados.length, 1);
  const potenciaMedia = kwpAss / Math.max(assinados.length, 1);
  const ticketKwp = valorAss / Math.max(kwpAss, 1);

  const kwhMedio = potenciaMedia * 106.7136512;
  const parametroMedio = ticketKwp;
  const valorMedioVenda = assinados.length > 0 ? valorAss / assinados.length : 0;
  const hoje = new Date();
  const diasDesde = (d: string) => Math.max(0, Math.round((hoje.getTime() - new Date(d).getTime()) / 86400000));
  const assComData = assinados.filter((c: any) => c.dataAssinatura);
  const tempoMedioAssinatura = assComData.length > 0
    ? assComData.reduce((s, c: any) => {
        const dias = Math.max(0, Math.round((new Date(c.dataAssinatura).getTime() - new Date(c.data).getTime()) / 86400000));
        return s + dias;
      }, 0) / assComData.length
    : (assinados.length > 0
        ? assinados.reduce((s, c) => s + Math.min(diasDesde(c.data), 30), 0) / assinados.length
        : 0);
  const tempoMedioPendente = pendentes.length > 0
    ? pendentes.reduce((s, c) => s + diasDesde(c.data), 0) / pendentes.length
    : 0;

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

  const sazonalidade = SERIE_ANOS.map((m) => ({ mes: m.mes, media: (m["2024"] + m["2025"]) / 2 }));

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

  const totalPropostas = volume.reduce((s, v) => s + v.qtd, 0) || propostas.length;
  const funil = [
    { name: "Propostas", value: totalPropostas, fill: "var(--chart-1)" },
    { name: "Gerados", value: totalGer, fill: "var(--chart-3)" },
    { name: "Pendentes", value: pendentes.length, fill: "var(--chart-4)" },
    { name: "Assinados", value: assinados.length, fill: "var(--chart-2)" },
    { name: "Cancelados", value: cancelados.length, fill: "var(--chart-5)" },
  ];

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
    openKpi === "ticket" ? [...assinados].sort((a, b) => b.valor - a.valor) :
    contratos;
  const titlesKpi: Record<string, string> = {
    gerados: "Contratos Gerados", assinados: "Contratos Assinados",
    pendentes: "Contratos Pendentes", cancelados: "Contratos Cancelados",
    ticket: "Análise de Ticket Médio",
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><BarChart3 className="h-3.5 w-3.5 text-primary" /> KPIs Principais</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiBlock tone="primary" icon={FileText} label="Contratos Gerados" main={totalGer} sub={fmtBRL(valorGer)} extra={`${kwpGer.toFixed(1)} kWp · ${(kwhGer / 1000).toFixed(0)} MWh/ano`} onView={() => setOpenKpi("gerados")} />
          <KpiBlock tone="success" icon={CheckCircle2} label="Assinados" main={assinados.length} sub={fmtBRL(valorAss)} extra={`${pctAss.toFixed(1)}% sobre gerados`} onView={() => setOpenKpi("assinados")} />
          <KpiBlock tone="warning" icon={Clock} label="Pendentes" main={pendentes.length} sub={fmtBRL(valorPend)} extra={`${pctPend.toFixed(1)}% sobre gerados`} onView={() => setOpenKpi("pendentes")} />
          <KpiBlock tone="destructive" icon={XCircle} label="Cancelados" main={cancelados.length} sub={fmtBRL(valorCanc)} extra={`${pctCanc.toFixed(1)}% cancelamento`} onView={() => setOpenKpi("cancelados")} />
          <KpiBlock tone="info" icon={TrendingUp} label="Ticket Médio" main={fmtBRL(ticket)} sub={`${assinados.length} assinados`} extra="por contrato assinado" onView={() => setOpenKpi("ticket")} />
        </div>
      </div>

      <Dialog open={openKpi !== null} onOpenChange={(v) => !v && setOpenKpi(null)}>
        <DialogContent className="max-w-[1400px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openKpi ? titlesKpi[openKpi] : ""}</DialogTitle>
            <DialogDescription>
              {listKpi.length} contrato(s) · Valor {fmtBRL(listKpi.reduce((s, c) => s + c.valor, 0))} · kWp {listKpi.reduce((s, c) => s + c.kwp, 0).toFixed(1)}
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

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Sun className="h-3.5 w-3.5 text-warning" /> KPIs Técnico/Energético</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiSmall icon={Zap} label="kWp total vendido" value={`${kwpAss.toFixed(1)} kWp`} />
          <KpiSmall icon={Sun} label="kWh projetado/ano" value={`${(kwpAss * 130 * 12 / 1000).toFixed(1)} MWh`} />
          <KpiSmall icon={Activity} label="Módulos / contrato" value={modulosMedia.toFixed(1)} />
          <KpiSmall icon={Activity} label="Inversores / contrato" value={inversoresMedia.toFixed(1)} />
          <KpiSmall icon={Gauge} label="Potência média" value={`${potenciaMedia.toFixed(1)} kWp`} />
          <KpiSmall icon={DollarSign} label="Ticket por kWp" value={fmtBRL(ticketKwp)} />
          <KpiSmall icon={TrendingUp} label="Crescimento mensal" value={`${cresMensal >= 0 ? "+" : ""}${cresMensal.toFixed(1)}%`} positive={cresMensal >= 0} />
          <KpiSmall icon={TrendingUp} label="Crescimento anual" value={`${cresAnual >= 0 ? "+" : ""}${cresAnual.toFixed(1)}%`} positive={cresAnual >= 0} />
          <KpiSmall icon={Activity} label="Vendido 2026 (real)" value={fmtBRL(ult2026Real)} />
          <KpiSmall icon={Sun} label="kWh médio (mensal)" value={`${kwhMedio.toFixed(0)} kWh`} />
          <KpiSmall icon={Gauge} label="Parâmetro médio (R$/kWp)" value={fmtBRL(parametroMedio)} />
          <KpiSmall icon={DollarSign} label="Valor médio de venda" value={fmtBRL(valorMedioVenda)} />
          <KpiSmall icon={Clock} label="Tempo médio p/ assinatura" value={`${tempoMedioAssinatura.toFixed(1)} dias`} />
          <KpiSmall icon={Clock} label="Tempo médio pendente" value={`${tempoMedioPendente.toFixed(1)} dias`} />
        </div>
      </div>

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
              <Pie data={pizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} label={(e: { name: string; percent: number }) => `${e.name} ${(e.percent * 100).toFixed(0)}%`}>
                {pizza.map((p, i) => <Cell key={i} fill={p.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Evolução Mensal — 2024 · 2025 · 2026 (com projeção)</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={SERIE_ANOS}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="2024" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="2025" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="2026" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="projecao" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Projeção 2026" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> Sazonalidade — média mensal (2024-2025)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sazonalidade}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Bar dataKey="media" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Performance por Vendedor</div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={porVendedor}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="primeiro" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="valor" fill="var(--chart-1)" name="Valor R$" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="qtd" fill="var(--chart-2)" name="Contratos" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="kwp" stroke="var(--chart-4)" strokeWidth={2.5} name="kWp" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

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
