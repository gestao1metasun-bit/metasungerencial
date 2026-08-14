/**
 * D16.UX.2 — Barra de abas dinâmicas (workspace ERP) com:
 * - Menu de contexto (botão direito) com todas as ações;
 * - Atalhos globais (hook useWorkspaceShortcuts);
 * - Preservação de scroll por aba;
 * - Reabrir última fechada (Ctrl+Shift+T ou menu).
 *
 * Estado salvo: somente UI (abas, scroll, fixadas).
 * Não toca Auth / RLS / RPCs / regras de negócio.
 */
import { useEffect, useRef } from "react";
import { useRouter, useRouterState, useNavigate } from "@tanstack/react-router";
import { X, Pin, PinOff, RefreshCw, Copy, Link2, RotateCcw, ChevronsLeft, ChevronsRight, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useIdentidade } from "@/lib/identidade";
import {
  useWorkspaceTabs,
  loadForUser,
  openTabForRoute,
  closeTab,
  closeOthers,
  closeToRight,
  closeToLeft,
  togglePin,
  reopenLast,
  setActive,
  isKnownRoute,
  setTabScroll,
  getTabScroll,
} from "@/lib/workspace-tabs";
import { useWorkspaceShortcuts } from "@/lib/use-workspace-shortcuts";
import { NAV_ITEMS, MACRO_MODULES } from "@/lib/nav-structure";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

function iconForRoute(to: string) {
  const nav = NAV_ITEMS.find((n) => n.to === to);
  if (nav) return nav.icon;
  const macro = MACRO_MODULES.find((m) => m.to === to);
  return macro?.icon;
}

export function WorkspaceTabBar() {
  const identidade = useIdentidade();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { tabs, activeId } = useWorkspaceTabs();
  const lastActiveRef = useRef<string | null>(null);

  // Atalhos globais
  useWorkspaceShortcuts();

  // 1) Carrega/restaura abas ao logar (por usuário)
  useEffect(() => {
    if (identidade.sessionLoading) return;
    loadForUser(identidade);
  }, [identidade.email, identidade.role, identidade.sessionLoading]);

  // 2) Sincroniza rota atual com abas abertas
  useEffect(() => {
    if (identidade.sessionLoading) return;
    if (!identidade.isAuthenticated) return;
    // D19.1.fix: role carrega em background após signIn. Não decidir
    // permissão enquanto role ainda é null — geraria falso "forbidden".
    if (!identidade.role) return;
    if (!isKnownRoute(pathname)) return;
    const res = openTabForRoute(pathname, identidade);
    if (!res.ok && res.reason === "forbidden") {
      toast.error("Sem permissão para acessar este módulo.");
      void navigate({ to: "/dashboard" });
    }
  }, [pathname, identidade.role, identidade.isAuthenticated, identidade.sessionLoading]);

  // 3) Preservação de scroll por aba (apenas UI, nunca dado operacional)
  useEffect(() => {
    if (!activeId) return;
    const prev = lastActiveRef.current;
    if (prev && prev !== activeId) {
      setTabScroll(prev, window.scrollY || document.documentElement.scrollTop || 0);
    }
    // Restaura scroll da nova aba no próximo frame (após render do conteúdo)
    const y = getTabScroll(activeId);
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "auto" });
    });
    lastActiveRef.current = activeId;
  }, [activeId]);

  // 3b) Salva scroll antes de unload/troca
  useEffect(() => {
    const onSave = () => {
      if (activeId) {
        setTabScroll(activeId, window.scrollY || document.documentElement.scrollTop || 0);
      }
    };
    window.addEventListener("beforeunload", onSave);
    window.addEventListener("pagehide", onSave);
    return () => {
      window.removeEventListener("beforeunload", onSave);
      window.removeEventListener("pagehide", onSave);
    };
  }, [activeId]);

  if (!identidade.isAuthenticated) return null;
  if (tabs.length === 0) return null;

  const goTo = (to: string) => {
    setActive(to);
    if (to !== pathname) void navigate({ to });
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = closeTab(id);
    if (next && id === activeId) void navigate({ to: next.to });
  };

  const onReload = () => {
    void router.invalidate();
  };

  const onDuplicate = (to: string) => {
    // Mesma rota já é uma única aba: abrimos cópia em nova aba do navegador.
    try {
      window.open(window.location.origin + to, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível duplicar a aba.");
    }
  };

  const onCopyLink = (to: string) => {
    const url = window.location.origin + to;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copiado."))
      .catch(() => toast.error("Falha ao copiar."));
  };

  const onReopen = () => {
    const r = reopenLast(identidade);
    if (r.ok) void navigate({ to: r.tab.to });
    else if (r.reason === "empty") toast.info("Nenhuma aba para reabrir.");
    else toast.error("Sem permissão para reabrir esta aba.");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch gap-0 border-t border-border bg-muted/60 backdrop-blur px-2 overflow-x-auto h-8">
      {tabs.map((t) => {
        const Icon = iconForRoute(t.to);
        const isActive = t.id === activeId;
        return (
          <ContextMenu key={t.id}>
            <ContextMenuTrigger asChild>
              <div
                role="tab"
                aria-selected={isActive}
                onClick={() => goTo(t.to)}
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
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 text-[12px]">
              <ContextMenuItem onSelect={() => goTo(t.to)}>
                <Link2 className="mr-2 h-3.5 w-3.5" />
                Ativar aba
              </ContextMenuItem>
              <ContextMenuItem onSelect={onReload}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Recarregar
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onDuplicate(t.to)}>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Duplicar
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onCopyLink(t.to)}>
                <Link2 className="mr-2 h-3.5 w-3.5" />
                Copiar link
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => togglePin(t.id)}
                disabled={t.id === "/dashboard"}
              >
                {t.pinned ? (
                  <>
                    <PinOff className="mr-2 h-3.5 w-3.5" />
                    Desfixar
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-3.5 w-3.5" />
                    Fixar
                  </>
                )}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => {
                  if (t.pinned) {
                    toast.info("Aba fixada — desfixe antes de fechar.");
                    return;
                  }
                  const next = closeTab(t.id);
                  if (next && t.id === activeId) void navigate({ to: next.to });
                }}
                disabled={t.pinned}
                className="text-destructive focus:text-destructive"
              >
                <X className="mr-2 h-3.5 w-3.5" />
                Fechar
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => closeOthers(t.id)}>
                <XCircle className="mr-2 h-3.5 w-3.5" />
                Fechar outras
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => closeToLeft(t.id)}>
                <ChevronsLeft className="mr-2 h-3.5 w-3.5" />
                Fechar à esquerda
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => closeToRight(t.id)}>
                <ChevronsRight className="mr-2 h-3.5 w-3.5" />
                Fechar à direita
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={onReopen}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Reabrir última fechada
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Ctrl+Shift+T
                </span>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
