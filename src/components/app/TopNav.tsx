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
      className="flex min-w-0 flex-1 items-stretch gap-0 overflow-x-auto h-full"
    >
      {visible.map((m) => {
        const isActive = active?.key === m.key;
        const Icon = m.icon;
        return (
          <Link
            key={m.key}
            to={m.to}
            className={`group inline-flex shrink-0 items-center gap-1.5 px-3 text-[11.5px] font-medium whitespace-nowrap transition-colors border-b-2 ${
              isActive
                ? "bg-white/15 text-white border-white/70 font-bold"
                : "border-transparent text-white/75 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-white/70 group-hover:text-white"}`} />
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
    <div className="sticky top-11 z-10 bg-card">
      <Ribbon
        routePath={ribbonRoute}
        tabs={ribbonTabs}
        activeValue={activeTab}
        defaultValue={defaultTab}
      />
    </div>
  );
}
