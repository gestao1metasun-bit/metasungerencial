/**
 * /dashboard — layout executivo (estilo Portal Financeiro Meta Sun).
 *
 * Cards KPI arejados com badge de ícone, painéis de barras proporcionais
 * e listas ranqueadas. Mesmos dados reais (useKpisReais, workflow,
 * pendências de estoque). Aba "indicadores" preservada.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardCheck, CircleDollarSign, PackageSearch,
  HardHat, RefreshCw, Wallet, Users, FileText, Boxes, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTabFromHash } from "@/lib/route-tabs";
import { useKpisReais } from "@/lib/repositories/use-kpis-reais";
import { useWorkflowAprovacoes } from "@/hooks/useWorkflowAprovacoes";
import { useEstoquePendencias } from "@/lib/repositories/use-estoque-pendencias";
import { useContratos } from "@/lib/contratos-store";
import { vendedores, propostas } from "@/lib/mock-data";
import { IndicadoresTab } from "@/routes/comercial";
import { ChartCard, TrendArea, RankBars, Donut, FunnelBars } from "@/components/app/charts/ChartKit";
import { useSeriesMensais } from "@/lib/repositories/use-series-mensais";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Operacional — Meta Sun Gerencial" }] }),
  component: DashboardGeral,
});

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

type Tone = "muted" | "primary" | "info" | "success" | "warning" | "danger";

function DashboardGeral() {
  const [tab, setTab] = useTabFromHash("/dashboard");
  const kpis = useKpisReais();
  const wf = useWorkflowAprovacoes("pendentes_para_mim");
  const pend = useEstoquePendencias();
  const liveContratos = useContratos();

  const reload = () => { kpis.reload(); wf.refetch(); pend.reload(); };

  const fin = kpis.financeiro;
  const com = kpis.comercial;
  const eng = kpis.engenharia;
  const est = kpis.estoque;

  const emAberto = fin?.valorPendente ?? 0;
  const atrasado = fin?.valorAtrasado ?? 0;
  const recebido = fin?.valorRecebido ?? 0;
  const total = emAberto + atrasado;
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);

  const aprovacoes = wf.data ?? [];

  return (
    <>
      <PageHeader
        title="Dashboard Operacional"
        subtitle="Consolidado por área, com exceções e KPIs reais em tempo real."
        actions={
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar dados
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-1 space-y-5">
          {/* Faixa de contexto */}
          <div className="rounded-md border border-success/30 bg-success/10 px-4 py-2.5 text-[12.5px] text-foreground">
            Base carregada do backend — <b>{fin?.totalTitulos ?? 0}</b> títulos financeiros,{" "}
            <b>{com?.totalPv ?? 0}</b> pedidos de venda e <b>{eng?.totalObras ?? 0}</b> obras registradas.
          </div>

          {/* KPIs principais */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title="Total a receber" tone="success" icon={<CircleDollarSign className="h-4 w-4" />}
              value={BRL(total)} caption={`${fin?.totalTitulos ?? 0} títulos em aberto`}
            />
            <KpiCard
              title="Vencido" tone="danger" icon={<AlertTriangle className="h-4 w-4" />}
              value={BRL(atrasado)} caption={`${pct(atrasado)}% do total`}
            />
            <KpiCard
              title="A vencer" tone="warning" icon={<Wallet className="h-4 w-4" />}
              value={BRL(emAberto)} caption={`${pct(emAberto)}% do total`}
            />
            <KpiCard
              title="Aprovações pendentes" tone="info" icon={<ClipboardCheck className="h-4 w-4" />}
              value={String(aprovacoes.length)} caption="aguardando sua decisão"
            />
            <KpiCard
              title="Recebido" tone="primary" icon={<Users className="h-4 w-4" />}
              value={BRL(recebido)} caption={`fluxo 30d ${BRL(fin?.fluxoPrevisto ?? 0)}`}
            />
          </div>

          {/* Gráficos — dados reais dos últimos 6 meses */}
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ChartCard
                title="Fluxo financeiro — últimos 6 meses"
                subtitle="Entradas e saídas realizadas, com previsto a receber"
                loading={series.loading}
                empty={!series.loading && semSerieFin}
                height={260}
              >
                <TrendArea
                  data={series.meses}
                  series={[
                    { key: "entradas", label: "Entradas", color: "var(--chart-4)" },
                    { key: "saidas", label: "Saídas", color: "var(--chart-5)" },
                    { key: "previstoReceber", label: "Previsto a receber", color: "var(--chart-3)" },
                  ]}
                />
              </ChartCard>
            </div>
            <ChartCard
              title="Funil comercial"
              subtitle="Da proposta ao contrato assinado"
              loading={series.loading}
              empty={!series.loading && series.funilComercial.every((f) => f.qtd === 0)}
              height={260}
            >
              <FunnelBars steps={series.funilComercial} />
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard
              title="Ranking de consultores"
              subtitle="Valor total de contratos por consultor"
              loading={series.loading}
              empty={!series.loading && series.rankingConsultores.length === 0}
              height={240}
            >
              <RankBars data={series.rankingConsultores} />
            </ChartCard>
            <ChartCard
              title="Carteira por status"
              subtitle="Saldo em aberto dos títulos financeiros"
              loading={series.loading}
              empty={!series.loading && series.distribuicaoStatusFin.length === 0}
              height={240}
            >
              <Donut data={series.distribuicaoStatusFin} />
            </ChartCard>
          </div>

          {/* Barras */}

          <div className="grid gap-4 xl:grid-cols-2">
            <PanelCard title="Distribuição financeira">
              <BarRow label="A vencer" value={BRL(emAberto)} pct={pct(emAberto)} tone="warning" />
              <BarRow label="Vencido" value={BRL(atrasado)} pct={pct(atrasado)} tone="danger" />
              <BarRow label="Recebido no período" value={BRL(recebido)} pct={100} tone="success" />
              <BarRow
                label="Saldo operacional"
                value={BRL(fin?.saldoOperacional ?? 0)}
                pct={(fin?.saldoOperacional ?? 0) >= 0 ? 100 : 20}
                tone={(fin?.saldoOperacional ?? 0) >= 0 ? "success" : "danger"}
              />
            </PanelCard>

            <PanelCard title="Execução operacional">
              <BarRow
                label="Consumo das obras" value={`${eng?.consumoPct ?? 0}%`}
                pct={Math.min(eng?.consumoPct ?? 0, 100)}
                tone={(eng?.consumoPct ?? 0) > 100 ? "danger" : "info"}
              />
              <BarRow
                label="PV aprovados" value={`${com?.pvAprovados ?? 0} de ${com?.totalPv ?? 0}`}
                pct={com?.totalPv ? Math.round(((com.pvAprovados ?? 0) / com.totalPv) * 100) : 0}
                tone="success"
              />
              <BarRow
                label="Obras ativas" value={`${eng?.obrasAtivas ?? 0} de ${eng?.totalObras ?? 0}`}
                pct={eng?.totalObras ? Math.round(((eng.obrasAtivas ?? 0) / eng.totalObras) * 100) : 0}
                tone="info"
              />
              <BarRow
                label="Estoque disponível" value={`${est?.disponivel ?? 0} un.`}
                pct={est?.saldoFisico ? Math.round(((est.disponivel ?? 0) / est.saldoFisico) * 100) : 0}
                tone="primary"
              />
            </PanelCard>
          </div>

          {/* Listas */}
          <div className="grid gap-4 xl:grid-cols-2">
            <PanelCard title="Aprovações pendentes" href="/aprovacoes">
              {wf.isLoading ? (
                <EmptyLine text="Carregando…" />
              ) : aprovacoes.length === 0 ? (
                <EmptyLine text="Nenhuma aprovação pendente para você." />
              ) : (
                aprovacoes.slice(0, 8).map((w: any, i: number) => (
                  <RankRow
                    key={w.id} index={i + 1} href="/aprovacoes"
                    title={w.titulo ?? w.tipo_operacao}
                    subtitle={`${w.codigo ?? String(w.id).slice(0, 8)} · ${BRL(Number(w.valor ?? 0))}`}
                    tone="warning"
                  />
                ))
              )}
            </PanelCard>

            <PanelCard title="Estoque crítico" href="/estoque#tab=itens">
              {pend.loading ? (
                <EmptyLine text="Carregando…" />
              ) : (pend.estoqueBaixo ?? []).length === 0 ? (
                <EmptyLine text="Sem produtos abaixo do mínimo." />
              ) : (
                (pend.estoqueBaixo ?? []).slice(0, 8).map((p, i) => (
                  <RankRow
                    key={p.produto_id} index={i + 1} href="/estoque#tab=itens"
                    title={p.nome} subtitle={`${p.codigo} · déficit ${p.deficit}`}
                    tone="danger"
                  />
                ))
              )}
            </PanelCard>
          </div>

          {/* Atalhos por área */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AreaCard title="Financeiro" icon={<Wallet className="h-4 w-4" />} href="/financeiro-titulos"
              rows={[["Em aberto", BRL(emAberto)], ["Atrasado", BRL(atrasado)], ["Títulos", String(fin?.totalTitulos ?? 0)]]} />
            <AreaCard title="Comercial" icon={<FileText className="h-4 w-4" />} href="/pedidos-venda"
              rows={[["Contratos", String(com?.totalContratos ?? 0)], ["Em execução", String(com?.pvExecucao ?? 0)], ["Ticket médio", BRL(com?.ticketMedio ?? 0)]]} />
            <AreaCard title="Engenharia" icon={<HardHat className="h-4 w-4" />} href="/engenharia"
              rows={[["Ativas", String(eng?.obrasAtivas ?? 0)], ["Finalizadas", String(eng?.obrasFinalizadas ?? 0)], ["Custo previsto", BRL(eng?.custoPrevisto ?? 0)]]} />
            <AreaCard title="Estoque" icon={<Boxes className="h-4 w-4" />} href="/estoque"
              rows={[["Disponível", String(est?.disponivel ?? 0)], ["Reservado", String(est?.reservado ?? 0)], ["Custo estoque", BRL(est?.custoEstoque ?? 0)]]} />
          </div>
        </TabsContent>

        <TabsContent value="indicadores" className="mt-3">
          <IndicadoresTab
            contratos={liveContratos as any}
            vendedoresList={vendedores as any}
            propostas={propostas as any}
            volume={[]}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ───────────────────────────── Primitivos ─────────────────────────── */

function toneText(t: Tone): string {
  switch (t) {
    case "primary": return "text-primary";
    case "info": return "text-info";
    case "success": return "text-success";
    case "warning": return "text-warning";
    case "danger": return "text-destructive";
    default: return "text-foreground";
  }
}

function toneBg(t: Tone): string {
  switch (t) {
    case "primary": return "bg-primary";
    case "info": return "bg-info";
    case "success": return "bg-success";
    case "warning": return "bg-warning";
    case "danger": return "bg-destructive";
    default: return "bg-muted-foreground";
  }
}

function toneBadge(t: Tone): string {
  switch (t) {
    case "primary": return "bg-primary/10 text-primary";
    case "info": return "bg-info/10 text-info";
    case "success": return "bg-success/10 text-success";
    case "warning": return "bg-warning/15 text-warning";
    case "danger": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}

function KpiCard({ title, value, caption, tone, icon }: {
  title: string; value: string; caption: string; tone: Tone; icon: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium text-muted-foreground">{title}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${toneBadge(tone)}`}>
          {icon}
        </span>
      </div>
      <div className="mt-2 font-mono text-[26px] font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[11.5px] text-muted-foreground">{caption}</div>
    </Card>
  );
}

function PanelCard({ title, href, children }: {
  title: string; href?: string; children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
        {href && (
          <Link to={href} className="text-[11.5px] font-semibold text-primary hover:underline">
            Abrir →
          </Link>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

function BarRow({ label, value, pct, tone }: {
  label: string; value: string; pct: number; tone: Tone;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="text-foreground">{label}</span>
        <span className={`font-mono font-semibold ${toneText(tone)}`}>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${toneBg(tone)}`} style={{ width: `${Math.max(2, Math.min(pct, 100))}%` }} />
      </div>
    </div>
  );
}

function RankRow({ index, title, subtitle, href, tone }: {
  index: number; title: string; subtitle: string; href: string; tone: Tone;
}) {
  return (
    <Link to={href} className="flex items-center gap-3 rounded-md px-1 py-1 hover:bg-muted/50">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${toneBadge(tone)}`}>
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold text-foreground">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
      </div>
    </Link>
  );
}

function AreaCard({ title, icon, href, rows }: {
  title: string; icon: React.ReactNode; href: string; rows: [string, string][];
}) {
  return (
    <Card className="p-5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <span className="text-primary">{icon}</span> {title}
        </div>
        <Link to={href} className="text-[11.5px] font-semibold text-primary hover:underline">
          Abrir →
        </Link>
      </div>
      <div className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between text-[12px]">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="py-2 text-[12px] text-muted-foreground">{text}</div>;
}

void PackageSearch;
