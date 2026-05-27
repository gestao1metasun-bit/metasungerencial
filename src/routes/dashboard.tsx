/**
 * D6.8 — Onda 4: /dashboard operacional ERP 2 colunas.
 *
 * Antes: dashboard SaaS com cards grandes + 4 gráficos dominantes + mock.
 * Agora: layout corporativo ERP estilo TOTVS RM / SAP:
 *   - Coluna esquerda (Operação / Exceções): aprovações pendentes,
 *     financeiro vencido, estoque baixo/parado, obras críticas.
 *   - Coluna direita (Gestão compacta): KPIs reais densos por área
 *     (financeiro, comercial, engenharia, estoque) + status reconciliação.
 *
 * Aba "indicadores" preservada (IndicadoresTab continua acessível via hash).
 * Mock visual / gráficos grandes movidos para fora do caminho principal.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, ClipboardCheck, CircleDollarSign, PackageSearch,
  HardHat, RefreshCw, ArrowRight, Activity, Wallet, TrendingUp,
  FileText, Boxes, Clock,
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

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Operacional — Meta Sun Gerencial" }] }),
  component: DashboardGeral,
});

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function DashboardGeral() {
  const [tab, setTab] = useTabFromHash("/dashboard");
  const kpis = useKpisReais();
  const wf = useWorkflowAprovacoes("pendentes_para_mim");
  const pend = useEstoquePendencias();
  const liveContratos = useContratos();

  const reload = () => { kpis.reload(); wf.refetch(); pend.reload(); };

  return (
    <>
      <PageHeader
        title="Dashboard Operacional"
        subtitle="Exceções, KPIs reais e indicadores executivos consolidados."
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-[11.5px]"
            onClick={reload}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-2 space-y-2">
          {/* Strip operacional denso */}
          <OperationalStrip kpis={kpis} wf={wf.data?.length ?? 0} />

          {/* 2 colunas ERP */}
          <div className="grid gap-2 xl:grid-cols-[1.35fr_1fr]">
            {/* Coluna esquerda — Operação / Exceções */}
            <div className="space-y-2">
              <ExcecoesAprovacoes wfData={wf.data ?? []} loading={wf.isLoading} />
              <ExcecoesFinanceiro fin={kpis.financeiro} loading={kpis.loading} />
              <ExcecoesEstoque pend={pend} />
              <ExcecoesObras eng={kpis.engenharia} loading={kpis.loading} />
            </div>

            {/* Coluna direita — Gestão compacta */}
            <div className="space-y-2">
              <CompactKpiBlock
                title="Financeiro"
                icon={<Wallet className="h-3.5 w-3.5" />}
                href="/financeiro-titulos"
                rows={[
                  ["Em aberto", BRL(kpis.financeiro?.valorPendente ?? 0), "warning"],
                  ["Atrasado", BRL(kpis.financeiro?.valorAtrasado ?? 0), "danger"],
                  ["Recebido", BRL(kpis.financeiro?.valorRecebido ?? 0), "success"],
                  ["Fluxo 30d", BRL(kpis.financeiro?.fluxoPrevisto ?? 0), "info"],
                  ["Títulos", String(kpis.financeiro?.totalTitulos ?? 0), "muted"],
                ]}
              />
              <CompactKpiBlock
                title="Comercial"
                icon={<FileText className="h-3.5 w-3.5" />}
                href="/pedidos-venda"
                rows={[
                  ["PV total", String(kpis.comercial?.totalPv ?? 0), "muted"],
                  ["Aprovados", String(kpis.comercial?.pvAprovados ?? 0), "success"],
                  ["Em execução", String(kpis.comercial?.pvExecucao ?? 0), "info"],
                  ["Contratos", String(kpis.comercial?.totalContratos ?? 0), "muted"],
                  ["Ticket médio", BRL(kpis.comercial?.ticketMedio ?? 0), "primary"],
                ]}
              />
              <CompactKpiBlock
                title="Engenharia"
                icon={<HardHat className="h-3.5 w-3.5" />}
                href="/engenharia"
                rows={[
                  ["Obras", String(kpis.engenharia?.totalObras ?? 0), "muted"],
                  ["Ativas", String(kpis.engenharia?.obrasAtivas ?? 0), "info"],
                  ["Finalizadas", String(kpis.engenharia?.obrasFinalizadas ?? 0), "success"],
                  ["Custo previsto", BRL(kpis.engenharia?.custoPrevisto ?? 0), "muted"],
                  ["Consumo", `${kpis.engenharia?.consumoPct ?? 0}%`,
                    (kpis.engenharia?.consumoPct ?? 0) > 100 ? "danger" : "primary"],
                ]}
              />
              <CompactKpiBlock
                title="Estoque"
                icon={<Boxes className="h-3.5 w-3.5" />}
                href="/estoque"
                rows={[
                  ["Saldo físico", String(kpis.estoque?.saldoFisico ?? 0), "muted"],
                  ["Reservado", String(kpis.estoque?.reservado ?? 0), "warning"],
                  ["Disponível", String(kpis.estoque?.disponivel ?? 0), "success"],
                  ["Entregas pend.", String(kpis.estoque?.entregasPendentes ?? 0), "info"],
                  ["Custo estoque", BRL(kpis.estoque?.custoEstoque ?? 0), "primary"],
                ]}
              />

              {/* Status reconciliação compacto */}
              <Card className="p-2.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <Activity className="h-3 w-3" /> Status reconciliação
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11.5px]">
                  <ReconciliationCell label="Saldo operacional"
                    value={BRL(kpis.financeiro?.saldoOperacional ?? 0)}
                    tone={(kpis.financeiro?.saldoOperacional ?? 0) >= 0 ? "success" : "danger"} />
                  <ReconciliationCell label="Backend"
                    value={kpis.disponivel ? "OK" : "MOCK"}
                    tone={kpis.disponivel ? "success" : "warning"} />
                </div>
                <Link
                  to="/analises"
                  className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary hover:underline"
                >
                  Abrir reconciliação <ArrowRight className="h-3 w-3" />
                </Link>
              </Card>
            </div>
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

