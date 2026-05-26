/**
 * D6.E — Stub do macro módulo Dashboards.
 *
 * Renderiza um shell padronizado para cada sub-dashboard (Comercial,
 * Financeiro, Engenharia, etc) enquanto os painéis reais são migrados
 * para o macro módulo Dashboards.
 *
 * As tabs vêm do ROUTE_TABS da rota (ribbon TOTVS continua funcionando).
 * Conteúdo de cada tab é placeholder — KPIs reais ficam para próxima onda.
 *
 * Não toca em backend / RPC / RLS / hooks transacionais.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTabFromHash, ROUTE_TABS } from "@/lib/route-tabs";

export type DashboardShellStubProps = {
  routePath: string;
  title: string;
  subtitle: string;
  /** rota operacional onde os dados estão hoje (compat / atalho) */
  legacyHref?: string;
  legacyLabel?: string;
};

export function DashboardShellStub({
  routePath, title, subtitle, legacyHref, legacyLabel,
}: DashboardShellStubProps) {
  const cfg = ROUTE_TABS[routePath];
  const [tab] = useTabFromHash(routePath);
  const active = cfg?.tabs.find((t) => t.value === tab) ?? cfg?.tabs[0];

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="space-y-4">
        <Card className="bg-[image:var(--gradient-card)] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Painel ativo
              </div>
              <div className="text-base font-semibold tracking-tight">
                {active?.label ?? "—"}
              </div>
            </div>
            <Badge variant="outline" className="border-amber-400/60 bg-amber-50 text-amber-800">
              Em consolidação
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Use o ribbon acima para navegar entre os painéis desta área. Os KPIs
            reais serão migrados para cá nas próximas ondas — a operação
            transacional continua nos módulos originais.
          </p>
          {legacyHref && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Link
                to={legacyHref}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground/80 hover:bg-accent"
              >
                Abrir módulo operacional: {legacyLabel ?? legacyHref}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </Card>

        <Card className="p-8 text-center text-sm text-muted-foreground">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          KPIs e gráficos de <strong className="text-foreground">{active?.label}</strong> serão exibidos aqui.
        </Card>
      </div>
    </>
  );
}
