/**
 * D12.0 — Analytics Sector Shell.
 *
 * Shell padrão de cada setor do Analytics Enterprise.
 * Layout corporativo TOTVS RM / Sankhya: barra horizontal de setores no
 * topo (navegação cruzada entre Comercial / Financeiro / etc.), header
 * denso e área de conteúdo full-width. Toolbar e KPIs ficam por conta de
 * cada setor (compostos por slots).
 */
import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, DollarSign, Landmark, HardHat, Boxes,
  CheckSquare, Headphones, Building2,
} from "lucide-react";

export type AnalyticsSector = {
  key: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  short: string;
};

export const ANALYTICS_SECTORS: AnalyticsSector[] = [
  { key: "diretoria",      label: "Diretoria / Geral",  to: "/analytics",                  icon: Building2,   short: "Diretoria" },
  { key: "comercial",      label: "Comercial",          to: "/analytics/comercial",        icon: ShoppingCart, short: "Comercial" },
  { key: "financeiro",     label: "Financeiro",         to: "/analytics/financeiro",       icon: DollarSign,  short: "Financeiro" },
  { key: "financiamentos", label: "Financiamentos",     to: "/analytics/financiamentos",   icon: Landmark,    short: "Financ." },
  { key: "engenharia",     label: "Engenharia",         to: "/analytics/engenharia",       icon: HardHat,     short: "Engenharia" },
  { key: "estoque",        label: "Estoque",            to: "/analytics/estoque",          icon: Boxes,       short: "Estoque" },
  { key: "aprovacoes",     label: "Aprovações",         to: "/analytics/aprovacoes",       icon: CheckSquare, short: "Aprovações" },
  { key: "posvenda",       label: "Pós-venda",          to: "/analytics/posvenda",         icon: Headphones,  short: "Pós-venda" },
];

export function AnalyticsSectorTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="mb-2 -mx-2 flex items-center gap-0 overflow-x-auto border-b border-border bg-card/40 px-2">
      {ANALYTICS_SECTORS.map((s) => {
        const active = s.to === "/analytics"
          ? path === "/analytics"
          : path === s.to || path.startsWith(s.to + "/");
        const Icon = s.icon;
        return (
          <Link
            key={s.key}
            to={s.to}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-1.5 text-[12px] font-medium transition-colors",
              active
                ? "border-gold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{s.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export type AnalyticsSectorShellProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AnalyticsSectorShell({
  title, subtitle, eyebrow = "Analytics Enterprise", actions, children,
}: AnalyticsSectorShellProps) {
  return (
    <div className="px-2 py-2">
      <AnalyticsSectorTabs />
      <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} actions={actions} />
      {children}
    </div>
  );
}

/**
 * Banner honesto de setor ainda não conectado à base oficial.
 * Mostra exatamente quais views/RPCs serão consumidas e em qual onda.
 */
export function AnalyticsSectorPendingBanner({
  onda, fontes, descricao,
}: { onda: string; fontes: string[]; descricao: string }) {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-[12px] text-foreground/90">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
        Onda {onda} — aguardando ligação à base oficial
      </div>
      <p className="mb-2 text-foreground/80">{descricao}</p>
      <div className="text-[10.5px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Fontes oficiais previstas:</span>{" "}
        <code className="text-foreground/80">{fontes.join(" · ")}</code>
      </div>
      <p className="mt-2 text-[10.5px] text-muted-foreground italic">
        Por princípio do ERP Meta Sun, nenhum KPI é exibido sem fonte reconciliada.
        Estrutura, filtros, ribbon e toolbar deste setor já estão prontos —
        os números entram com as views/RPCs oficiais da próxima onda.
      </p>
    </div>
  );
}