/* ─────────────────────────── Strip operacional ─────────────────────────── */

function OperationalStrip({ kpis, wf }: { kpis: ReturnType<typeof useKpisReais>; wf: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-border/80 bg-muted/40 px-2.5 py-1.5">
      <StripItem label="Aprovações" value={wf} tone="warning" />
      <Sep />
      <StripItem label="Atrasado" value={BRL(kpis.financeiro?.valorAtrasado ?? 0)} tone="danger" />
      <StripItem label="Em aberto" value={BRL(kpis.financeiro?.valorPendente ?? 0)} tone="warning" />
      <StripItem label="Recebido" value={BRL(kpis.financeiro?.valorRecebido ?? 0)} tone="success" />
      <Sep />
      <StripItem label="Obras ativas" value={kpis.engenharia?.obrasAtivas ?? 0} tone="info" />
      <StripItem label="Consumo obra" value={`${kpis.engenharia?.consumoPct ?? 0}%`} tone="primary" />
      <Sep />
      <StripItem label="Disponível" value={kpis.estoque?.disponivel ?? 0} tone="success" />
      <StripItem label="Reservado" value={kpis.estoque?.reservado ?? 0} tone="warning" />
      <StripItem label="Entregas pend." value={kpis.estoque?.entregasPendentes ?? 0} tone="info" />
      <Sep />
      <StripItem label="PV abertos" value={(kpis.comercial?.totalPv ?? 0) - (kpis.comercial?.pvAprovados ?? 0)} tone="muted" />
      <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-muted-foreground/80">
        <Clock className="h-3 w-3" /> Tempo real
      </span>
    </div>
  );
}

function StripItem({ label, value, tone = "muted" }: { label: string; value: string | number; tone?: Tone }) {
  return (
    <span className="inline-flex items-baseline gap-1 text-[11px]">
      <span className="uppercase tracking-wider text-muted-foreground/80">{label}</span>
      <span className={`font-mono font-semibold ${toneText(tone)}`}>{value}</span>
    </span>
  );
}

