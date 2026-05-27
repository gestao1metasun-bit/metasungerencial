import { Link, useRouterState } from "@tanstack/react-router";
import { ROUTE_TABS, parseHash } from "@/lib/route-tabs";
import { useIdentidade, canAccessModule } from "@/lib/identidade";
import { MACRO_MODULES, macroAtivoPorRota } from "@/lib/nav-structure";
import { Ribbon } from "@/components/app/Ribbon";

export function TopNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const identidade = useIdentidade();
  const activeTab = parseHash(hash);

  const visible = MACRO_MODULES.filter((m) =>
    identidade.sessionLoading ? true : canAccessModule(identidade.role, m.accessKey),
  );
  const active = macroAtivoPorRota(path) ?? visible[0];

  // Ribbon: pega ROUTE_TABS do caminho ativo (se houver)
  const ribbonCfg = ROUTE_TABS[path] ?? (active ? ROUTE_TABS[active.to] : undefined);
  const ribbonTabs = ribbonCfg?.tabs.filter((t) => !t.hidden) ?? [];
  const defaultTab = ribbonCfg?.default ?? "";
  const ribbonRoute = ROUTE_TABS[path] ? path : (active?.to ?? path);

  return (
    <div className="sticky top-11 z-10 border-b border-border bg-card/95 backdrop-blur shadow-sm">
      {/* Linha 1: macro módulos — sempre visíveis (padrão TOTVS RM/Sankhya/SAP) */}
      <div className="flex items-center gap-0.5 overflow-x-auto px-3 py-1">
        {visible.map((m) => {
          const isActive = active?.key === m.key;
          const Icon = m.icon;
          return (
            <Link
              key={m.key}
              to={m.to}
              className={`group inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap transition border-b-2 ${
                isActive
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-transparent text-foreground/75 hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-gold"}`} />
              {m.label}
            </Link>
          );
        })}
      </div>

      {/* Linha 2: ribbon TOTVS por grupos */}
      {ribbonTabs.length > 0 && (
        <Ribbon
          routePath={ribbonRoute}
          tabs={ribbonTabs}
          activeValue={activeTab}
          defaultValue={defaultTab}
        />
      )}
    </div>
  );
}
