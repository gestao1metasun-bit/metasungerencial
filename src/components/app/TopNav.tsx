import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Briefcase, Wallet, HardHat, Package, Headset,
  ClipboardCheck, LineChart, Settings,
} from "lucide-react";
import { ROUTE_TABS, parseHash } from "@/lib/route-tabs";
import { useIdentidade, canAccessModule } from "@/lib/identidade";

type MacroModule = {
  key: string;
  label: string;
  to: string;
  icon: any;
  /** Prefixos que ativam este macro módulo */
  matches: string[];
  /** Chave em canAccessModule */
  accessKey: string;
};

const MACRO: MacroModule[] = [
  { key: "dashboard",  label: "Dashboard",     to: "/dashboard",   icon: LayoutDashboard, matches: ["/dashboard", "/tarefas"], accessKey: "dashboard" },
  { key: "comercial",  label: "Comercial",     to: "/comercial",   icon: Briefcase,       matches: ["/comercial", "/leads", "/propostas", "/pedidos-venda", "/financiamentos"], accessKey: "comercial" },
  { key: "financeiro", label: "Financeiro",    to: "/financeiro",  icon: Wallet,          matches: ["/financeiro", "/financeiro-titulos"], accessKey: "financeiro" },
  { key: "engenharia", label: "Engenharia",    to: "/engenharia",  icon: HardHat,         matches: ["/engenharia"], accessKey: "engenharia" },
  { key: "estoque",    label: "Estoque",       to: "/estoque",     icon: Package,         matches: ["/estoque", "/estoque-fundacao"], accessKey: "estoque" },
  { key: "posvenda",   label: "Pós-venda",     to: "/posvenda",    icon: Headset,         matches: ["/posvenda"], accessKey: "posvenda" },
  { key: "aprovacoes", label: "Aprovações",    to: "/aprovacoes",  icon: ClipboardCheck,  matches: ["/aprovacoes"], accessKey: "dashboard" },
  { key: "analytics",  label: "Analytics",     to: "/analytics",   icon: LineChart,       matches: ["/analytics", "/relatorios"], accessKey: "analytics" },
  { key: "config",     label: "Configurações", to: "/configuracoes", icon: Settings,      matches: ["/configuracoes", "/cadastros"], accessKey: "configuracoes" },
];

function isMatch(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(p + "/"));
}

export function TopNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const identidade = useIdentidade();
  const activeTab = parseHash(hash);

  const visible = MACRO.filter((m) =>
    identidade.sessionLoading ? true : canAccessModule(identidade.role, m.accessKey as any),
  );
  const active = visible.find((m) => isMatch(path, m.matches)) ?? visible[0];

  // Ribbon: pega ROUTE_TABS do caminho ativo (se houver)
  const ribbonCfg = ROUTE_TABS[path] ?? (active ? ROUTE_TABS[active.to] : undefined);
  const ribbonTabs = ribbonCfg?.tabs.filter((t) => !t.hidden) ?? [];
  const defaultTab = ribbonCfg?.default ?? "";

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur">
      {/* Linha 1: macro módulos */}
      <div className="flex items-center gap-1 overflow-x-auto px-4 py-1.5">
        {visible.map((m) => {
          const isActive = active?.key === m.key;
          const Icon = m.icon;
          return (
            <Link
              key={m.key}
              to={m.to}
              className={`group inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-foreground/70 hover:text-foreground hover:bg-accent/60 border border-transparent"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-gold"}`} />
              {m.label}
            </Link>
          );
        })}
      </div>

      {/* Linha 2: ribbon contextual */}
      {ribbonTabs.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border/60 bg-secondary/40 px-4 py-1">
          {ribbonTabs.map((t) => {
            const isOnRoute = active && path === active.to;
            const isActive = isOnRoute && (activeTab || defaultTab) === t.value;
            return (
              <Link
                key={t.value}
                to={active?.to ?? path}
                hash={`tab=${t.value}`}
                className={`inline-flex items-center rounded px-2.5 py-1 text-[12px] whitespace-nowrap transition ${
                  isActive
                    ? "bg-gold/15 text-gold font-semibold"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