function Sep() { return <span className="h-3.5 w-px bg-border/80" />; }

/* ─────────────────────────── Exceções (esquerda) ─────────────────────────── */

function ExcecoesAprovacoes({ wfData, loading }: { wfData: any[]; loading: boolean }) {
  return (
    <ExceptionBlock
      title="Aprovações pendentes"
      icon={<ClipboardCheck className="h-3.5 w-3.5" />}
      tone="warning"
      count={wfData.length}
      hrefAll="/aprovacoes"
      loading={loading}
      empty="Nenhuma aprovação pendente para você."
    >
      {wfData.slice(0, 6).map((w) => (
        <ExceptionRow
          key={w.id}
          left={<span className="font-mono text-[10.5px] text-muted-foreground">{w.codigo ?? w.id.slice(0, 8)}</span>}
          mid={<span className="truncate font-semibold">{w.titulo ?? w.tipo_operacao}</span>}
          right={<span className="font-mono">{BRL(Number(w.valor ?? 0))}</span>}
          href="/aprovacoes"
        />
      ))}
    </ExceptionBlock>
  );
}

function ExcecoesFinanceiro({ fin, loading }: { fin: any; loading: boolean }) {
  const atrasado = fin?.valorAtrasado ?? 0;
  const qtd = fin?.atrasados ?? 0;
  return (
    <ExceptionBlock
      title="Financeiro vencido"
      icon={<CircleDollarSign className="h-3.5 w-3.5" />}
      tone={atrasado > 0 ? "danger" : "success"}
      count={qtd}
      hrefAll="/financeiro-titulos#tab=receber"
      loading={loading}
      empty="Sem parcelas vencidas."
    >
      <div className="px-2 py-1.5 text-[12px]">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Valor vencido</span>
          <span className="font-mono font-semibold text-destructive">{BRL(atrasado)}</span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between">
          <span className="text-muted-foreground">Em aberto (total)</span>
          <span className="font-mono">{BRL(fin?.valorPendente ?? 0)}</span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between">
          <span className="text-muted-foreground">Fluxo previsto 30d</span>
          <span className="font-mono">{BRL(fin?.fluxoPrevisto ?? 0)}</span>
        </div>
      </div>
    </ExceptionBlock>
  );
}

function ExcecoesEstoque({ pend }: { pend: ReturnType<typeof useEstoquePendencias> }) {
  const baixo = pend.estoqueBaixo ?? [];
  const totalAlerts =
    (pend.resumo?.estoque_baixo ?? 0) +
    (pend.resumo?.reservas_atrasadas ?? 0) +
    (pend.resumo?.oc_atrasada ?? 0);
  return (
    <ExceptionBlock
      title="Estoque crítico"
      icon={<PackageSearch className="h-3.5 w-3.5" />}
      tone={totalAlerts > 0 ? "warning" : "success"}
      count={totalAlerts}
      hrefAll="/estoque#tab=compra"
      loading={pend.loading}
      empty="Sem produtos abaixo do mínimo."
    >
      <div className="grid grid-cols-3 gap-1 px-2 pt-1 text-[11px]">
        <MiniMetric label="Baixo" value={pend.resumo?.estoque_baixo ?? 0} tone="warning" />
        <MiniMetric label="Res. atrasadas" value={pend.resumo?.reservas_atrasadas ?? 0} tone="danger" />
        <MiniMetric label="OC atrasada" value={pend.resumo?.oc_atrasada ?? 0} tone="danger" />
      </div>
      {baixo.slice(0, 4).map((p) => (
        <ExceptionRow
          key={p.produto_id}
          left={<span className="font-mono text-[10.5px] text-muted-foreground">{p.codigo}</span>}
          mid={<span className="truncate">{p.nome}</span>}
          right={<span className="font-mono text-destructive">déficit {p.deficit}</span>}
          href="/estoque#tab=itens"
        />
      ))}
    </ExceptionBlock>
  );
}

