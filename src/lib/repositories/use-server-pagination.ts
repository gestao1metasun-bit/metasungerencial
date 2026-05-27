/**
 * D14.5 — Hook universal de paginação server-side para grids enterprise.
 *
 * Centraliza page/pageSize/orderBy/filters/search/count usando PostgREST range
 * (offset/limit) + count: 'exact' para totalizador correto. Debounce nativo
 * sobre busca textual evita re-query a cada tecla. Cache via TanStack Query
 * com keepPreviousData para troca de página suave.
 *
 * USO:
 *
 *   const { rows, total, page, setPage, pageSize, setPageSize, isLoading } =
 *     useServerPagination<TituloRow>({
 *       table: 'titulos_financeiros',
 *       select: 'id, codigo, cliente_id, valor, saldo, status, vencimento',
 *       defaultPageSize: 50,
 *       defaultOrder: { column: 'created_at', ascending: false },
 *       filters: { status: 'PENDENTE' },
 *       searchColumn: 'codigo',
 *       searchValue: search,
 *       softDeleteColumn: 'deleted_at',
 *     });
 *
 * IMPORTANTE:
 *   - Nunca usar .select('*'); sempre listar colunas.
 *   - Sempre passar softDeleteColumn quando a tabela tem soft delete.
 *   - filters aceita igualdade direta, ou tuplas [op, value] tipo ['gte', '2026-01-01'].
 *   - searchValue é debounced em 250ms automaticamente.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
type FilterValue = string | number | boolean | null | string[] | number[];
type FilterEntry = FilterValue | [FilterOp, FilterValue];

export interface ServerPaginationOptions {
  /** Nome da tabela ou view oficial. */
  table: string;
  /** Lista explícita de colunas. Nunca '*'. */
  select: string;
  /** Página inicial (1-based). */
  defaultPage?: number;
  /** Tamanho de página padrão (default 50). */
  defaultPageSize?: number;
  /** Ordenação default. */
  defaultOrder?: { column: string; ascending?: boolean };
  /** Igualdade direta { coluna: valor } ou tupla [op, valor]. */
  filters?: Record<string, FilterEntry | undefined>;
  /** Coluna alvo da busca textual ilike. */
  searchColumn?: string;
  /** Texto digitado (será debounced). */
  searchValue?: string;
  /** Coluna de soft delete; quando definida, IS NULL é aplicado. */
  softDeleteColumn?: string;
  /** Desabilita a query até que uma condição seja verdadeira (ex: aguardar id). */
  enabled?: boolean;
  /** Chave extra para isolar caches diferentes (ex: tab/visão atual). */
  scope?: string;
  /** Cap defensivo (PostgREST padrão 1000). */
  maxPageSize?: number;
}

export interface ServerPaginationResult<TRow> {
  rows: TRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  order: { column: string; ascending: boolean };
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setOrder: (order: { column: string; ascending: boolean }) => void;
  refetch: () => void;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
}

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useServerPagination<TRow = Record<string, unknown>>(
  opts: ServerPaginationOptions,
): ServerPaginationResult<TRow> {
  const {
    table,
    select,
    defaultPage = 1,
    defaultPageSize = 50,
    defaultOrder = { column: 'created_at', ascending: false },
    filters,
    searchColumn,
    searchValue,
    softDeleteColumn,
    enabled = true,
    scope,
    maxPageSize = 200,
  } = opts;

  const [page, setPage] = useState(defaultPage);
  const [pageSize, setPageSize] = useState(Math.min(defaultPageSize, maxPageSize));
  const [order, setOrder] = useState({
    column: defaultOrder.column,
    ascending: defaultOrder.ascending ?? false,
  });

  const debouncedSearch = useDebounced(searchValue ?? '', 250);

  // Normaliza filtros para chave estável
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  const queryKey = useMemo(
    () => [
      'server-pagination',
      table,
      scope ?? null,
      page,
      pageSize,
      order.column,
      order.ascending,
      filterKey,
      searchColumn ?? null,
      debouncedSearch,
      softDeleteColumn ?? null,
    ],
    [table, scope, page, pageSize, order, filterKey, searchColumn, debouncedSearch, softDeleteColumn],
  );

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey,
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select(select, { count: 'exact' })
        .range(from, to)
        .order(order.column, { ascending: order.ascending, nullsFirst: false });

      if (softDeleteColumn) q = q.is(softDeleteColumn, null);

      if (filters) {
        for (const [col, entry] of Object.entries(filters)) {
          if (entry === undefined || entry === null || entry === '') continue;
          if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string') {
            const [op, value] = entry as [FilterOp, FilterValue];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            q = (q as any)[op](col, value);
          } else if (Array.isArray(entry)) {
            q = q.in(col, entry as FilterValue[]);
          } else {
            q = q.eq(col, entry as string | number | boolean);
          }
        }
      }

      if (searchColumn && debouncedSearch && debouncedSearch.trim().length > 0) {
        q = q.ilike(searchColumn, `%${debouncedSearch.trim()}%`);
      }

      const { data: rows, error: err, count } = await q;
      if (err) throw err;
      return { rows: (rows ?? []) as TRow[], total: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount,
    order,
    setPage: (p) => setPage(Math.max(1, Math.min(p, pageCount))),
    setPageSize: (s) => {
      setPageSize(Math.min(Math.max(1, s), maxPageSize));
      setPage(1);
    },
    setOrder,
    refetch,
    isLoading,
    isFetching,
    error,
  };
}
