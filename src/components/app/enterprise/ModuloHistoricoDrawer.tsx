/**
 * D17.UI.4c — ModuloHistoricoDrawer
 *
 * Drawer universal de histórico, padrão RM/TOTVS. Substitui o
 * comportamento heterogêneo (toast, troca de aba, dialog próprio) por uma
 * experiência única em todos os módulos já convertidos para o padrão
 * Enterprise.
 *
 * Dois modos:
 *  • Per-record (entidade + entidadeId) → reaproveita HistoricoTimeline.
 *  • Per-module (modulos[]) → lista atividade recente da tabela audit_log.
 *
 * Não altera banco, RLS, RPCs nem o pipeline de auditoria — somente
 * consome `getAuditByModulo` (read-only).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HistoricoTimeline } from "@/components/app/HistoricoTimeline";
import { getAuditByModulo, type AuditDbEntry } from "@/lib/audit.functions";
import type { AuditEntidade } from "@/lib/audit-store";
import { History, Database as DbIcon, User } from "lucide-react";

export type ModuloHistoricoDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rótulo do módulo no cabeçalho do drawer. */
  titulo: string;
  /** Descrição secundária opcional. */
  descricao?: string;
  /** Modo per-record (opcional). Se preenchidos, prevalecem sobre o modo módulo. */
  entidade?: AuditEntidade;
  entidadeId?: string | null;
  /** Modo per-module: lista de módulos do audit_log (ex.: ["comercial"]). */
  modulos?: string[];
  /** Filtro opcional adicional por entidade dentro do(s) módulo(s). */
  entidades?: string[];
  /** Quantidade máxima de eventos no modo módulo (default 80, máx 200). */
  limit?: number;
};

function fmt(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function jsonPreview(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 80) + "…" : s;
  } catch { return String(v); }
}

function ModuloTimeline({
  modulos, entidades, limit,
}: { modulos: string[]; entidades?: string[]; limit?: number }) {
  const fetchFn = useServerFn(getAuditByModulo);
  const q = useQuery({
    queryKey: ["audit-modulo", modulos.join(","), (entidades ?? []).join(","), limit ?? 80],
    queryFn: () => fetchFn({ data: { modulos, entidades, limit } }),
    staleTime: 30_000,
    retry: 1,
  });

  const rows: AuditDbEntry[] = useMemo(() => q.data ?? [], [q.data]);

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        <History className="h-4 w-4 animate-pulse" />
        Carregando atividade recente…
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-4 text-sm text-destructive">
        Falha ao carregar histórico: {(q.error as Error)?.message ?? "erro desconhecido"}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        <History className="h-4 w-4" />
        Sem eventos recentes neste módulo.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {rows.map((e) => (
        <li key={e.id} className="rounded-md border border-border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {e.acao}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {e.entidade}
            </span>
            {e.campo && (
              <span className="text-xs text-muted-foreground">
                campo: <b>{e.campo}</b>
              </span>
            )}
            <span
              title="Auditoria do banco"
              className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground"
            >
              <DbIcon className="h-3 w-3" />
              {fmt(e.createdAt)}
            </span>
          </div>
          {(e.valorAnterior !== undefined || e.valorNovo !== undefined) && (
            (e.valorAnterior !== null || e.valorNovo !== null) && (
              <div className="mt-1 break-all text-xs text-muted-foreground">
                <span className="line-through">{jsonPreview(e.valorAnterior)}</span>
                {" → "}
                <b className="text-foreground">{jsonPreview(e.valorNovo)}</b>
              </div>
            )
          )}
          {e.motivo && (
            <div className="mt-1 text-xs">
              <b>Motivo:</b> {e.motivo}
            </div>
          )}
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <User className="h-3 w-3" />
            {e.userEmail ?? "—"}
            <span className="ml-2 font-mono">#{e.entidadeId.slice(0, 8)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ModuloHistoricoDrawer({
  open, onOpenChange,
  titulo, descricao,
  entidade, entidadeId,
  modulos, entidades, limit,
}: ModuloHistoricoDrawerProps) {
  const isRecord = !!(entidade && entidadeId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border bg-muted/40 px-4 py-3">
          <SheetTitle className="text-[13px] font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Histórico
            <span className="text-[11px] font-mono font-normal text-muted-foreground">
              · {titulo}
            </span>
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            {descricao ??
              (isRecord
                ? "Eventos auditados do registro selecionado."
                : "Atividade recente do módulo (banco de auditoria oficial).")}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4 py-3">
          {isRecord ? (
            <HistoricoTimeline entidade={entidade!} entidadeId={entidadeId!} />
          ) : modulos && modulos.length > 0 ? (
            <ModuloTimeline modulos={modulos} entidades={entidades} limit={limit} />
          ) : (
            <div className="text-sm text-muted-foreground">
              Selecione um registro ou informe o módulo.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