function ExcecoesObras({ eng, loading }: { eng: any; loading: boolean }) {
  const consumo = eng?.consumoPct ?? 0;
  return (
    <ExceptionBlock
      title="Obras críticas"
      icon={<HardHat className="h-3.5 w-3.5" />}
      tone={consumo > 100 ? "danger" : consumo > 90 ? "warning" : "info"}
      count={eng?.obrasAtivas ?? 0}
      hrefAll="/engenharia"
      loading={loading}
      empty="Sem obras ativas."
    >
      <div className="px-2 py-1.5 text-[12px]">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Custo previsto</span>
          <span className="font-mono">{BRL(eng?.custoPrevisto ?? 0)}</span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between">
          <span className="text-muted-foreground">Custo realizado</span>
          <span className="font-mono">{BRL(eng?.custoRealizado ?? 0)}</span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between">
          <span className="text-muted-foreground">Consumo</span>
          <span className={`font-mono font-semibold ${consumo > 100 ? "text-destructive" : ""}`}>
            {consumo}%
          </span>
        </div>
      </div>
    </ExceptionBlock>
  );
}

/* ───────────────────────────── KPIs compactos ─────────────────────────── */

function CompactKpiBlock({
  title, icon, href, rows,
}: {
  title: string; icon: React.ReactNode; href: string;
  rows: [string, string, Tone][];
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-border/70 px-2.5 py-1">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {icon} {title}
        </div>
        <Link to={href} className="text-[10.5px] font-semibold text-primary hover:underline">
          Abrir →
        </Link>
      </div>
      <div className="divide-y divide-border/40">
        {rows.map(([label, value, tone]) => (
          <div key={label} className="flex items-baseline justify-between px-2.5 py-1 text-[11.5px]">
            <span className="text-muted-foreground">{label}</span>
            <span className={`font-mono font-semibold ${toneText(tone)}`}>{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ───────────────────────────── Primitivos ─────────────────────────── */

type Tone = "muted" | "primary" | "info" | "success" | "warning" | "danger";

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

function ExceptionBlock({
  title, icon, tone, count, hrefAll, loading, empty, children,
}: {
  title: string; icon: React.ReactNode; tone: Tone;
  count: number; hrefAll: string; loading: boolean;
  empty: string; children: React.ReactNode;
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-2.5 py-1">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span className={toneText(tone)}>{icon}</span>
          {title}
          <span className={`ml-1 rounded bg-background px-1.5 font-mono text-[10px] ${toneText(tone)}`}>
            {loading ? "…" : count}
          </span>
        </div>
        <Link to={hrefAll} className="text-[10.5px] font-semibold text-primary hover:underline">
          Abrir →
        </Link>
      </div>
      {loading ? (
        <div className="px-2.5 py-2 text-[11px] text-muted-foreground">Carregando…</div>
      ) : count === 0 ? (
        <div className="px-2.5 py-2 text-[11px] text-muted-foreground">{empty}</div>
      ) : (
        <div className="divide-y divide-border/40">{children}</div>
      )}
    </Card>
  );
}

function ExceptionRow({ left, mid, right, href }: {
  left: React.ReactNode; mid: React.ReactNode; right: React.ReactNode; href: string;
}) {
  return (
    <Link
      to={href}
      className="grid grid-cols-[80px_1fr_auto] items-center gap-2 px-2.5 py-1 text-[12px] hover:bg-muted/40"
    >
      {left}
      <div className="truncate">{mid}</div>
      <div className="font-mono text-[11px]">{right}</div>
    </Link>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className="flex flex-col rounded bg-muted/40 px-1.5 py-1">
      <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground/80">{label}</span>
      <span className={`font-mono text-[12px] font-semibold ${toneText(tone)}`}>{value}</span>
    </div>
  );
}

function ReconciliationCell({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="flex flex-col rounded border border-border/60 bg-muted/30 px-2 py-1">
      <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground/80">{label}</span>
      <span className={`font-mono text-[11.5px] font-semibold ${toneText(tone)}`}>{value}</span>
    </div>
  );
}

/* Helper compat: TrendingUp/Activity são importados acima para uso futuro. */
void TrendingUp; void AlertTriangle;
