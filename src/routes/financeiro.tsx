import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, Wallet, Clock, AlertCircle, FileSpreadsheet,
  TrendingUp, Plus, SquarePen, Trash2, Repeat, Building2, Layers, Filter,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, Legend, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTabFromHash } from "@/lib/route-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtBRL, contasReceber, contasPagar } from "@/lib/mock-data";
import {
  useLancamentos, useRecorrentes, useCentrosCusto, useNaturezas,
  fmtBRLPrecise, derivarStatusFin, setStatusFin, STATUS_FIN,
  type Lancamento, type Camada, type Tipo, type DespesaRecorrente, type Recorrencia, type StatusFin,
} from "@/lib/financeiro-store";
import { TitulosTab } from "@/modules/financeiro/TitulosTab";
import { FornecedoresTab } from "@/modules/financeiro/FornecedoresTab";
import { FechamentoTab } from "@/modules/financeiro/FechamentoTab";
import { ConciliacaoTab } from "@/modules/financeiro/ConciliacaoTab";
import { CadastrosTab } from "@/modules/financeiro/CadastrosTab";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Meta Sun Gerencial" }] }),
  component: FinanceiroPage,
});

const CAMADAS: Camada[] = ["Realizado", "Confirmado", "Previsto", "A realizar", "Orçado futuro"];
const PERIODOS = ["Diário", "Semanal", "Mensal", "Anual"] as const;
type Periodo = typeof PERIODOS[number];

