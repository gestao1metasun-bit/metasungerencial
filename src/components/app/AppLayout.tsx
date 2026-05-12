import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Briefcase, Banknote, HardHat, Wallet, Package,
  Database, FileBarChart, Settings, Sun, Bell, Search, LogOut, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard Geral", icon: LayoutDashboard },
  { to: "/comercial", label: "Comercial", icon: Briefcase },
  { to: "/financiamentos", label: "Financiamentos", icon: Banknote },
  { to: "/engenharia", label: "Engenharia", icon: HardHat },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/cadastros", label: "Cadastros", icon: Database },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Sun className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">META SUN</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Gerencial</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Navegação
          </div>
          <ul className="space-y-1">
            {nav.map((item) => {
              const active = path === item.to || path.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-sidebar-accent text-primary shadow-[inset_3px_0_0_var(--primary)]"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <div className="text-xs text-muted-foreground">Versão</div>
            <div className="text-sm font-semibold">1.0.0 — beta</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contratos, clientes, obras..."
              className="h-10 pl-9 bg-input/60 border-border focus-visible:ring-primary"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="hidden md:flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-1.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">AM</div>
              <div className="leading-tight">
                <div className="text-sm font-medium">Admin Master</div>
                <div className="text-[11px] text-muted-foreground">Administrador</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
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
