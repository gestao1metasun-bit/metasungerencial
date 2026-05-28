/**
 * D6.E → D6.7 → D14.4 — Shell de painéis consolidado.
 *
 * Renderiza o DashboardReaisOverview (KPIs reais transacionais) + a tira
 * KpisOficiaisStrip (verdade oficial v_kpis_*_oficial) como conteúdo
 * padrão. Sem cálculo paralelo no shell — toda área que tem view oficial
 * lê via useKpisOficiais (D14.1).
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { lazy, Suspense } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { useTabFromHash, ROUTE_TABS } from "@/lib/route-tabs";
import type { KpiArea } from "@/lib/repositories/use-kpis-oficiais";

// D16.PERF P2 — KPIs e overview saem do bundle inicial.
// Só carregam quando o usuário abre um painel.
const DashboardReaisOverview = lazy(() =>
  import("@/components/app/analytics/DashboardReaisOverview").then((m) => ({ default: m.DashboardReaisOverview }))
);
const KpisOficiaisStrip = lazy(() =>
  import("@/components/app/analytics/KpisOficiaisStrip").then((m) => ({ default: m.KpisOficiaisStrip }))
);

function StripFallback() {
  return <Card className="px-2.5 py-1 text-[11px] text-muted-foreground bg-muted/30">Carregando KPIs…</Card>;
}
function OverviewFallback() {
  return <Card className="px-3 py-6 text-[11px] text-muted-foreground bg-muted/30">Carregando painel…</Card>;
}

const AREA_BY_ROUTE: Record<string, KpiArea | undefined> = {
  "/analytics/financeiro": "financeiro",
  "/analytics/comercial": "comercial",
  "/analytics/engenharia": "engenharia",
  "/analytics/estoque": "estoque",
  "/analytics/aprovacoes": "aprovacoes",
  "/analytics/financiamentos": "financiamentos",
};

export type DashboardShellStubProps = {
  routePath: string;
  title: string;
  subtitle: string;
  legacyHref?: string;
  legacyLabel?: string;
  children?: React.ReactNode;
};

export function DashboardShellStub({
  routePath, title, subtitle, legacyHref, legacyLabel, children,
}: DashboardShellStubProps) {
  const cfg = ROUTE_TABS[routePath];
  const [tab] = useTabFromHash(routePath);
  const active = cfg?.tabs.find((t) => t.value === tab) ?? cfg?.tabs[0];
  const area = AREA_BY_ROUTE[routePath];

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          legacyHref ? (
            <Link
              to={legacyHref}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 text-[11.5px] font-medium text-foreground/80 hover:bg-accent"
            >
              Abrir {legacyLabel ?? "operação"}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : undefined
        }
      />
      <div className="space-y-2">
        {active && (
          <Card className="px-2.5 py-1 text-[11px] text-muted-foreground bg-muted/30">
            Painel ativo: <span className="font-semibold text-foreground">{active.label}</span>
          </Card>
        )}
        {area && (
          <Suspense fallback={<StripFallback />}>
            <KpisOficiaisStrip area={area} />
          </Suspense>
        )}
        {children ?? (
          <Suspense fallback={<OverviewFallback />}>
            <DashboardReaisOverview />
          </Suspense>
        )}
      </div>
    </>
  );
}
