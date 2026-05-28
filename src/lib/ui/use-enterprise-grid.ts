/**
 * D17.UI.4 — Helper universal de adoção do padrão Enterprise RM/TOTVS.
 *
 * Combina em um único hook:
 *   - paginação server-side (useServerPagination — table-bound)
 *   - preferências de coluna (useColumnPrefs)
 *   - seleção múltipla (useRowSelection)
 *   - densidade + layout persistidos em `ui.{entity}.v1`
 *   - filtros leves (busca, status, período, responsável)
 *
 * Persistência: SOMENTE chaves `ui.*` (compatível com ls-guard).
 * Zero dado operacional, zero regra de negócio, zero RPC.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useServerPagination,
  type ServerPaginationOptions,
} from "@/lib/repositories/use-server-pagination";
import { useColumnPrefs, type ColumnDef } from "@/lib/ui/column-prefs";
import { useRowSelection } from "@/lib/ui/use-row-selection";

export type GridDensity = "compact" | "normal" | "comfortable";
export type GridLayout = "grid" | "cards";

export type EnterpriseGridFilters = {
  search: string;
  status: string | null;
  periodo: { from?: string; to?: string };
  responsavel: string | null;
};

type Options<T> = {
  entity: string;
  columns: ColumnDef[];
  /** Opções pass-through para useServerPagination (table, select, filters, etc.). */
  pagination: Omit<ServerPaginationOptions, "searchValue">;
  /** Extrator de id para seleção múltipla. */
  getId: (row: T) => string;
  /** Email do usuário (namespaceia prefs de coluna). */
  userKey?: string;
  defaultPageSize?: number;
};

function uiKey(entity: string) {
  return `ui.${entity}.v1`;
}

type UIPrefs = {
  density: GridDensity;
  layout: GridLayout;
  pageSize: number;
};

function loadUI(entity: string, defaults: UIPrefs): UIPrefs {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(uiKey(entity));
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<UIPrefs>) };
  } catch {
    return defaults;
  }
}

function saveUI(entity: string, prefs: UIPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(uiKey(entity), JSON.stringify(prefs));
  } catch {
    /* noop */
  }
}

export function useEnterpriseGrid<T>(opts: Options<T>) {
  const defaults: UIPrefs = {
    density: "compact",
    layout: "grid",
    pageSize: opts.defaultPageSize ?? opts.pagination.defaultPageSize ?? 50,
  };
  const [ui, setUI] = useState<UIPrefs>(() => loadUI(opts.entity, defaults));

  useEffect(() => {
    saveUI(opts.entity, ui);
  }, [opts.entity, ui]);

  const [filters, setFiltersState] = useState<EnterpriseGridFilters>({
    search: "",
    status: null,
    periodo: {},
    responsavel: null,
  });

  const setFilters = useCallback(
    (patch: Partial<EnterpriseGridFilters>) =>
      setFiltersState((prev) => ({ ...prev, ...patch })),
    []
  );

  const pagination = useServerPagination<T>({
    ...opts.pagination,
    defaultPageSize: ui.pageSize,
    searchValue: filters.search,
  });

  const columns = useColumnPrefs(opts.entity, opts.columns, opts.userKey);

  const selection = useRowSelection<T>(pagination.rows, opts.getId);

  return useMemo(
    () => ({
      rows: pagination.rows,
      total: pagination.total,
      isLoading: pagination.isLoading,
      isFetching: pagination.isFetching,
      refetch: pagination.refetch,
      error: pagination.error,
      pagination,
      columns,
      selection,
      filters,
      setFilters,
      density: ui.density,
      setDensity: (d: GridDensity) => setUI((p) => ({ ...p, density: d })),
      layout: ui.layout,
      setLayout: (l: GridLayout) => setUI((p) => ({ ...p, layout: l })),
      pageSize: ui.pageSize,
      setPageSize: (n: number) => setUI((p) => ({ ...p, pageSize: n })),
    }),
    [pagination, columns, selection, filters, setFilters, ui]
  );
}

export type UseEnterpriseGridReturn<T> = ReturnType<typeof useEnterpriseGrid<T>>;
