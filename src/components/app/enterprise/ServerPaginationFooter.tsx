/**
 * D14.5 — Rodapé padrão para grids server-side.
 * Mostra total real (count exact), paginação e seletor de tamanho.
 */
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';

interface ServerPaginationFooterProps {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isFetching?: boolean;
  pageSizes?: number[];
}

export function ServerPaginationFooter({
  page,
  pageSize,
  total,
  pageCount,
  onPageChange,
  onPageSizeChange,
  isFetching,
  pageSizes = [25, 50, 100, 200],
}: ServerPaginationFooterProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          {from.toLocaleString('pt-BR')}–{to.toLocaleString('pt-BR')} de{' '}
          <strong className="text-foreground">{total.toLocaleString('pt-BR')}</strong>
        </span>
        {isFetching && <Loader2 className="h-3 w-3 animate-spin" aria-label="Carregando" />}
      </div>

      <div className="flex items-center gap-2">
        <span>Linhas:</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-6 w-16 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((s) => (
              <SelectItem key={s} value={String(s)} className="text-[11px]">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-2 flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="Primeira página"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-1 tabular-nums">
            {page} / {pageCount}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onPageChange(pageCount)}
            disabled={page >= pageCount}
            aria-label="Última página"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
