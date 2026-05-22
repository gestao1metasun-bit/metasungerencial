import { useHistorico, type AuditEntidade } from "@/lib/audit-store";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAuditByEntity, type AuditDbEntry } from "@/lib/audit.functions";
import { History, Database as DbIcon, HardDrive } from "lucide-react";

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
  try { return JSON.stringify(v); } catch { return String(v); }
}

type UnifiedEntry = {
  id: string;
  data: string;
  acao: string;
  campo?: string | null;
  valorAnterior?: unknown;
  valorNovo?: unknown;
  motivo?: string | null;
  usuario?: string | null;
  detalhe?: string | null;
  fonte: "db" | "local";
};

function fromDb(e: AuditDbEntry): UnifiedEntry {
  return {
    id: `db-${e.id}`,
    data: e.createdAt,
    acao: e.acao,
    campo: e.campo,
    valorAnterior: e.valorAnterior,
    valorNovo: e.valorNovo,
    motivo: e.motivo,
    usuario: e.userEmail,
    fonte: "db",
  };
}

export function HistoricoTimeline({
  entidade, entidadeId, empty = "Nenhum evento registrado.",
}: { entidade: AuditEntidade; entidadeId: string; empty?: string }) {
  const local = useHistorico(entidade, entidadeId);
  const fetchFn = useServerFn(getAuditByEntity);
  const dbQuery = useQuery({
    queryKey: ["audit", entidade, entidadeId],
    queryFn: () => fetchFn({ data: { entidade, entidadeId } }),
    staleTime: 30_000,
    retry: 1,
  });

  const dbItems = (dbQuery.data ?? []).map(fromDb);
  const localItems: UnifiedEntry[] = local.map((e) => ({
    id: `local-${e.id}`,
    data: e.data,
    acao: e.acao,
    campo: e.campo ?? null,
    valorAnterior: e.valorAnterior,
    valorNovo: e.valorNovo,
    motivo: e.motivo ?? null,
    usuario: e.usuario ?? null,
    detalhe: e.detalhe ?? null,
    fonte: "local",
  }));

  const merged = [...dbItems, ...localItems].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  );

  if (merged.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        <History className="h-4 w-4" />
        {dbQuery.isLoading ? "Carregando histórico…" : empty}
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {merged.map((e) => (
        <li key={e.id} className="rounded-md border border-border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {e.acao}
            </span>
            {e.campo && <span className="text-xs text-muted-foreground">campo: <b>{e.campo}</b></span>}
            <span
              title={e.fonte === "db" ? "Auditoria do banco" : "Histórico local"}
              className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground"
            >
              {e.fonte === "db" ? <DbIcon className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
              {fmt(e.data)}
            </span>
          </div>
          {(e.valorAnterior !== undefined || e.valorNovo !== undefined) && (
            <div className="mt-1 break-all text-xs text-muted-foreground">
              <span className="line-through">{jsonPreview(e.valorAnterior)}</span>
              {" → "}
              <b className="text-foreground">{jsonPreview(e.valorNovo)}</b>
            </div>
          )}
          {e.detalhe && <div className="mt-1 text-xs">{e.detalhe}</div>}
          {e.motivo && <div className="mt-1 text-xs"><b>Motivo:</b> {e.motivo}</div>}
          {e.usuario && <div className="mt-1 text-[11px] text-muted-foreground">por {e.usuario}</div>}
        </li>
      ))}
    </ol>
  );
}
