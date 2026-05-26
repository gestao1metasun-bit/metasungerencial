import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Briefcase, Banknote, HardHat, Package, FileText, Wallet,
  Database, FileBarChart, Settings, Bell, Search, LogOut, ChevronDown, RefreshCw, ChevronRight, LineChart, Headset, ListChecks, Users, Receipt,
} from "lucide-react";
import logoMetaSun from "@/assets/logo-metasun.png";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ModuleKey } from "@/lib/perfis-store";
import { ROUTE_TABS, parseHash } from "@/lib/route-tabs";
import { signOut } from "@/lib/auth-store";
import { useIdentidade, canAccessModule } from "@/lib/identidade";
import { useContratos } from "@/lib/contratos-store";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { MaintenanceBanner } from "@/components/app/MaintenanceBanner";
import { FavoritosMenu, useRegisterRecente } from "@/components/app/FavoritosMenu";

type Tier = "operacao" | "controle" | "estrutura";
const nav: { to: string; label: string; icon: any; key: ModuleKey; tier: Tier }[] = [
  { to: "/dashboard", label: "Dashboard Geral", icon: LayoutDashboard, key: "dashboard", tier: "operacao" },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks, key: "dashboard", tier: "operacao" },
  { to: "/comercial", label: "Comercial", icon: Briefcase, key: "comercial", tier: "operacao" },
  { to: "/leads", label: "Leads / Pistas", icon: Users, key: "comercial", tier: "operacao" },
  { to: "/pedidos-venda", label: "Pedidos de Venda", icon: Receipt, key: "comercial", tier: "operacao" },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, key: "financeiro", tier: "operacao" },
  { to: "/financeiro-titulos", label: "Títulos Financeiros", icon: Receipt, key: "financeiro", tier: "operacao" },
  { to: "/financiamentos", label: "Financiamentos", icon: Banknote, key: "financiamentos", tier: "operacao" },
  { to: "/engenharia", label: "Engenharia", icon: HardHat, key: "engenharia", tier: "operacao" },
  { to: "/posvenda", label: "Pós-venda", icon: Headset, key: "posvenda", tier: "operacao" },
  { to: "/estoque", label: "Estoque", icon: Package, key: "estoque", tier: "operacao" },
  { to: "/estoque-fundacao", label: "Estoque Fundação", icon: Package, key: "estoque", tier: "operacao" },

  { to: "/analytics", label: "Analytics", icon: LineChart, key: "analytics", tier: "controle" },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, key: "relatorios", tier: "controle" },

  { to: "/cadastros", label: "Cadastros Operacionais", icon: Database, key: "cadastros", tier: "estrutura" },
  { to: "/configuracoes", label: "Configurações", icon: Settings, key: "configuracoes", tier: "estrutura" },
];

const TIER_META: Record<Tier, { label: string }> = {
  operacao: { label: "Operação" },
  controle: { label: "Controle" },
  estrutura: { label: "Estrutura" },
};

