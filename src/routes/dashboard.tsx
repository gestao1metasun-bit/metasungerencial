import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FileText, CheckCircle2, Clock, XCircle, DollarSign, Banknote,
  HardHat, TrendingUp, Activity, AlertTriangle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Line, Legend, ComposedChart, Area, AreaChart,
} from "recharts";
import { useAditivos, isPendente as isAditivoPendente } from "@/lib/aditivos-store";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTabFromHash } from "@/lib/route-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { contratos, evolucaoMensal, financiamentos, obras, vendedores, propostas, fmtBRL } from "@/lib/mock-data";
import { useContratos } from "@/lib/contratos-store";
import { IndicadoresTab } from "@/routes/comercial";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Geral — Meta Sun Gerencial" }] }),
  component: DashboardGeral,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function DashboardGeral() {
  const [tab, setTab] = useTabFromHash("/dashboard");
  const liveContratos = useContratos();
  const aditivos = useAditivos();
  const aditivosPendentes = aditivos.filter(isAditivoPendente);

  const total = contratos.length;
  const assinadosList = contratos.filter((c) => c.status === "Assinado");
  const pendentesList = contratos.filter((c) => c.status === "Pendente");
  const canceladosList = contratos.filter((c) => c.status === "Cancelado");
  const geradosList = contratos.filter((c) => c.status === "Gerado");
  const assinados = assinadosList.length;
  const pendentes = pendentesList.length;
  const cancelados = canceladosList.length;
  const valorVendido = assinadosList.reduce((s, c) => s + c.valor, 0);
  const valorFinanciado = financiamentos.reduce((s, f) => s + f.valorFinanciado, 0);
  const obrasAtivasList = obras.filter((o) => o.status !== "Finalizado");
  const obrasAtivas = obrasAtivasList.length;
  const ticketMedio = valorVendido / Math.max(assinados, 1);
  const kwpTotal = contratos.reduce((s, c) => s + c.kwp, 0);
  const obrasFinalizadasList = obras.filter((o) => o.status === "Finalizado");
  const kwpInstalado = obrasFinalizadasList.reduce((s, o) => s + o.potencia, 0);

  const statusData = [
    { name: "Assinado", value: assinados },
    { name: "Pendente", value: pendentes },
    { name: "Gerado", value: geradosList.length },
    { name: "Cancelado", value: cancelados },
  ];

  const vendedoresData = vendedores.map((v) => ({ nome: v.nome.split(" ")[0], vendido: v.vendido }));

  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const evolGerAss = useMemo(() => {
    const map = new Map<string, { mes: string; gerados: number; assinados: number; valorAssinado: number }>();
    MESES.forEach((m) => map.set(m, { mes: m, gerados: 0, assinados: 0, valorAssinado: 0 }));
    contratos.forEach((c) => {
      const m = MESES[new Date(c.data).getMonth()];
      const r = map.get(m)!;
      r.gerados += 1;
      if (c.status === "Assinado") { r.assinados += 1; r.valorAssinado += c.valor; }
    });
    return Array.from(map.values()).filter((r, i) => i <= 5 || r.gerados > 0 || r.assinados > 0);
  }, []);

  type ModalKey = "contratos" | "assinados" | "pendentes" | "cancelados" | "valor" | "fin" | "obras" | "ticket" | "kwp" | "kwpInst";
  const [openModal, setOpenModal] = useState<null | ModalKey>(null);
  const open = (k: ModalKey) => () => setOpenModal(k);

  return (
    <>
      <PageHeader
        title="Dashboard Geral"
        subtitle="Visão consolidada de todos os módulos."
        actions={
          <Select defaultValue="mes">
            <SelectTrigger className="w-52 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="ontem">Ontem</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="15d">Últimos 15 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="mesAnt">Mês anterior</SelectItem>
              <SelectItem value="trim">Trimestre</SelectItem>
              <SelectItem value="semestre">Semestre</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
              <SelectItem value="anoAnt">Ano anterior</SelectItem>
              <SelectItem value="tudo">Todo o período</SelectItem>
              <SelectItem value="custom">Personalizado…</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            <StatCard label="Contratos" value={total} icon={FileText} tone="primary" hint={`${assinados} assinados`} onView={open("contratos")} />
            <StatCard label="Assinados" value={assinados} icon={CheckCircle2} tone="success" trend={{ value: "+12% mês", positive: true }} onView={open("assinados")} />
            <StatCard label="Pendentes" value={pendentes} icon={Clock} tone="warning" onView={open("pendentes")} />
            <StatCard label="Cancelados" value={cancelados} icon={XCircle} tone="destructive" onView={open("cancelados")} />
            <StatCard label="Valor vendido" value={fmtBRL(valorVendido)} icon={DollarSign} tone="primary" onView={open("valor")} />
            <StatCard label="Total financiado" value={fmtBRL(valorFinanciado)} icon={Banknote} tone="info" onView={open("fin")} />
            <StatCard label="Obras em andamento" value={obrasAtivas} icon={HardHat} tone="info" onView={open("obras")} />
            <StatCard label="Ticket médio" value={fmtBRL(ticketMedio)} icon={TrendingUp} tone="primary" />
            <StatCard label="kWp vendido" value={`${kwpTotal.toFixed(1)}`} icon={TrendingUp} tone="warning" hint="kWp totais" />
            <StatCard label="kWp instalado" value={`${kwpInstalado.toFixed(1)}`} icon={CheckCircle2} tone="success" hint={`${obrasFinalizadasList.length} obras finalizadas`} />
          </div>

          {aditivosPendentes.length > 0 && (
            <Card className="mt-4 p-4 border-warning/40 bg-warning/5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-warning/15 text-warning">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {aditivosPendentes.length} aditivo{aditivosPendentes.length > 1 ? "s" : ""} pendente{aditivosPendentes.length > 1 ? "s" : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Contratos com alterações em andamento. Operações sensíveis estão travadas até aprovação.
                    </div>
                  </div>
                </div>
                <Link to="/comercial" hash="tab=aditivos" className="text-xs font-semibold text-primary hover:underline">
                  Gerenciar aditivos →
                </Link>
              </div>
            </Card>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="p-5 bg-[image:var(--gradient-card)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Evolução: Gerados × Assinados</div>
                  <div className="text-xs text-muted-foreground">Quantidade mensal de contratos gerados e assinados</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={evolGerAss}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="gerados" fill="var(--chart-1)" radius={[4,4,0,0]} name="Gerados" />
                  <Bar dataKey="assinados" fill="var(--chart-2)" radius={[4,4,0,0]} name="Assinados" />
                  <Line type="monotone" dataKey="assinados" stroke="var(--chart-4)" strokeWidth={2.5} dot={{ r: 3 }} name="Tendência assinados" />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 bg-[image:var(--gradient-card)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Evolução mensal — Vendido × Financiado</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={evolucaoMensal}>
                  <defs>
                    <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="vendido" stroke="var(--chart-1)" fill="url(#gV)" strokeWidth={2} />
                  <Area type="monotone" dataKey="financiado" stroke="var(--chart-2)" fill="url(#gF)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 bg-[image:var(--gradient-card)]">
              <div className="mb-4 text-sm font-semibold">Contratos por status</div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 bg-[image:var(--gradient-card)]">
              <div className="mb-4 text-sm font-semibold">Vendido por vendedor</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={vendedoresData} layout="vertical">
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} width={80} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="vendido" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="indicadores" className="mt-5">
          <IndicadoresTab
            contratos={liveContratos as any}
            vendedoresList={vendedores as any}
            propostas={propostas as any}
            volume={[]}
          />
        </TabsContent>
      </Tabs>

      <DetailModal
        open={openModal !== null}
        onClose={() => setOpenModal(null)}
        modal={openModal}
        data={{
          contratos, assinadosList, pendentesList, canceladosList,
          obrasAtivasList, obrasFinalizadasList, financiamentos,
          valorVendido, valorFinanciado, ticketMedio, kwpTotal, kwpInstalado,
        }}
      />
    </>
  );
}

function DetailModal({
  open, onClose, modal, data,
}: {
  open: boolean; onClose: () => void; modal: string | null;
  data: {
    contratos: typeof contratos; assinadosList: typeof contratos; pendentesList: typeof contratos;
    canceladosList: typeof contratos; obrasAtivasList: typeof obras; obrasFinalizadasList: typeof obras;
    financiamentos: typeof financiamentos;
    valorVendido: number; valorFinanciado: number; ticketMedio: number; kwpTotal: number; kwpInstalado: number;
  };
}) {
  if (!modal) return null;
  const titles: Record<string, string> = {
    contratos: "Todos os contratos", assinados: "Contratos assinados",
    pendentes: "Contratos pendentes", cancelados: "Contratos cancelados",
    valor: "Detalhamento — Valor vendido", fin: "Financiamentos ativos",
    obras: "Obras em andamento", ticket: "Análise de ticket médio",
    kwp: "kWp por contrato", kwpInst: "kWp instalado (obras finalizadas)",
  };
  const list =
    modal === "assinados" ? data.assinadosList :
    modal === "pendentes" ? data.pendentesList :
    modal === "cancelados" ? data.canceladosList :
    modal === "ticket" ? data.assinadosList :
    modal === "valor" ? [...data.assinadosList].sort((a,b)=>b.valor-a.valor) :
    modal === "kwp" ? [...data.contratos].sort((a,b)=>b.kwp-a.kwp) :
    data.contratos;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[1400px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[modal]}</DialogTitle>
          <DialogDescription>
            {modal === "fin" && `${data.financiamentos.length} financiamentos · ${fmtBRL(data.valorFinanciado)}`}
            {modal === "obras" && `${data.obrasAtivasList.length} obras em andamento`}
            {!["fin","obras"].includes(modal) && `${list.length} registros · Ticket médio ${fmtBRL(data.ticketMedio)}`}
          </DialogDescription>
        </DialogHeader>

        {modal === "fin" ? (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>ID</TableHead><TableHead>Cliente</TableHead><TableHead>Banco</TableHead>
              <TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.financiamentos.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs text-primary">{f.id}</TableCell>
                  <TableCell>{f.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">{f.banco}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRL(f.valorFinanciado)}</TableCell>
                  <TableCell><StatusBadge status={f.statusOp} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (modal === "obras" || modal === "kwpInst") ? (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>Obra</TableHead><TableHead>Cliente</TableHead><TableHead>Equipe</TableHead>
              <TableHead className="text-right">Módulos</TableHead><TableHead className="text-right">kWp</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(modal === "kwpInst" ? data.obrasFinalizadasList : data.obrasAtivasList).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs text-primary">{o.id}</TableCell>
                  <TableCell>{o.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">{o.equipe}</TableCell>
                  <TableCell className="text-right">{o.modulos}</TableCell>
                  <TableCell className="text-right">{o.potencia.toFixed(1)}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
              <TableHead>Status</TableHead><TableHead>Data</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map((c) => (
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
              {list.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
