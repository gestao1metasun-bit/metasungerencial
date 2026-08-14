import { Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";

import { LogOut, ChevronDown, LogIn, PanelRight } from "lucide-react";
import { NotificacoesBell } from "@/components/app/NotificacoesBell";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/lib/auth-store";
import { useIdentidade } from "@/lib/identidade";
import { toast } from "sonner";
import { MaintenanceBanner } from "@/components/app/MaintenanceBanner";
import { FavoritosMenu, useRegisterRecente } from "@/components/app/FavoritosMenu";
import { TopNav } from "@/components/app/TopNav";
import { ContextualSidebar } from "@/components/app/ContextualSidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { WorkspaceTabBar } from "@/components/app/WorkspaceTabBar";
import { featureFlags } from "@/lib/feature-flags";

export function AppLayout() {
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
  const router = useRouter();

  // D19.2.fix.50u.3 — Loop massivo `router.preloadRoute` em rAF foi REMOVIDO.
  // Causa: TanStack Router 1.168.25 materializava `match` no pool sem
  // `_nonReactive` populado em concorrência, gerando
  // `TypeError: Cannot read properties of undefined (reading '_nonReactive')`
  // no MatchInner (node_modules/@tanstack/react-router/src/Match.tsx).
  // O ganho do P0-2 fica preservado pelo `defaultPreload: 'intent'` +
  // `defaultPreloadDelay: 50` já configurados em src/router.tsx (D19.1.fix F6):
  // o chunk aquece no hover do MacroNav, que é o caminho real do usuário.
  void router;


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

  // D6.6 — Enterprise Shell é o padrão definitivo. Sidebar legada SaaS removida.
  // D6.10 — Sidebar fixa REMOVIDA. Contexto vira drawer sob demanda (TOTVS RM/SAP desktop).
  void featureFlags.ENTERPRISE_SHELL_FULL;

  const [contextOpen, setContextOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      {/* Topbar corporativo full-width: logo + identidade */}
      <header className="sticky top-0 z-40 flex h-11 w-full items-center gap-2 border-b border-meta-bar-active/40 bg-meta-bar text-meta-bar-foreground px-3 shadow-sm">
        <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
          <img src={logoMetaSun} alt="META SUN" className="h-6 w-auto object-contain" />
        </Link>
        <div className="min-w-0 flex-1 truncate text-[12px] font-semibold tracking-tight text-white/90">
          Meta Sun Gerencial
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pl-2 ml-1 border-l border-white/15">
          <FavoritosMenu />
          {!identidade.sessionLoading && !identidade.isAuthenticated && (
            <button
              type="button"
              onClick={() => void navigate({ to: "/login" })}
              title="Faça login para habilitar ações administrativas."
              className="hidden md:inline-flex items-center gap-1.5 rounded border border-amber-300/60 bg-amber-400/20 px-2 py-0.5 text-[10.5px] font-semibold text-amber-100 hover:bg-amber-400/30"
            >
              <LogIn className="h-3 w-3" /> Sem sessão
            </button>
          )}
          <NotificacoesBell />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setContextOpen(true)}
            title="Painel de contexto (favoritos, recentes, pendências)"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
          <Link
            to="/configuracoes"
            className="hidden md:flex items-center gap-2 rounded border border-white/15 bg-white/10 px-2 py-0.5 hover:bg-white/15"
          >
            <div className="grid h-6 w-6 place-items-center rounded-full bg-meta-bar-active text-[10px] font-bold text-white ring-1 ring-gold/40">{initials}</div>
            <div className="leading-tight text-left">
              <div className="text-[11.5px] font-semibold tracking-tight text-white">{displayName}</div>
              <div className="text-[9.5px] text-white/60">{displayPerfil}</div>
            </div>
            <ChevronDown className="h-3 w-3 text-white/60" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Sair"
            className="h-7 w-7 text-white/80 hover:text-red-200 hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MaintenanceBanner />
          <TopNav />
          <WorkspaceTabBar />

          <main className="min-w-0 flex-1 overflow-x-hidden p-3">
            <Outlet />
          </main>
        </div>
      </div>


      {/* Painel contextual sob demanda — drawer lateral direita */}
      <Sheet open={contextOpen} onOpenChange={setContextOpen}>
        <SheetContent side="right" className="w-64 p-0 sm:max-w-[16rem]">
          <SheetHeader className="sr-only">
            <SheetTitle>Painel de contexto</SheetTitle>
          </SheetHeader>
          <ContextualSidebar />
        </SheetContent>
      </Sheet>

      <CommandPalette />
    </div>
  );
}
