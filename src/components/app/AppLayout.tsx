import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, ChevronDown, LogIn } from "lucide-react";
import logoMetaSun from "@/assets/logo-metasun.png";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-store";
import { useIdentidade } from "@/lib/identidade";
import { toast } from "sonner";
import { MaintenanceBanner } from "@/components/app/MaintenanceBanner";
import { FavoritosMenu, useRegisterRecente } from "@/components/app/FavoritosMenu";
import { TopNav } from "@/components/app/TopNav";
import { ContextualSidebar } from "@/components/app/ContextualSidebar";
import { CommandPalette } from "@/components/app/CommandPalette";
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
      <CommandPalette />
    </div>
  );
}
