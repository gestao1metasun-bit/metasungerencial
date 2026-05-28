/**
 * D17.UI.1 — Column preferences helper
 *
 * Persiste preferências de colunas (ordem + visibilidade) em LocalStorage
 * com namespacing por usuário+entidade. Permitido pelo ls-guard (prefixo
 * `ui.cols.`) — é puramente UI, NUNCA dado operacional.
 *
 * Uso:
 *   const { order, hidden, setVisible, reorder, reset } =
 *     useColumnPrefs("titulos_financeiros", DEFAULT_COLS);
 */
import { useCallback, useEffect, useState } from "react";

export type ColumnDef = {
  key: string;
  label: string;
  defaultVisible?: boolean;
  locked?: boolean;
};

type Prefs = { order: string[]; hidden: string[] };

const KEY_PREFIX = "ui.cols.";

function keyFor(user: string, entity: string) {
  return `${KEY_PREFIX}${user || "anon"}.${entity}.v1`;
}

function loadPrefs(user: string, entity: string, defaults: ColumnDef[]): Prefs {
  const fallback: Prefs = {
    order: defaults.map((c) => c.key),
    hidden: defaults.filter((c) => c.defaultVisible === false).map((c) => c.key),
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(keyFor(user, entity));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    const knownKeys = new Set(defaults.map((c) => c.key));
    const order = (parsed.order ?? []).filter((k) => knownKeys.has(k));
    // ensure any new column added later is appended at the end
    for (const c of defaults) if (!order.includes(c.key)) order.push(c.key);
    const hidden = (parsed.hidden ?? []).filter((k) => knownKeys.has(k));
    return { order, hidden };
  } catch {
    return fallback;
  }
}

function savePrefs(user: string, entity: string, prefs: Prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(user, entity), JSON.stringify(prefs));
  } catch {
    /* silencioso — UI apenas */
  }
}

export function useColumnPrefs(
  entity: string,
  defaults: ColumnDef[],
  userEmail?: string,
) {
  const user = userEmail ?? "anon";
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(user, entity, defaults));
  useEffect(() => { savePrefs(user, entity, prefs); }, [user, entity, prefs]);

  const setVisible = useCallback((key: string, visible: boolean) => {
    setPrefs((p) => {
      const hidden = new Set(p.hidden);
      if (visible) hidden.delete(key); else hidden.add(key);
      return { ...p, hidden: Array.from(hidden) };
    });
  }, []);

  const reorder = useCallback((key: string, direction: -1 | 1) => {
    setPrefs((p) => {
      const idx = p.order.indexOf(key);
      if (idx < 0) return p;
      const next = idx + direction;
      if (next < 0 || next >= p.order.length) return p;
      const order = p.order.slice();
      const lockedKeys = new Set(defaults.filter((d) => d.locked).map((d) => d.key));
      if (lockedKeys.has(order[next])) return p; // não atravessa coluna travada
      [order[idx], order[next]] = [order[next], order[idx]];
      return { ...p, order };
    });
  }, [defaults]);

  const reset = useCallback(() => {
    setPrefs({
      order: defaults.map((c) => c.key),
      hidden: defaults.filter((c) => c.defaultVisible === false).map((c) => c.key),
    });
  }, [defaults]);

  const isVisible = useCallback((key: string) => !prefs.hidden.includes(key), [prefs.hidden]);
  const visibleKeys = prefs.order.filter((k) => !prefs.hidden.includes(k));

  return { order: prefs.order, hidden: prefs.hidden, visibleKeys, isVisible, setVisible, reorder, reset };
}
