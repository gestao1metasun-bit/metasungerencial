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
