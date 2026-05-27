/**
 * D6.E → D6.7 — Shell de painéis consolidado.
 *
 * Agora renderiza o DashboardReaisOverview (KPIs Supabase) como conteúdo
 * padrão e mantém o ribbon como navegação interna. Sem badge "Em
 * consolidação" e sem mensagem "KPIs serão exibidos aqui" — todos os
 * painéis (/paineis/*) usam este shell.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { useTabFromHash, ROUTE_TABS } from "@/lib/route-tabs";
import { DashboardReaisOverview } from "@/components/app/analytics/DashboardReaisOverview";

export type DashboardShellStubProps = {
  routePath: string;
  title: string;
  subtitle: string;
  /** rota operacional onde os dados estão hoje (atalho rápido). */
  legacyHref?: string;
  legacyLabel?: string;
  /** conteúdo específico do painel; quando ausente, usa overview consolidado. */
  children?: React.ReactNode;
};

export function DashboardShellStub({
  routePath, title, subtitle, legacyHref, legacyLabel, children,
}: DashboardShellStubProps) {
  const cfg = ROUTE_TABS[routePath];
  const [tab] = useTabFromHash(routePath);
  const active = cfg?.tabs.find((t) => t.value === tab) ?? cfg?.tabs[0];

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
        {children ?? <DashboardReaisOverview />}
      </div>
    </>
  );
}
