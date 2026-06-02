/**
 * D20.SUP.9 — Kanban operacional de Requisições.
 *
 * Visualização agrupada por status. NÃO permite drag-and-drop entre colunas
 * — toda transição de status passa OBRIGATORIAMENTE por RPC oficial via
 * RequisicaoDetailDialog (regra de pedra: status nunca é editável livre).
 *
 * Click no card abre o detalhe; toda mutação continua governada.
 */
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  STATUS_LABEL, STATUS_TONE,
  type RequisicaoResumoRow, type SupReqStatus,
} from "@/lib/repositories/suprimentos-requisicoes-repo";
import { AlcadaChip } from "./AlcadaChip";

const TONE_BORDER: Record<string, string> = {
  muted: "border-border",
  info: "border-blue-300",
  warning: "border-amber-300",
  success: "border-emerald-300",
  danger: "border-red-300",
  primary: "border-primary/40",
};

const TONE_HEADER: Record<string, string> = {
  muted: "bg-muted/60 text-muted-foreground",
  info: "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  warning: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  success: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  danger: "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  primary: "bg-primary/10 text-primary",
};

// Colunas oficiais — fluxo da esquerda para a direita.
const COLUNAS: SupReqStatus[] = [
  "RASCUNHO",
  "ENVIADA",
  "EM_APROVACAO",
  "APROVADA",
  "AGUARDANDO_ESTOQUE",
  "EM_SEPARACAO",
  "AGUARDANDO_COMPRA",
  "EM_COMPRA",
  "PARCIALMENTE_ATENDIDA",
  "ATENDIDA",
  "REPROVADA",
  "RETORNADA",
  "CANCELADA",
];

export function KanbanRequisicoes({
  rows,
  onOpen,
}: {
  rows: RequisicaoResumoRow[];
  onOpen: (id: string) => void;
}) {
  const grupos = useMemo(() => {
    const g: Record<string, RequisicaoResumoRow[]> = {};
    for (const s of COLUNAS) g[s] = [];
    for (const r of rows) {
      const s = (r.status as SupReqStatus) ?? "RASCUNHO";
      if (!g[s]) g[s] = [];
      g[s].push(r);
    }
    return g;
  }, [rows]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 min-w-max pb-2">
        {COLUNAS.map((status) => {
          const items = grupos[status] ?? [];
          const tone = STATUS_TONE[status];
          const totalValor = items.reduce(
            (acc, r) => acc + Number(r.valor_estimado ?? 0),
            0
          );
          return (
            <div
              key={status}
              className={`w-64 shrink-0 rounded border ${TONE_BORDER[tone]} bg-background flex flex-col`}
            >
              <div className={`px-2 py-1 rounded-t ${TONE_HEADER[tone]} text-[11.5px] font-semibold flex items-center justify-between`}>
                <span className="truncate">{STATUS_LABEL[status]}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-background/70">
                  {items.length}
                </Badge>
              </div>
              <div className="p-1.5 space-y-1.5 max-h-[68vh] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-[10.5px] text-center text-muted-foreground py-3">
                    —
                  </div>
                ) : (
                  items.map((r) => (
                    <Card
                      key={r.id}
                      className="p-1.5 text-[11px] cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors"
                      onClick={() => r.id && onOpen(r.id)}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold tabular-nums">#{r.numero}</span>
                        <Badge variant="outline" className="text-[9.5px] h-4 px-1">
                          {r.tipo}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-muted-foreground truncate">
                        Prio: {r.prioridade}
                        {r.data_necessidade && (
                          <>
                            {" · "}
                            <span className="tabular-nums">{r.data_necessidade}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-1">
                        <span className="tabular-nums font-semibold">
                          {Number(r.valor_estimado ?? 0).toLocaleString("pt-BR", {
                            style: "currency", currency: "BRL",
                          })}
                        </span>
                        {r.id && (
                          <AlcadaChip
                            requisicaoId={r.id}
                            valor={Number(r.valor_estimado ?? 0)}
                          />
                        )}
                      </div>
                      {r.criado_em && (
                        <div className="mt-0.5 text-[9.5px] text-muted-foreground">
                          {format(new Date(r.criado_em), "dd/MM HH:mm")}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
              {items.length > 0 && (
                <div className="px-2 py-1 border-t bg-muted/30 text-[10.5px] text-right tabular-nums">
                  {totalValor.toLocaleString("pt-BR", {
                    style: "currency", currency: "BRL",
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
