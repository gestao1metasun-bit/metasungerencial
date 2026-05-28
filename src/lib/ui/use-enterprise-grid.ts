/**
 * D17.UI.4 — Helper universal de adoção do padrão Enterprise RM/TOTVS.
 *
 * Combina em um único hook tudo que uma tela operacional precisa:
 *   - paginação server-side (useServerPagination)
 *   - preferências de coluna (useColumnPrefs)
 *   - seleção múltipla (useRowSelection)
 *   - densidade + layout persistidos em `ui.{entity}.v1`
 *   - filtros básicos com debounce (busca, status, período, responsável)
 *
 * Persistência: SOMENTE em chaves `ui.*` (compatível com ls-guard).
 * Zero dado operacional, zero regra de negócio, zero RPC.
 *
 * Uso:
 *   const grid = useEnterpriseGrid({
 *     entity: "contratos",
 *     columns: COLS,
 *     fetcher: ({ from, to, search }) => repo.listar({ from, to, search }),
 *     getId: (r) => r.id,
 *   });
 *   // grid.rows, grid.total, grid.pagination, grid.columns, grid.selection,
 *   // grid.density, grid.layout, grid.filters
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerPagination } from "@/lib/repositories/use-server-pagination";
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
  fetcher: (args: {
    from: number;
    to: number;
    search: string;
    status: string | null;
    periodo: { from?: string; to?: string };
    responsavel: string | null;
  }) => Promise<{ rows: T[]; count: number }>;
  getId: (row: T) => string;
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
    pageSize: opts.defaultPageSize ?? 50,
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

  const fetcher = useCallback(
    ({ from, to, search }: { from: number; to: number; search: string }) =>
      opts.fetcher({
        from,
        to,
        search,
        status: filters.status,
        periodo: filters.periodo,
        responsavel: filters.responsavel,
      }),
    [opts, filters.status, filters.periodo, filters.responsavel]
  );

  const pagination = useServerPagination<T>({
    queryKey: ["enterprise-grid", opts.entity, filters],
    pageSize: ui.pageSize,
    fetcher,
  });

  const columns = useColumnPrefs(
    opts.userKey ?? "anon",
    opts.entity,
    opts.columns
  );

  const selection = useRowSelection<T>(pagination.rows, opts.getId);

  return useMemo(
    () => ({
      // dados
      rows: pagination.rows,
      total: pagination.total,
      isLoading: pagination.isLoading,
      isFetching: pagination.isFetching,
      refetch: pagination.refetch,
      error: pagination.error,
      // paginação
      pagination,
      // colunas
      columns,
      // seleção
      selection,
      // filtros
      filters,
      setFilters,
      // UI prefs
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
