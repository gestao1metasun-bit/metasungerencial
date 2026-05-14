import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Briefcase, Banknote, HardHat, Package,
  Database, FileBarChart, Settings, Sun, Bell, Search, LogOut, ChevronDown, RefreshCw, ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsuarioAtual, podeAcessarModulo, type ModuleKey } from "@/lib/perfis-store";
import { ROUTE_TABS } from "@/lib/route-tabs";

const nav: { to: string; label: string; icon: any; key: ModuleKey }[] = [
  { to: "/dashboard", label: "Dashboard Geral", icon: LayoutDashboard, key: "dashboard" },
  { to: "/comercial", label: "Comercial", icon: Briefcase, key: "comercial" },
  { to: "/financiamentos", label: "Financiamentos", icon: Banknote, key: "financiamentos" },
  { to: "/engenharia", label: "Engenharia", icon: HardHat, key: "engenharia" },
  { to: "/estoque", label: "Estoque", icon: Package, key: "estoque" },
  { to: "/cadastros", label: "Cadastros", icon: Database, key: "cadastros" },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, key: "relatorios" },
  { to: "/configuracoes", label: "Configurações", icon: Settings, key: "configuracoes" },
];

export function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const currentTab = (() => {
    const clean = hash?.startsWith("#") ? hash.slice(1) : hash ?? "";
    const m = /(?:^|&)tab=([^&]+)/.exec(clean);
    return m ? decodeURIComponent(m[1]) : "";
  })();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { user, perfil } = useUsuarioAtual();
  const visibleNav = nav.filter((item) => podeAcessarModulo(perfil, item.key));
  const initials = (user?.nome ?? "??").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary">
            <Sun className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide text-primary">META SUN</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Gerencial</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Menu
          </div>
          <ul className="space-y-0.5">
            {visibleNav.map((item) => {
              const active = path === item.to || path.startsWith(item.to + "/");
              const Icon = item.icon;
              const sub = ROUTE_TABS[item.to];
              const isOpen = expanded[item.to] ?? active;
              return (
                <li key={item.to} className="group/item relative">
                  <div
                    className={`group flex items-center gap-2 rounded-md pr-1 text-sm font-medium transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Link to={item.to} className="flex flex-1 items-center gap-3 px-3 py-2 min-w-0">
                      <Icon className={`h-4 w-4 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"}`} />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                    {sub && (
                      <button
                        type="button"
                        aria-label={isOpen ? "Recolher" : "Expandir"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpanded((s) => ({ ...s, [item.to]: !isOpen }));
                        }}
                        className={`grid h-7 w-7 place-items-center rounded hover:bg-black/10 ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
                      >
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </button>
                    )}
                  </div>

                  {/* Inline expanded list (click chevron) */}
                  {sub && isOpen && (
                    <ul className="mt-1 ml-7 space-y-0.5 border-l border-sidebar-border pl-2">
                      {sub.tabs.map((t) => {
                        const tabActive = active && currentTab === t.value;
                        return (
                          <li key={t.value}>
                            <Link
                              to={item.to}
                              hash={`tab=${t.value}`}
                              className={`block rounded px-2 py-1.5 text-xs transition ${
                                tabActive
                                  ? "bg-primary/15 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              }`}
                            >
                              {t.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Hover flyout (keeps quick access) */}
                  {sub && (
                    <div className="invisible opacity-0 group-hover/item:visible group-hover/item:opacity-100 transition-opacity absolute left-full top-0 z-50 ml-1 min-w-[240px] rounded-md border border-border bg-popover p-1 shadow-lg">
                      {sub.tabs.map((t) => (
                        <Link
                          key={t.value}
                          to={item.to}
                          hash={`tab=${t.value}`}
                          className="block rounded px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                          {t.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-md bg-sidebar-accent p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Versão</div>
            <div className="text-sm font-semibold text-primary">1.0.0</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card px-6 shadow-[var(--shadow-elegant)]">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contratos, clientes, obras..."
              className="h-9 pl-9 bg-secondary border-border focus-visible:ring-primary"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <Bell className="h-4 w-4" />
            </Button>
            <Link to="/configuracoes" className="hidden md:flex items-center gap-3 rounded-md border border-border bg-card px-3 py-1.5 hover:bg-accent">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials}</div>
              <div className="leading-tight text-left">
                <div className="text-sm font-medium">{user?.nome ?? "—"}</div>
                <div className="text-[11px] text-muted-foreground">{perfil?.nome ?? "Sem perfil"}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