export function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTab, setCurrentTab] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(() => {
    const match = nav.find((n) => path === n.to || path.startsWith(n.to + "/"));
    return match?.to ?? null;
  });

  // Mantém o menu da rota atual aberto ao navegar
  useEffect(() => {
    const match = nav.find((n) => path === n.to || path.startsWith(n.to + "/"));
    if (match && ROUTE_TABS[match.to]) setOpenMenu(match.to);
  }, [path]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setCurrentTab(parseHash(hash));
  }, [hash]);

  const identidade = useIdentidade();
  useEffect(() => {
    console.info("[app-layout-auth]", {
      isAuthenticated: identidade.isAuthenticated,
      sessionLoading: identidade.sessionLoading,
      email: identidade.email,
      role: identidade.role,
      displayName: identidade.displayName,
    });
  }, [identidade.isAuthenticated, identidade.sessionLoading, identidade.email, identidade.role, identidade.displayName]);
  const navigate = useNavigate();
  const contratos = useContratos();
  const pendentesAssinatura = contratos.filter((c) => c.status === "Pendente").length;
  // Visibilidade de módulo agora é derivada APENAS da role Supabase.
  // Enquanto a sessão carrega, exibimos os módulos para não piscar a UI;
  // qualquer ação crítica continua bloqueada por `identidade.isAdminMaster`.
  const visibleNav = nav.filter((item) =>
    identidade.sessionLoading
      ? true
      : canAccessModule(identidade.role, item.key),
  );
  const grouped: Record<Tier, typeof visibleNav> = { operacao: [], controle: [], estrutura: [] };
  visibleNav.forEach((it) => grouped[it.tier].push(it));
  const tierOrder: Tier[] = ["operacao", "controle", "estrutura"];

  // Estrutura inicia colapsada; persiste preferência por sessão
  const [collapsedTiers, setCollapsedTiers] = useState<Record<Tier, boolean>>({ operacao: false, controle: false, estrutura: true });
  const [tiersHydrated, setTiersHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ms:tiers");
      if (raw) setCollapsedTiers((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
    setTiersHydrated(true);
  }, []);
  useEffect(() => {
    if (!tiersHydrated) return;
    try { sessionStorage.setItem("ms:tiers", JSON.stringify(collapsedTiers)); } catch { /* ignore */ }
  }, [collapsedTiers, tiersHydrated]);

  useRegisterRecente();
  const displayName = identidade.displayName;
  const displayPerfil = identidade.perfilNome;
  const initials = identidade.iniciais;

  async function handleLogout() {
    try {
      await signOut();
      toast.success("Sessão encerrada.");
      void navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao sair.");
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar — executive indigo with gold accents */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-gradient-sidebar text-sidebar-foreground relative">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent pointer-events-none" />

        <div className="relative flex h-16 items-center justify-center px-3 border-b border-sidebar-border bg-white/95 backdrop-blur">
          <img src={logoMetaSun} alt="META SUN — Energia Solar" className="h-10 w-auto object-contain" />
          <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {tierOrder.map((tier) => {
            const items = grouped[tier];
            if (items.length === 0) return null;
            const meta = TIER_META[tier];
            const collapsed = collapsedTiers[tier];
            const hasActive = items.some((it) => path === it.to || path.startsWith(it.to + "/"));
            // Se o tier tem rota ativa, força aberto
            const showItems = !collapsed || hasActive;
            return (
              <div key={tier} className="mb-4 last:mb-0">
                <button
                  type="button"
                  onClick={() => setCollapsedTiers((c) => ({ ...c, [tier]: !c[tier] }))}
                  className="w-full px-3 pb-2 flex items-center gap-2 group"
                >
                  <span className={`text-[10px] font-bold uppercase tracking-[0.22em] transition ${tier === "estrutura" ? "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70" : "text-gold/80 group-hover:text-gold"}`}>
                    {meta.label}
                  </span>
                  <span className="h-px flex-1 bg-sidebar-border/60" />
                  <ChevronDown className={`h-3 w-3 transition-transform ${showItems ? "" : "-rotate-90"} ${tier === "estrutura" ? "text-sidebar-foreground/40" : "text-gold/60"}`} />
                </button>
                {showItems && (
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const active = path === item.to || path.startsWith(item.to + "/");
                      const Icon = item.icon;
                      const sub = ROUTE_TABS[item.to];
                      const isOpen = openMenu === item.to;
                      const dimmed = tier === "estrutura" && !active;
                      return (
                        <li key={item.to}>
                          <div className={`group flex items-center gap-2 rounded-md pr-1 text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent/60 ${active ? "nav-item-active" : dimmed ? "text-sidebar-foreground/60" : "text-sidebar-foreground/85"}`}>
                            <Link to={item.to} className="flex flex-1 items-center gap-3 px-3 py-2 min-w-0">
                              <Icon className={`h-4 w-4 transition-colors ${active ? "text-gold" : dimmed ? "text-sidebar-foreground/45 group-hover:text-gold" : "text-sidebar-foreground/60 group-hover:text-gold"}`} />
                              <span className="flex-1 truncate tracking-tight">{item.label}</span>
                              {item.to === "/comercial" && pendentesAssinatura > 0 && (
                                <span
                                  title={`${pendentesAssinatura} contrato(s) pendente(s) de assinatura`}
                                  className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground shadow-sm"
                                >
                                  {pendentesAssinatura}
                                </span>
                              )}
                            </Link>
                            {sub && (
                              <button
                                type="button"
                                aria-label={isOpen ? "Recolher" : "Expandir"}
                                onClick={() => setOpenMenu((cur) => (cur === item.to ? null : item.to))}
                                className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/5"
                              >
                                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""} ${active ? "text-gold" : "text-sidebar-foreground/50"}`} />
                              </button>
                            )}
                          </div>

                          {sub && isOpen && (() => {
                            const visibleTabs = sub.tabs.filter((t) => !t.hidden);
                            const groups: { name: string | null; tabs: typeof visibleTabs }[] = [];
                            visibleTabs.forEach((t) => {
                              const g = t.group ?? null;
                              const last = groups[groups.length - 1];
                              if (last && last.name === g) last.tabs.push(t);
                              else groups.push({ name: g, tabs: [t] });
                            });
                            return (
                              <ul className="ml-7 mt-1 mb-1 space-y-0.5 border-l border-sidebar-border/70 pl-3">
                                {groups.map((g, gi) => {
                                  const isStructural = g.name === "Estrutura" || g.name === "Sistema";
                                  return (
                                    <li key={`g-${gi}`}>
                                      {g.name && (
                                        <div className={`mt-2 mb-0.5 px-3 text-[10px] font-bold uppercase tracking-wider ${isStructural ? "text-sidebar-foreground/30" : "text-sidebar-foreground/40"}`}>
                                          {g.name}
                                        </div>
                                      )}
                                      <ul className="space-y-0.5">
                                        {g.tabs.map((t) => {
                                          const tabActive = active && isHydrated && currentTab === t.value;
                                          const tabDimmed = isStructural && !tabActive;
                                          return (
                                            <li key={t.value}>
                                              <Link
                                                to={item.to}
                                                hash={`tab=${t.value}`}
                                                className={`flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-[13px] transition ${
                                                  tabActive
                                                    ? "bg-gold/15 text-gold font-semibold"
                                                    : tabDimmed
                                                    ? "text-sidebar-foreground/55 hover:bg-white/5 hover:text-sidebar-foreground"
                                                    : "text-sidebar-foreground/75 hover:bg-white/5 hover:text-sidebar-foreground"
                                                }`}
                                              >
                                                <span className="truncate">{t.label}</span>
                                              </Link>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </li>
                                  );
                                })}
                              </ul>
                            );
                          })()}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>


        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent/50 p-3 ring-1 ring-white/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">Versão</div>
                <div className="text-sm font-semibold text-gold font-display">1.0.0</div>
              </div>
              <div className="h-8 w-8 rounded-md bg-gradient-gold shadow-gold" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/85 backdrop-blur-xl px-6 shadow-elegant relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contratos, clientes, obras..."
              className="h-9 pl-9 bg-secondary/70 border-border rounded-lg focus-visible:ring-primary"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-2 shadow-sm">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <FavoritosMenu />
            {!identidade.sessionLoading && !identidade.isAuthenticated && (
              <button
                type="button"
                onClick={() => void navigate({ to: "/login" })}
                title="Faça login para habilitar ações administrativas (criar/liberar contratos, etc.)."
                className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-amber-400/60 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
              >
                <LogIn className="h-3 w-3" /> Sem sessão
              </button>
            )}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-gold" />
            </Button>
            <Link to="/configuracoes" className="hidden md:flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-accent transition-colors shadow-sm">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground ring-2 ring-gold/30">{initials}</div>
              <div className="leading-tight text-left">
                <div className="text-sm font-semibold tracking-tight">{displayName}</div>
                <div className="text-[11px] text-muted-foreground">{displayPerfil}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <MaintenanceBanner />

        <main className="flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
