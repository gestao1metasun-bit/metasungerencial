/**
 * D16.UX.2 — Atalhos globais da Área de Trabalho com Abas.
 *
 * Ctrl+Tab          → próxima aba
 * Ctrl+Shift+Tab    → aba anterior
 * Ctrl+W            → fechar aba ativa (Dashboard não fecha)
 * Ctrl+1..Ctrl+9    → ir para aba N
 * Ctrl+Shift+T      → reabrir última aba fechada
 *
 * Regras:
 * - Ignora quando foco em input/textarea/select/contenteditable.
 * - Permissão sempre validada (delegada ao store).
 * - Não altera Auth / RLS / RPCs / regras de negócio.
 */
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useIdentidade } from "@/lib/identidade";
import {
  activateNext,
  activateByIndex,
  closeTab,
  reopenLast,
  getActiveTab,
} from "@/lib/workspace-tabs";

function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  // Editores Monaco / Tiptap / CodeMirror tipicamente expõem role="textbox"
  if (el.getAttribute("role") === "textbox") return true;
  return false;
}

export function useWorkspaceShortcuts() {
  const navigate = useNavigate();
  const identidade = useIdentidade();

  useEffect(() => {
    if (!identidade.isAuthenticated) return;

    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (isEditableTarget(e.target)) return;

      // Ctrl+Shift+T → reabrir
      if (e.shiftKey && (e.key === "T" || e.key === "t")) {
        e.preventDefault();
        const r = reopenLast(identidade);
        if (r.ok) {
          void navigate({ to: r.tab.to });
        } else if (r.reason === "empty") {
          toast.info("Nenhuma aba para reabrir.");
        } else {
          toast.error("Sem permissão para reabrir esta aba.");
        }
        return;
      }

      // Ctrl+Shift+Tab → anterior
      if (e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const prev = activateNext(-1);
        if (prev) void navigate({ to: prev.to });
        return;
      }

      // Ctrl+Tab → próxima
      if (!e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const next = activateNext(1);
        if (next) void navigate({ to: next.to });
        return;
      }

      // Ctrl+W → fecha ativa
      if (!e.shiftKey && (e.key === "w" || e.key === "W")) {
        const active = getActiveTab();
        if (!active) return;
        if (active.pinned) {
          e.preventDefault();
          toast.info("Aba Dashboard fixada não pode ser fechada.");
          return;
        }
        e.preventDefault();
        const next = closeTab(active.id);
        if (next) void navigate({ to: next.to });
        return;
      }

      // Ctrl+1..9 → aba N
      if (!e.shiftKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const tab = activateByIndex(parseInt(e.key, 10));
        if (tab) void navigate({ to: tab.to });
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [identidade.isAuthenticated, identidade.role, navigate]);
}
