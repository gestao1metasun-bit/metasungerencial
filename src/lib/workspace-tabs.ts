/**
 * D16.UX — Área de Trabalho com abas dinâmicas (estilo TOTVS RM).
 *
 * Store leve baseado em useSyncExternalStore.
 * - Tabs são derivadas das rotas conhecidas em NAV_ITEMS / MACRO_MODULES.
 * - Persistência por usuário em localStorage.
 * - Permissão validada no `openTab` usando canAccessModule.
 * - Não altera RLS / Auth / Supabase.
 */
import { useSyncExternalStore } from "react";
import { NAV_ITEMS, MACRO_MODULES } from "@/lib/nav-structure";
import type { Identidade } from "@/lib/identidade";
import { canAccessModule } from "@/lib/identidade";

export type WorkspaceTab = {
  id: string;          // = pathname (uma aba por rota)
  to: string;          // pathname para navegar
  label: string;
  iconKey?: string;    // chave para resolver ícone no render
  accessKey: string;
  pinned?: boolean;    // Dashboard pinada não fecha
};

type State = {
  tabs: WorkspaceTab[];
  activeId: string | null;
};

const DEFAULT_TAB: WorkspaceTab = {
  id: "/dashboard",
  to: "/dashboard",
  label: "Dashboard",
  accessKey: "dashboard",
  pinned: true,
};

const LS_PREFIX = "ms.ui.workspace.tabs.";
const LS_VERSION = "v1";
function lsKey(userKey: string) {
  return `${LS_PREFIX}${userKey}.${LS_VERSION}`;
}

let state: State = { tabs: [DEFAULT_TAB], activeId: DEFAULT_TAB.id };
let currentUserKey: string = "anon";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(lsKey(currentUserKey), JSON.stringify(state));
  } catch {
    /* quota / privado — ignora */
  }
}

function resolveRouteMeta(pathname: string): WorkspaceTab | null {
  // 1) match exato em NAV_ITEMS
  const nav = NAV_ITEMS.find((n) => n.to === pathname);
  if (nav) {
    return {
      id: pathname,
      to: pathname,
      label: nav.label,
      iconKey: pathname,
      accessKey: nav.accessKey,
    };
  }
  // 2) match em MACRO_MODULES (rota raiz do macro)
  const macro = MACRO_MODULES.find((m) => m.to === pathname);
  if (macro) {
    return {
      id: pathname,
      to: pathname,
      label: macro.label,
      iconKey: pathname,
      accessKey: macro.accessKey,
    };
  }
  // 3) prefixo de macro (sub-rotas)
  const macroPrefix = MACRO_MODULES.find((m) =>
    m.matches.some((p) => pathname === p || pathname.startsWith(p + "/")),
  );
  if (macroPrefix) {
    const navChild = NAV_ITEMS.find((n) => n.to === pathname);
    return {
      id: pathname,
      to: pathname,
      label: navChild?.label ?? pathname.replace(/^\//, ""),
      iconKey: pathname,
      accessKey: navChild?.accessKey ?? macroPrefix.accessKey,
    };
  }
  return null;
}

// ── API pública ────────────────────────────────────────────────────────────

export function loadForUser(identidade: Identidade) {
  const key = identidade.email || identidade.role || "anon";
  if (key === currentUserKey) return;
  currentUserKey = key;
  let restored: State | null = null;
  try {
    const raw = localStorage.getItem(lsKey(key));
    if (raw) restored = JSON.parse(raw);
  } catch {
    restored = null;
  }
  if (restored && Array.isArray(restored.tabs) && restored.tabs.length > 0) {
    // Revalida permissões
    const allowed = restored.tabs.filter((t) =>
      canAccessModule(identidade.role, t.accessKey),
    );
    const tabs =
      allowed.length > 0 ? allowed : [DEFAULT_TAB];
    // Garante Dashboard pinada
    if (!tabs.some((t) => t.id === DEFAULT_TAB.id)) tabs.unshift(DEFAULT_TAB);
    const activeId =
      tabs.find((t) => t.id === restored?.activeId)?.id ?? tabs[0].id;
    state = { tabs, activeId };
  } else {
    state = { tabs: [DEFAULT_TAB], activeId: DEFAULT_TAB.id };
  }
  persist();
  emit();
}

export function openTabForRoute(
  pathname: string,
  identidade: Identidade,
): { ok: true } | { ok: false; reason: "unknown-route" | "forbidden" } {
  const meta = resolveRouteMeta(pathname);
  if (!meta) {
    // Rota desconhecida: ainda assim seta como ativa se já existir
    const existing = state.tabs.find((t) => t.id === pathname);
    if (existing) {
      if (state.activeId !== pathname) {
        state = { ...state, activeId: pathname };
        persist();
        emit();
      }
      return { ok: true };
    }
    return { ok: false, reason: "unknown-route" };
  }
  if (!canAccessModule(identidade.role, meta.accessKey)) {
    return { ok: false, reason: "forbidden" };
  }
  const existing = state.tabs.find((t) => t.id === meta.id);
  if (existing) {
    if (state.activeId !== meta.id) {
      state = { ...state, activeId: meta.id };
      persist();
      emit();
    }
    return { ok: true };
  }
  state = { tabs: [...state.tabs, meta], activeId: meta.id };
  persist();
  emit();
  return { ok: true };
}

export function closeTab(id: string): WorkspaceTab | null {
  const idx = state.tabs.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const tab = state.tabs[idx];
  if (tab.pinned) return null;
  const next = state.tabs.filter((t) => t.id !== id);
  let nextActive = state.activeId;
  if (state.activeId === id) {
    const neighbor = state.tabs[idx + 1] ?? state.tabs[idx - 1] ?? next[0];
    nextActive = neighbor?.id ?? null;
  }
  state = { tabs: next, activeId: nextActive };
  persist();
  emit();
  return nextActive ? state.tabs.find((t) => t.id === nextActive) ?? null : null;
}

export function closeOthers(id: string) {
  const keep = state.tabs.filter((t) => t.id === id || t.pinned);
  state = { tabs: keep, activeId: id };
  persist();
  emit();
}

export function closeAll() {
  state = { tabs: [DEFAULT_TAB], activeId: DEFAULT_TAB.id };
  persist();
  emit();
}

export function setActive(id: string) {
  if (!state.tabs.some((t) => t.id === id)) return;
  if (state.activeId === id) return;
  state = { ...state, activeId: id };
  persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return state;
}

export function useWorkspaceTabs() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function isKnownRoute(pathname: string): boolean {
  return resolveRouteMeta(pathname) !== null;
}
