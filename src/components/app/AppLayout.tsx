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
import { TopNav } from "@/components/app/TopNav";
import { ContextualSidebar } from "@/components/app/ContextualSidebar";
import { featureFlags } from "@/lib/feature-flags";



type Tier = "operacao" | "controle" | "estrutura";
const nav: { to: string; label: string; icon: any; key: ModuleKey; tier: Tier }[] = [
  { to: "/paineis", label: "Painéis", icon: LayoutDashboard, key: "dashboard", tier: "operacao" },
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

  { to: "/analises", label: "Análises", icon: LineChart, key: "analytics", tier: "controle" },
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

  // D6.6 — Enterprise Shell é o padrão definitivo. A sidebar legada SaaS foi
  // removida. A flag ainda é lida apenas para permitir um fallback manual via
  // localStorage durante diagnóstico, mas sem renderizar o menu antigo.
  void featureFlags.ENTERPRISE_SHELL_FULL;

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <ContextualSidebar />

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar corporativo enxuto: logo + macro nav (TopNav) + identidade */}
        <header className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-xl px-3 shadow-sm relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <div className="flex items-center gap-2 pr-3 mr-1 border-r border-border/60">
            <img src={logoMetaSun} alt="META SUN" className="h-6 w-auto object-contain" />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground hidden md:inline">
              Gerencial
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <FavoritosMenu />
            {!identidade.sessionLoading && !identidade.isAuthenticated && (
              <button
                type="button"
                onClick={() => void navigate({ to: "/login" })}
                title="Faça login para habilitar ações administrativas."
                className="hidden md:inline-flex items-center gap-1.5 rounded border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                <LogIn className="h-3 w-3" /> Sem sessão
              </button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-gold" />
            </Button>
            <Link
              to="/configuracoes"
              className="hidden md:flex items-center gap-2 rounded border border-border bg-card px-2 py-0.5 hover:bg-accent"
            >
              <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground ring-1 ring-gold/30">{initials}</div>
              <div className="leading-tight text-left">
                <div className="text-[11.5px] font-semibold tracking-tight">{displayName}</div>
                <div className="text-[9.5px] text-muted-foreground">{displayPerfil}</div>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>
        <MaintenanceBanner />
        <TopNav />

        <main className="flex-1 overflow-x-hidden p-2">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
