/**
 * D16.UX — Área de Trabalho com abas dinâmicas (estilo TOTVS RM).
 *
 * Store leve baseado em useSyncExternalStore.
 * - Tabs são derivadas das rotas conhecidas em NAV_ITEMS / MACRO_MODULES.
 * - Persistência por usuário em localStorage (apenas UI/preferência).
 * - Permissão validada no `openTab` usando canAccessModule.
 * - Não altera RLS / Auth / Supabase / regras de negócio.
 *
 * D16.UX.2 (Abas Dinâmicas Enterprise):
 * - closeToRight / closeToLeft / togglePin
 * - Pilha de abas fechadas por usuário (memória + LS, máx 20)
 * - reopenLast com revalidação de permissão
 * - Scroll/preferência por aba (memória + LS)
 */
import { useSyncExternalStore } from "react";
import { NAV_ITEMS, MACRO_MODULES } from "@/lib/nav-structure";
import type { Identidade } from "@/lib/identidade";
import { canAccessModule } from "@/lib/identidade";

export type WorkspaceTab = {
  id: string;          // = pathname (uma aba por rota)
  to: string;          // pathname para navegar
  label: string;
  iconKey?: string;
  accessKey: string;
  pinned?: boolean;    // Dashboard pinada não fecha; usuário pode fixar outras
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
const LS_CLOSED_PREFIX = "ms.ui.workspace.closed.";
const LS_SCROLL_PREFIX = "ms.ui.workspace.scroll.";
const MAX_CLOSED = 20;

function lsKey(userKey: string) {
  return `${LS_PREFIX}${userKey}.${LS_VERSION}`;
}
function lsClosedKey(userKey: string) {
  return `${LS_CLOSED_PREFIX}${userKey}.${LS_VERSION}`;
}
function lsScrollKey(userKey: string) {
  return `${LS_SCROLL_PREFIX}${userKey}.${LS_VERSION}`;
}

let state: State = { tabs: [DEFAULT_TAB], activeId: DEFAULT_TAB.id };
let currentUserKey: string = "anon";
let closedStack: WorkspaceTab[] = [];
let scrollMap: Record<string, number> = {};
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
function persistClosed() {
  try {
    localStorage.setItem(lsClosedKey(currentUserKey), JSON.stringify(closedStack));
  } catch {
    /* ignora */
  }
}
function persistScroll() {
  try {
    localStorage.setItem(lsScrollKey(currentUserKey), JSON.stringify(scrollMap));
  } catch {
    /* ignora */
  }
}

function resolveRouteMeta(pathname: string): WorkspaceTab | null {
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

function pushClosed(tab: WorkspaceTab) {
  // Dashboard pinada nunca entra na pilha
  if (tab.pinned && tab.id === DEFAULT_TAB.id) return;
  // dedupe
  closedStack = [tab, ...closedStack.filter((t) => t.id !== tab.id)].slice(0, MAX_CLOSED);
  persistClosed();
}

// ── API pública ────────────────────────────────────────────────────────────

export function loadForUser(identidade: Identidade) {
  const key = identidade.email || identidade.role || "anon";
  if (key === currentUserKey) return;
  currentUserKey = key;

  // Restaura abas
  let restored: State | null = null;
  try {
    const raw = localStorage.getItem(lsKey(key));
    if (raw) restored = JSON.parse(raw);
  } catch {
    restored = null;
  }
  if (restored && Array.isArray(restored.tabs) && restored.tabs.length > 0) {
    const allowed = restored.tabs.filter((t) =>
      canAccessModule(identidade.role, t.accessKey),
    );
    const tabs = allowed.length > 0 ? allowed : [DEFAULT_TAB];
    if (!tabs.some((t) => t.id === DEFAULT_TAB.id)) tabs.unshift(DEFAULT_TAB);
    // Dashboard sempre pinada
    for (const t of tabs) if (t.id === DEFAULT_TAB.id) t.pinned = true;
    const activeId =
      tabs.find((t) => t.id === restored?.activeId)?.id ?? tabs[0].id;
    state = { tabs, activeId };
  } else {
    state = { tabs: [DEFAULT_TAB], activeId: DEFAULT_TAB.id };
  }
  persist();

  // Restaura pilha de fechadas
  try {
    const raw = localStorage.getItem(lsClosedKey(key));
    closedStack = raw ? (JSON.parse(raw) as WorkspaceTab[]) : [];
    if (!Array.isArray(closedStack)) closedStack = [];
  } catch {
    closedStack = [];
  }

  // Restaura scroll
  try {
    const raw = localStorage.getItem(lsScrollKey(key));
    scrollMap = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    if (!scrollMap || typeof scrollMap !== "object") scrollMap = {};
  } catch {
    scrollMap = {};
  }

  emit();
}

export function openTabForRoute(
  pathname: string,
  identidade: Identidade,
): { ok: true } | { ok: false; reason: "unknown-route" | "forbidden" } {
  const meta = resolveRouteMeta(pathname);
  if (!meta) {
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
  // preserva pinned se já existir
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
  pushClosed(tab);
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
  for (const t of state.tabs) {
    if (t.id !== id && !t.pinned) pushClosed(t);
  }
  const keep = state.tabs.filter((t) => t.id === id || t.pinned);
  state = { tabs: keep, activeId: id };
  persist();
  emit();
}

export function closeToRight(id: string) {
  const idx = state.tabs.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const removed: WorkspaceTab[] = [];
  const next = state.tabs.filter((t, i) => {
    if (i > idx && !t.pinned) {
      removed.push(t);
      return false;
    }
    return true;
  });
  removed.forEach(pushClosed);
  const activeStillThere = next.some((t) => t.id === state.activeId);
  state = { tabs: next, activeId: activeStillThere ? state.activeId : id };
  persist();
  emit();
}

export function closeToLeft(id: string) {
  const idx = state.tabs.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const removed: WorkspaceTab[] = [];
  const next = state.tabs.filter((t, i) => {
    if (i < idx && !t.pinned) {
      removed.push(t);
      return false;
    }
    return true;
  });
  removed.forEach(pushClosed);
  const activeStillThere = next.some((t) => t.id === state.activeId);
  state = { tabs: next, activeId: activeStillThere ? state.activeId : id };
  persist();
  emit();
}

export function closeAll() {
  for (const t of state.tabs) if (!t.pinned) pushClosed(t);
  state = { tabs: [DEFAULT_TAB], activeId: DEFAULT_TAB.id };
  persist();
  emit();
}

export function togglePin(id: string) {
  if (id === DEFAULT_TAB.id) return; // Dashboard sempre pinada
  const tabs = state.tabs.map((t) =>
    t.id === id ? { ...t, pinned: !t.pinned } : t,
  );
  state = { ...state, tabs };
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

/** Vai para a próxima aba (com wrap). */
export function activateNext(direction: 1 | -1 = 1) {
  if (state.tabs.length < 2) return null;
  const idx = state.tabs.findIndex((t) => t.id === state.activeId);
  const next =
    state.tabs[(idx + direction + state.tabs.length) % state.tabs.length];
  setActive(next.id);
  return next;
}

/** Ativa aba pelo índice (1-based). Retorna a aba ou null. */
export function activateByIndex(oneBased: number): WorkspaceTab | null {
  const tab = state.tabs[oneBased - 1];
  if (!tab) return null;
  setActive(tab.id);
  return tab;
}

/** Reabre última aba fechada, revalidando permissão. */
export function reopenLast(
  identidade: Identidade,
):
  | { ok: true; tab: WorkspaceTab }
  | { ok: false; reason: "empty" | "forbidden" } {
  const last = closedStack[0];
  if (!last) return { ok: false, reason: "empty" };
  closedStack = closedStack.slice(1);
  persistClosed();
  if (!canAccessModule(identidade.role, last.accessKey)) {
    emit();
    return { ok: false, reason: "forbidden" };
  }
  // Se já está aberta, só ativa
  const existing = state.tabs.find((t) => t.id === last.id);
  if (existing) {
    state = { ...state, activeId: existing.id };
  } else {
    state = { tabs: [...state.tabs, last], activeId: last.id };
  }
  persist();
  emit();
  return { ok: true, tab: last };
}

export function getClosedStack(): readonly WorkspaceTab[] {
  return closedStack;
}

export function getActiveTab(): WorkspaceTab | null {
  return state.tabs.find((t) => t.id === state.activeId) ?? null;
}

// ── Scroll por aba ─────────────────────────────────────────────────────────

export function setTabScroll(id: string, y: number) {
  scrollMap[id] = y;
  persistScroll();
}
export function getTabScroll(id: string): number {
  return scrollMap[id] ?? 0;
}

// ── Hook ───────────────────────────────────────────────────────────────────

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
