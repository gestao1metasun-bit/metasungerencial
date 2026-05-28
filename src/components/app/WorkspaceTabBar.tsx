/**
 * D16.UX — Barra de abas dinâmicas (workspace ERP).
 * Renderizada entre o TopNav (ribbon) e o <Outlet/>.
 */
import { useEffect } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { X, Pin } from "lucide-react";
import { toast } from "sonner";
import { useIdentidade } from "@/lib/identidade";
import {
  useWorkspaceTabs,
  loadForUser,
  openTabForRoute,
  closeTab,
  setActive,
  isKnownRoute,
} from "@/lib/workspace-tabs";
import { NAV_ITEMS, MACRO_MODULES } from "@/lib/nav-structure";

function iconForRoute(to: string) {
  const nav = NAV_ITEMS.find((n) => n.to === to);
  if (nav) return nav.icon;
  const macro = MACRO_MODULES.find((m) => m.to === to);
  return macro?.icon;
}

export function WorkspaceTabBar() {
  const identidade = useIdentidade();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { tabs, activeId } = useWorkspaceTabs();

  // 1) Carrega/restaura abas ao logar (por usuário)
  useEffect(() => {
    if (identidade.sessionLoading) return;
    loadForUser(identidade);
  }, [identidade.email, identidade.role, identidade.sessionLoading]);

  // 2) Sincroniza rota atual com abas abertas
  useEffect(() => {
    if (identidade.sessionLoading) return;
    if (!identidade.isAuthenticated) return;
    if (!isKnownRoute(pathname)) return; // rotas como /login não viram aba
    const res = openTabForRoute(pathname, identidade);
    if (!res.ok && res.reason === "forbidden") {
      toast.error("Sem permissão para acessar este módulo.");
      void navigate({ to: "/dashboard" });
    }
  }, [pathname, identidade.role, identidade.isAuthenticated, identidade.sessionLoading]);

  if (!identidade.isAuthenticated) return null;
  if (tabs.length === 0) return null;

  const handleClick = (to: string) => {
    setActive(to);
    if (to !== pathname) void navigate({ to });
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = closeTab(id);
    if (next && id === activeId) void navigate({ to: next.to });
  };

  return (
    <div className="sticky top-11 z-[9] flex items-stretch gap-0 border-b border-border bg-muted/40 px-2 overflow-x-auto h-8">
      {tabs.map((t) => {
        const Icon = iconForRoute(t.to);
        const isActive = t.id === activeId;
        return (
          <div
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(t.to)}
            onAuxClick={(e) => {
              if (e.button === 1 && !t.pinned) handleClose(e, t.id);
            }}
            className={`group inline-flex items-center gap-1.5 shrink-0 cursor-pointer select-none px-2.5 text-[11.5px] border-r border-border/60 transition-colors ${
              isActive
                ? "bg-background text-foreground font-semibold border-b-2 border-b-primary -mb-px"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            }`}
            title={t.to}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
            <span className="max-w-[160px] truncate">{t.label}</span>
            {t.pinned ? (
              <Pin className="h-3 w-3 text-muted-foreground/60" />
            ) : (
              <button
                type="button"
                onClick={(e) => handleClose(e, t.id)}
                aria-label={`Fechar ${t.label}`}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
