import { useHistorico, type AuditEntidade } from "@/lib/audit-store";
import { History } from "lucide-react";

function fmt(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function HistoricoTimeline({
  entidade, entidadeId, empty = "Nenhum evento registrado.",
}: { entidade: AuditEntidade; entidadeId: string; empty?: string }) {
  const itens = useHistorico(entidade, entidadeId);
  if (itens.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        <History className="h-4 w-4" /> {empty}
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {itens.map((e) => (
        <li key={e.id} className="rounded-md border border-border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {e.acao}
            </span>
            {e.campo && <span className="text-xs text-muted-foreground">campo: <b>{e.campo}</b></span>}
            <span className="ml-auto text-xs text-muted-foreground">{fmt(e.data)}</span>
          </div>
          {(e.valorAnterior !== undefined || e.valorNovo !== undefined) && (
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="line-through">{e.valorAnterior ?? "—"}</span>
              {" → "}
              <b className="text-foreground">{e.valorNovo ?? "—"}</b>
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
