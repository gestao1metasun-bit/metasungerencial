import { Link, useRouterState } from "@tanstack/react-router";
import { ROUTE_TABS, parseHash } from "@/lib/route-tabs";
import { useIdentidade, canAccessModule } from "@/lib/identidade";
import { MACRO_MODULES, macroAtivoPorRota } from "@/lib/nav-structure";
import { Ribbon } from "@/components/app/Ribbon";

/**
 * MacroNav — barra horizontal de macro módulos (TOTVS RM / Sankhya / SAP).
 * Renderizada DENTRO da Linha 1 do header (mesma linha do logo + usuário).
 */
export function MacroNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const identidade = useIdentidade();

  // Macro nav é shell ERP — sempre visível. Permissão é validada nas rotas.
  // Filtro de role só aplica para usuários autenticados com role operacional restrita.
  const visible =
    !identidade.sessionLoading && identidade.isAuthenticated && identidade.role === "usuario"
      ? MACRO_MODULES.filter((m) => canAccessModule(identidade.role, m.accessKey))
      : MACRO_MODULES;
  const active = macroAtivoPorRota(path) ?? visible[0];

  return (
    <nav
      aria-label="Macro módulos"
      className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
    >
      {visible.map((m) => {
        const isActive = active?.key === m.key;
        const Icon = m.icon;
        return (
          <Link
            key={m.key}
            to={m.to}
            className={`group inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap transition border-b-2 ${
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-foreground/80 hover:text-foreground hover:bg-accent/60"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-gold"}`} />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * TopNav — agora renderiza APENAS a ribbon contextual (Linha 2).
 * Macro módulos foram movidos para dentro do header (Linha 1) via <MacroNav />.
 */
export function TopNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const activeTab = parseHash(hash);
  const active = macroAtivoPorRota(path);

  const ribbonCfg = ROUTE_TABS[path] ?? (active ? ROUTE_TABS[active.to] : undefined);
  const ribbonTabs = ribbonCfg?.tabs.filter((t) => !t.hidden) ?? [];
  const defaultTab = ribbonCfg?.default ?? "";
  const ribbonRoute = ROUTE_TABS[path] ? path : (active?.to ?? path);

  if (ribbonTabs.length === 0) return null;

  return (
    <div className="sticky top-11 z-10 border-b border-border bg-card/95 backdrop-blur shadow-sm">
      <Ribbon
        routePath={ribbonRoute}
        tabs={ribbonTabs}
        activeValue={activeTab}
        defaultValue={defaultTab}
      />
    </div>
  );
}