function fmtBR(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function FinanceiroPage() {
  const [tab, setTab] = useTabFromHash("/financeiro");
  const [lancs, setLancs] = useLancamentos();
  const [recs, setRecs] = useRecorrentes();
  const [centros, setCentros] = useCentrosCusto();
  const [naturezas, setNaturezas] = useNaturezas();

  // KPIs gerais
  const realizadoEntradas = lancs.filter(l => l.camada === "Realizado" && l.tipo === "Entrada").reduce((s, l) => s + l.valor, 0);
  const realizadoSaidas = lancs.filter(l => l.camada === "Realizado" && l.tipo === "Saída").reduce((s, l) => s + l.valor, 0);
  const saldo = realizadoEntradas - realizadoSaidas;
  const confirmadoNet = lancs.filter(l => l.camada === "Confirmado").reduce((s, l) => s + (l.tipo === "Entrada" ? l.valor : -l.valor), 0);
  const previstoNet = lancs.filter(l => l.camada === "Previsto" || l.camada === "A realizar").reduce((s, l) => s + (l.tipo === "Entrada" ? l.valor : -l.valor), 0);
  const fixasMensais = recs.filter(r => r.ativa && r.recorrencia === "Mensal").reduce((s, r) => s + r.valor, 0);
  const obrasSaidas = lancs.filter(l => l.obra && l.tipo === "Saída").reduce((s, l) => s + l.valor, 0);
  const obrasEntradas = lancs.filter(l => l.obra && l.tipo === "Entrada").reduce((s, l) => s + l.valor, 0);

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Fluxo de caixa operacional + estrutura fixa — obras, despesas, receitas e previsões consolidadas."
        actions={<HeaderActions
          tab={tab}
          centros={centros} naturezas={naturezas}
          setLancs={setLancs} setRecs={setRecs}
          setCentros={setCentros} setNaturezas={setNaturezas}
        />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="recorrentes">Despesas fixas</TabsTrigger>
          <TabsTrigger value="gerencial">Visão gerencial</TabsTrigger>
          <TabsTrigger value="centros">Centros & Naturezas (legado)</TabsTrigger>
          <TabsTrigger value="cadastros">Cadastros estruturais</TabsTrigger>
          <TabsTrigger value="receber">A receber</TabsTrigger>
          <TabsTrigger value="pagar">A pagar</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="mt-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Saldo realizado" value={fmtBRL(saldo)} hint="Entradas − Saídas · ir p/ Fluxo" icon={Wallet} tone={saldo >= 0 ? "success" : "destructive"} onClick={() => setTab("fluxo")} />
            <StatCard label="Confirmado (líq.)" value={fmtBRL(confirmadoNet)} hint="ir p/ A receber" icon={ArrowDownCircle} tone="info" onClick={() => setTab("receber")} />
            <StatCard label="Previsto + A realizar" value={fmtBRL(previstoNet)} hint="ir p/ Lançamentos" icon={TrendingUp} tone="primary" onClick={() => setTab("lancamentos")} />
            <StatCard label="Despesas fixas/mês" value={fmtBRL(fixasMensais)} hint="ir p/ Despesas fixas" icon={Repeat} tone="warning" onClick={() => setTab("recorrentes")} />
            <StatCard label="Saídas obras" value={fmtBRL(obrasSaidas)} hint="ir p/ A pagar" icon={ArrowUpCircle} tone="destructive" onClick={() => setTab("pagar")} />
            <StatCard label="Entradas obras" value={fmtBRL(obrasEntradas)} hint="ir p/ A receber" icon={ArrowDownCircle} tone="success" onClick={() => setTab("receber")} />
            <StatCard label="Margem obras" value={fmtBRL(obrasEntradas - obrasSaidas)} hint="ir p/ DRE" icon={Wallet} tone={obrasEntradas - obrasSaidas >= 0 ? "success" : "destructive"} onClick={() => setTab("dre")} />
            <StatCard label="Custo empresa (fixo)" value={fmtBRL(fixasMensais)} hint="Sem obras · ir p/ Gerencial" icon={Building2} tone="muted" onClick={() => setTab("gerencial")} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card className="p-5 bg-[image:var(--gradient-card)]">
              <div className="mb-3 text-sm font-semibold">Projeção de caixa</div>
              <ProjecaoCaixa lancs={lancs} />
            </Card>
            <Card className="p-5 bg-[image:var(--gradient-card)]">
              <div className="mb-3 text-sm font-semibold">Saídas por natureza</div>
              <PorNatureza lancs={lancs} />
            </Card>
          </div>
        </TabsContent>

        {/* FLUXO */}
        <TabsContent value="fluxo" className="mt-5">
          <FluxoCaixa lancs={lancs} />
        </TabsContent>

        {/* LANÇAMENTOS */}
        <TabsContent value="lancamentos" className="mt-5">
          <LancamentosTab lancs={lancs} setLancs={setLancs} centros={centros} naturezas={naturezas} />
        </TabsContent>

        {/* RECORRENTES */}
        <TabsContent value="recorrentes" className="mt-5">
          <RecorrentesTab recs={recs} setRecs={setRecs} centros={centros} naturezas={naturezas} />
        </TabsContent>

        {/* GERENCIAL */}
        <TabsContent value="gerencial" className="mt-5">
          <GerencialTab lancs={lancs} fixas={fixasMensais} />
        </TabsContent>

        {/* CENTROS */}
        <TabsContent value="centros" className="mt-5">
          <CentrosNaturezasTab
            centros={centros} naturezas={naturezas}
            setCentros={setCentros} setNaturezas={setNaturezas}
          />
        </TabsContent>

        <TabsContent value="cadastros" className="mt-5">
          <CadastrosTab />
        </TabsContent>


        <TabsContent value="receber" className="mt-5">
          <TitulosTab tipo="AR" />
        </TabsContent>

        <TabsContent value="pagar" className="mt-5">
          <TitulosTab tipo="AP" />
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-5">
          <FornecedoresTab />
        </TabsContent>

        <TabsContent value="conciliacao" className="mt-5">
          <ConciliacaoTab />
        </TabsContent>

        <TabsContent value="fechamento" className="mt-5">
          <FechamentoTab />
        </TabsContent>

        <TabsContent value="dre" className="mt-5">
          <DRETab lancs={lancs} fixas={fixasMensais} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ============== Projeção / Gráficos ============== */
function ProjecaoCaixa({ lancs }: { lancs: Lancamento[] }) {
  const [dias, setDias] = useState<30 | 60 | 90 | 180 | 365>(30);
  const data = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const map = new Map<string, { dia: string; entrada: number; saidaReal: number; saidaOrcada: number }>();
    for (let i = 0; i < dias; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      map.set(iso, { dia: `${d.getDate()}/${d.getMonth() + 1}`, entrada: 0, saidaReal: 0, saidaOrcada: 0 });
    }
    lancs.forEach((l) => {
      const b = map.get(l.data);
      if (!b) return;
      if (l.tipo === "Entrada") {
        b.entrada += l.valor;
      } else if (l.camada === "Realizado" || l.camada === "Confirmado") {
        b.saidaReal += l.valor;
      } else {
        b.saidaOrcada += l.valor;
      }
    });
    return Array.from(map.values());
  }, [lancs, dias]);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Select value={String(dias)} onValueChange={(v) => setDias(Number(v) as any)}>
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Próximos 30 dias</SelectItem>
            <SelectItem value="60">Próximos 60 dias</SelectItem>
            <SelectItem value="90">Próximos 90 dias</SelectItem>
            <SelectItem value="180">Próximos 6 meses</SelectItem>
            <SelectItem value="365">Próximos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} interval="preserveStartEnd" />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtBRL(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="entrada" name="Entradas" stroke="oklch(0.65 0.18 145)" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="saidaReal" name="Saídas lançadas" stroke="oklch(0.6 0.22 25)" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="saidaOrcada" name="Saídas orçadas" stroke="oklch(0.7 0.18 55)" strokeWidth={2.5} strokeDasharray="5 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary)", "var(--info)", "var(--warning)"];

function PorNatureza({ lancs }: { lancs: Lancamento[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    lancs.filter(l => l.tipo === "Saída").forEach(l => map.set(l.natureza, (map.get(l.natureza) || 0) + l.valor));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [lancs]);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => e.name}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtBRL(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ============== Fluxo de Caixa ============== */
function FluxoCaixa({ lancs }: { lancs: Lancamento[] }) {
  const [periodo, setPeriodo] = useState<Periodo>("Mensal");
  const [camadaFiltro, setCamadaFiltro] = useState<"Todas" | Camada>("Todas");

  const data = useMemo(() => {
    const filtered = lancs.filter(l => camadaFiltro === "Todas" || l.camada === camadaFiltro);
    const buckets = new Map<string, { periodo: string; entrada: number; saida: number }>();
    const keyOf = (d: string) => {
      const date = new Date(d);
      if (periodo === "Diário") return d;
      if (periodo === "Semanal") {
        const x = new Date(date); x.setDate(x.getDate() - x.getDay());
        return `Sem ${x.toISOString().slice(0, 10)}`;
      }
      if (periodo === "Anual") return d.slice(0, 4);
      return d.slice(0, 7);
    };
    filtered.forEach(l => {
      const k = keyOf(l.data);
      const b = buckets.get(k) || { periodo: k, entrada: 0, saida: 0 };
      if (l.tipo === "Entrada") b.entrada += l.valor; else b.saida += l.valor;
      buckets.set(k, b);
    });
    return Array.from(buckets.values()).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [lancs, periodo, camadaFiltro]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Camada</Label>
          <Select value={camadaFiltro} onValueChange={(v) => setCamadaFiltro(v as any)}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              {CAMADAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-3 text-sm font-semibold">Entradas × Saídas — {periodo}</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="periodo" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="entrada" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="saida" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="bg-[image:var(--gradient-card)]">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Período</TableHead>
            <TableHead className="text-right">Entradas</TableHead>
            <TableHead className="text-right">Saídas</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map(d => (
              <TableRow key={d.periodo}>
                <TableCell className="font-mono text-xs">{d.periodo}</TableCell>
                <TableCell className="text-right text-success">{fmtBRL(d.entrada)}</TableCell>
                <TableCell className="text-right text-destructive">{fmtBRL(d.saida)}</TableCell>
                <TableCell className={`text-right font-semibold ${d.entrada - d.saida >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(d.entrada - d.saida)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ============== Lançamentos ============== */
function LancamentosTab({ lancs, setLancs, centros, naturezas }: any) {
  const [busca, setBusca] = useState("");
  const [tipoF, setTipoF] = useState<"Todos" | Tipo>("Todos");
  const [camadaF, setCamadaF] = useState<"Todas" | Camada>("Todas");
  const [statusF, setStatusF] = useState<"Todos" | StatusFin>("Todos");
  const filtered = lancs.filter((l: Lancamento) => {
    if (tipoF !== "Todos" && l.tipo !== tipoF) return false;
    if (camadaF !== "Todas" && l.camada !== camadaF) return false;
    const sf = l.statusFin ?? derivarStatusFin(l.camada);
    if (statusF !== "Todos" && sf !== statusF) return false;
    if (busca && !`${l.descricao} ${l.natureza} ${l.centroCusto} ${l.obra ?? ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar descrição, natureza, obra…" className="max-w-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Select value={tipoF} onValueChange={(v) => setTipoF(v as any)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os tipos</SelectItem>
            <SelectItem value="Entrada">Entrada</SelectItem>
            <SelectItem value="Saída">Saída</SelectItem>
          </SelectContent>
        </Select>
        <Select value={camadaF} onValueChange={(v) => setCamadaF(v as any)}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as camadas</SelectItem>
            {CAMADAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusF} onValueChange={(v) => setStatusF(v as any)}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos status fin.</SelectItem>
            {STATUS_FIN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <NovoLancamentoDialog onSave={(l) => setLancs((p: Lancamento[]) => [l, ...p])} centros={centros} naturezas={naturezas} />
        </div>
      </div>

      <Card className="bg-[image:var(--gradient-card)]">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Natureza</TableHead>
            <TableHead>Centro</TableHead><TableHead>Obra</TableHead><TableHead>Camada</TableHead>
            <TableHead>Status fin.</TableHead>
            <TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((l: Lancamento) => {
              const sf = l.statusFin ?? derivarStatusFin(l.camada);
              return (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{fmtBR(l.data)}</TableCell>
                <TableCell className="font-medium">{l.descricao}</TableCell>
                <TableCell className="text-muted-foreground">{l.natureza}</TableCell>
                <TableCell className="text-muted-foreground">{l.centroCusto}</TableCell>
                <TableCell className="text-muted-foreground">{l.obra ?? "—"}</TableCell>
                <TableCell><StatusBadge status={l.camada} /></TableCell>
                <TableCell>
                  <Select
                    value={sf}
                    onValueChange={(v) => {
                      setStatusFin(l.id, v as StatusFin, "Operador");
                      setLancs((p: Lancamento[]) => p.map(x => x.id === l.id ? { ...x, statusFin: v as StatusFin } : x));
                    }}
                  >
                    <SelectTrigger className="h-7 w-[140px] border-0 bg-transparent p-0 [&>svg]:hidden">
                      <StatusBadge status={sf} />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FIN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><StatusBadge status={l.tipo} /></TableCell>
                <TableCell className={`text-right font-semibold ${l.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>
                  {l.tipo === "Entrada" ? "+" : "−"} {fmtBRLPrecise(l.valor)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => { setLancs((p: Lancamento[]) => p.filter(x => x.id !== l.id)); toast.success("Lançamento removido"); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function NovoLancamentoDialog({ onSave, centros, naturezas }: { onSave: (l: Lancamento) => void; centros: any[]; naturezas: any[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Lancamento>({
    id: "", data: new Date().toISOString().slice(0, 10), descricao: "", tipo: "Saída", valor: 0,
    camada: "Confirmado", statusFin: "Pagar", natureza: naturezas[0]?.nome ?? "", centroCusto: centros[0]?.nome ?? "",
    obra: "", empresa: "Meta Sun", filial: "Manaus", responsavel: "", obs: "",
  });
  const set = (k: keyof Lancamento, v: any) => setForm(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!form.descricao || form.valor <= 0) { toast.error("Preencha descrição e valor"); return; }
    onSave({ ...form, id: `L-${Date.now()}` });
    toast.success("Lançamento criado");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo lançamento</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Novo lançamento financeiro</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Data"><Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} /></Field>
          <Field label="Descrição"><Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} /></Field>
          <Field label="Tipo">
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Entrada">Entrada</SelectItem><SelectItem value="Saída">Saída</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Valor (R$)"><Input type="number" step="0.01" value={form.valor} onChange={(e) => set("valor", parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Camada">
            <Select value={form.camada} onValueChange={(v) => set("camada", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CAMADAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status financeiro">
            <Select value={form.statusFin ?? derivarStatusFin(form.camada)} onValueChange={(v) => set("statusFin", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_FIN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Natureza">
            <Select value={form.natureza} onValueChange={(v) => set("natureza", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{naturezas.filter((n: any) => n.tipo === form.tipo).map((n: any) => <SelectItem key={n.id} value={n.nome}>{n.nome}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Centro de custo">
            <Select value={form.centroCusto} onValueChange={(v) => set("centroCusto", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{centros.map((c: any) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Obra (opcional)"><Input placeholder="OB-0231" value={form.obra} onChange={(e) => set("obra", e.target.value)} /></Field>
          <Field label="Empresa"><Input value={form.empresa} onChange={(e) => set("empresa", e.target.value)} /></Field>
          <Field label="Filial"><Input value={form.filial} onChange={(e) => set("filial", e.target.value)} /></Field>
          <Field label="Observação" className="md:col-span-2"><Textarea value={form.obs} onChange={(e) => set("obs", e.target.value)} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}

/* ============== Recorrentes ============== */
const RECORRENCIAS: Recorrencia[] = ["Mensal", "Quinzenal", "Semanal", "Anual", "Personalizada", "Única"];

function RecorrentesTab({ recs, setRecs, centros, naturezas }: any) {
  const total = recs.filter((r: DespesaRecorrente) => r.ativa).reduce((s: number, r: DespesaRecorrente) => s + r.valor, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Total ativo: <span className="font-semibold text-foreground">{fmtBRL(total)}</span></div>
        <NovaRecorrenteDialog onSave={(r) => setRecs((p: DespesaRecorrente[]) => [r, ...p])} centros={centros} naturezas={naturezas} />
      </div>
      <Card className="bg-[image:var(--gradient-card)]">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Descrição</TableHead><TableHead>Natureza</TableHead><TableHead>Centro</TableHead>
            <TableHead>Recorrência</TableHead><TableHead>Vencto.</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead>Ativa</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {recs.map((r: DespesaRecorrente) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.descricao}</TableCell>
                <TableCell className="text-muted-foreground">{r.natureza}</TableCell>
                <TableCell className="text-muted-foreground">{r.centroCusto}</TableCell>
                <TableCell><StatusBadge status={r.recorrencia} /></TableCell>
                <TableCell className="text-muted-foreground">Dia {r.diaVencimento}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRLPrecise(r.valor)}</TableCell>
                <TableCell><Switch checked={r.ativa} onCheckedChange={(c) => setRecs((p: DespesaRecorrente[]) => p.map(x => x.id === r.id ? { ...x, ativa: c } : x))} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setRecs((p: DespesaRecorrente[]) => p.filter(x => x.id !== r.id))}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function NovaRecorrenteDialog({ onSave, centros, naturezas }: { onSave: (r: DespesaRecorrente) => void; centros: any[]; naturezas: any[] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<DespesaRecorrente>({
    id: "", descricao: "", valor: 0, recorrencia: "Mensal", diaVencimento: 5,
    natureza: naturezas[0]?.nome ?? "", centroCusto: centros[0]?.nome ?? "",
    empresa: "Meta Sun", filial: "Manaus", responsavel: "", ativa: true,
  });
  const set = (k: keyof DespesaRecorrente, v: any) => setF(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.descricao || f.valor <= 0) { toast.error("Preencha descrição e valor"); return; }
    onSave({ ...f, id: `R-${Date.now()}` });
    toast.success("Recorrente criada");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Repeat className="mr-2 h-4 w-4" /> Nova despesa fixa</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Despesa fixa / recorrente</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Descrição" className="md:col-span-2"><Input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} /></Field>
          <Field label="Valor (R$)"><Input type="number" step="0.01" value={f.valor} onChange={(e) => set("valor", parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Recorrência">
            <Select value={f.recorrencia} onValueChange={(v) => set("recorrencia", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RECORRENCIAS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Dia do vencimento"><Input type="number" min={1} max={28} value={f.diaVencimento} onChange={(e) => set("diaVencimento", parseInt(e.target.value) || 1)} /></Field>
          <Field label="Natureza">
            <Select value={f.natureza} onValueChange={(v) => set("natureza", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{naturezas.filter((n: any) => n.tipo === "Saída").map((n: any) => <SelectItem key={n.id} value={n.nome}>{n.nome}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Centro de custo">
            <Select value={f.centroCusto} onValueChange={(v) => set("centroCusto", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{centros.map((c: any) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Empresa"><Input value={f.empresa} onChange={(e) => set("empresa", e.target.value)} /></Field>
          <Field label="Filial"><Input value={f.filial} onChange={(e) => set("filial", e.target.value)} /></Field>
          <Field label="Responsável"><Input value={f.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== Gerencial ============== */
function GerencialTab({ lancs, fixas }: { lancs: Lancamento[]; fixas: number }) {
  const obrasSaidas = lancs.filter(l => l.obra && l.tipo === "Saída").reduce((s, l) => s + l.valor, 0);
  const obrasEntradas = lancs.filter(l => l.obra && l.tipo === "Entrada").reduce((s, l) => s + l.valor, 0);
  const margemObras = obrasEntradas - obrasSaidas;
  const custoEmpresaSemObras = fixas;
  const pontoEquilibrio = custoEmpresaSemObras / Math.max(0.0001, (obrasEntradas > 0 ? margemObras / obrasEntradas : 0.3));

  const porCentro = useMemo(() => {
    const map = new Map<string, number>();
    lancs.filter(l => l.tipo === "Saída").forEach(l => map.set(l.centroCusto, (map.get(l.centroCusto) || 0) + l.valor));
    return Array.from(map.entries()).map(([centro, valor]) => ({ centro, valor })).sort((a, b) => b.valor - a.valor);
  }, [lancs]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Custo p/ manter empresa" value={fmtBRL(custoEmpresaSemObras)} hint="Despesas fixas mensais" icon={Building2} tone="warning" />
        <StatCard label="Custo execução obras" value={fmtBRL(obrasSaidas)} icon={ArrowUpCircle} tone="destructive" />
        <StatCard label="Margem obras" value={fmtBRL(margemObras)} icon={Wallet} tone={margemObras >= 0 ? "success" : "destructive"} />
        <StatCard label="Ponto equilíbrio" value={fmtBRL(pontoEquilibrio)} hint="Receita p/ cobrir fixos" icon={TrendingUp} tone="info" />
      </div>
      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-3 text-sm font-semibold">Saídas por centro de custo</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={porCentro} layout="vertical">
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis type="category" dataKey="centro" width={140} stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtBRL(v)} />
            <Bar dataKey="valor" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ============== DRE ============== */
function DRETab({ lancs, fixas }: { lancs: Lancamento[]; fixas: number }) {
  const receitas = lancs.filter(l => l.tipo === "Entrada" && (l.camada === "Realizado" || l.camada === "Confirmado")).reduce((s, l) => s + l.valor, 0);
  const custoObras = lancs.filter(l => l.obra && l.tipo === "Saída").reduce((s, l) => s + l.valor, 0);
  const despAdmin = lancs.filter(l => !l.obra && l.tipo === "Saída").reduce((s, l) => s + l.valor, 0) + fixas;
  const impostos = receitas * 0.12;
  const liquida = receitas - impostos;
  const bruto = liquida - custoObras;
  const operacional = bruto - despAdmin;

  const rows = [
    { label: "Receita Bruta", valor: receitas, tone: "text-success" },
    { label: "(–) Impostos sobre vendas (12%)", valor: -impostos, tone: "text-destructive" },
    { label: "Receita Líquida", valor: liquida, tone: "font-semibold" },
    { label: "(–) Custos de obras", valor: -custoObras, tone: "text-destructive" },
    { label: "Lucro Bruto", valor: bruto, tone: "font-semibold" },
    { label: "(–) Despesas administrativas + fixas", valor: -despAdmin, tone: "text-destructive" },
    { label: "Resultado Operacional", valor: operacional, tone: "text-lg font-bold text-primary" },
  ];

  return (
    <Card className="bg-[image:var(--gradient-card)] p-6">
      <h2 className="text-lg font-semibold">DRE Gerencial</h2>
      <p className="mt-1 text-sm text-muted-foreground">Calculado a partir dos lançamentos realizados/confirmados + despesas fixas.</p>
      <div className="mt-6 space-y-3">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between border-b border-border pb-2 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={r.tone}>{fmtBRL(r.valor)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================ */
/* HEADER ACTIONS — botão certo para cada aba                   */
/* ============================================================ */
function HeaderActions({
  tab, centros, naturezas,
  setLancs, setRecs, setCentros, setNaturezas,
}: {
  tab: string;
  centros: any[]; naturezas: any[];
  setLancs: any; setRecs: any;
  setCentros: any; setNaturezas: any;
}) {
  switch (tab) {
    case "lancamentos":
    case "dashboard":
    case "fluxo":
    case "gerencial":
      return <NovoLancamentoDialog onSave={(l) => setLancs((p: Lancamento[]) => [l, ...p])} centros={centros} naturezas={naturezas} />;
    case "recorrentes":
      return <NovaRecorrenteDialog onSave={(r) => setRecs((p: DespesaRecorrente[]) => [r, ...p])} centros={centros} naturezas={naturezas} />;
    case "centros":
      return (
        <div className="flex gap-2">
          <CentroCustoDialog onSave={(c) => setCentros((p: any[]) => [c, ...p])} />
          <NaturezaDialog onSave={(n) => setNaturezas((p: any[]) => [n, ...p])} />
        </div>
      );
    // conciliacao/receber/pagar/fornecedores/fechamento/dre: ações ficam dentro da aba
    default:
      return null;
  }
}

/* ============================================================ */
/* CENTROS & NATUREZAS — CRUD                                   */
/* ============================================================ */
function CentrosNaturezasTab({
  centros, naturezas, setCentros, setNaturezas,
}: {
  centros: any[]; naturezas: any[];
  setCentros: any; setNaturezas: any;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4" /> Centros de custo</div>
          <CentroCustoDialog onSave={(c) => setCentros((p: any[]) => [c, ...p])} />
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
          <TableBody>
            {centros.length === 0 && <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">Nenhum centro cadastrado.</TableCell></TableRow>}
            {centros.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.nome}</TableCell>
                <TableCell className="text-muted-foreground">{c.tipo}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                    onClick={() => { if (confirm(`Remover centro "${c.nome}"?`)) setCentros((p: any[]) => p.filter((x) => x.id !== c.id)); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4" /> Naturezas financeiras</div>
          <NaturezaDialog onSave={(n) => setNaturezas((p: any[]) => [n, ...p])} />
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
          <TableBody>
            {naturezas.length === 0 && <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">Nenhuma natureza cadastrada.</TableCell></TableRow>}
            {naturezas.map((n) => (
              <TableRow key={n.id}>
                <TableCell>{n.nome}</TableCell>
                <TableCell><StatusBadge status={n.tipo} /></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                    onClick={() => { if (confirm(`Remover natureza "${n.nome}"?`)) setNaturezas((p: any[]) => p.filter((x) => x.id !== n.id)); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function CentroCustoDialog({ onSave }: { onSave: (c: any) => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"Administrativo" | "Operacional" | "Comercial" | "Obra">("Administrativo");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo centro</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo centro de custo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Marketing" /></Field>
          <Field label="Tipo">
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Administrativo", "Operacional", "Comercial", "Obra"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!nome.trim()) return toast.error("Informe o nome.");
            onSave({ id: `cc-${Date.now()}`, nome: nome.trim(), tipo });
            toast.success("Centro criado.");
            setNome(""); setOpen(false);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NaturezaDialog({ onSave }: { onSave: (n: any) => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Tipo>("Saída");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" />Nova natureza</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova natureza financeira</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Manutenção predial" /></Field>
          <Field label="Tipo">
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Entrada">Entrada</SelectItem>
                <SelectItem value="Saída">Saída</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!nome.trim()) return toast.error("Informe o nome.");
            onSave({ id: `nat-${Date.now()}`, nome: nome.trim(), tipo });
            toast.success("Natureza criada.");
            setNome(""); setOpen(false);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
