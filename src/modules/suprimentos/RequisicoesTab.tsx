/**
 * D20.SUP.2.UI — Tela operacional de Requisições de Suprimentos.
 *
 * Padrão Enterprise RM/TOTVS (D17.UI):
 *   - EnterpriseRecordToolbar (Novo / Atualizar / Exportar / Filtros / Colunas)
 *   - Busca por número
 *   - Filtros por tipo e status
 *   - Tabela densa + RowActions (Visualizar / Histórico)
 *
 * Toda ação que muta dados passa pelo RequisicaoDetailDialog, que chama
 * exclusivamente as RPCs oficiais (rpc_sup_requisicao_*).
 */
import { useMemo, useState } from "react";
import {
  EnterpriseRecordToolbar, RowActions,
} from "@/components/app/enterprise";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useRequisicoes, STATUS_LABEL, STATUS_TONE, STATUS_OPTIONS,
  type SupReqStatus, type SupReqTipo, type RequisicaoResumoRow,
} from "@/lib/repositories/suprimentos-requisicoes-repo";
import { NovaRequisicaoDialog } from "./NovaRequisicaoDialog";
import { RequisicaoDetailDialog } from "./RequisicaoDetailDialog";

const TONE_CLASS: Record<string, string> = {
  muted: "bg-muted text-muted-foreground border-border",
  info: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
  warning: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
  success: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
  danger: "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300",
  primary: "bg-primary/10 text-primary border-primary/30",
};

function StatusBadge({ status }: { status: SupReqStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <Badge variant="outline" className={`text-[10.5px] ${TONE_CLASS[tone]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function exportarCsv(rows: RequisicaoResumoRow[]) {
  const head = [
    "numero", "tipo", "status", "prioridade", "data_necessidade",
    "valor_estimado", "valor_aprovado", "qtd_itens", "criado_em",
  ];
  const linhas = rows.map((r) => [
    r.numero, r.tipo, r.status, r.prioridade, r.data_necessidade ?? "",
    Number(r.valor_estimado ?? 0).toFixed(2),
    r.valor_aprovado != null ? Number(r.valor_aprovado).toFixed(2) : "",
    r.qtd_itens ?? 0,
    r.criado_em ? format(new Date(r.criado_em), "yyyy-MM-dd HH:mm") : "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [head.join(","), ...linhas].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `requisicoes-suprimentos-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export function RequisicoesTab() {
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<"TODOS" | SupReqTipo>("TODOS");
  const [status, setStatus] = useState<"TODOS" | SupReqStatus>("TODOS");
  const [novoOpen, setNovoOpen] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const { data: rows = [], isLoading, isFetching, refetch } = useRequisicoes({
    search,
    tipo: tipo === "TODOS" ? null : tipo,
    status: status === "TODOS" ? null : status,
  });

  const totalEstimado = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.valor_estimado ?? 0), 0),
    [rows]
  );

  return (
    <div className="space-y-2">
      <EnterpriseRecordToolbar
        entityType="compras"
        selectedIds={[]}
        availableActions={["novo", "atualizar", "exportar", "filtroRapido", "colunas"]}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por número…"
        onAction={(a) => {
          if (a === "novo") setNovoOpen(true);
          else if (a === "atualizar") { refetch(); toast.success("Lista atualizada."); }
          else if (a === "exportar") exportarCsv(rows);
          else toast.info("Ação disponível em breve.");
        }}
        extraRight={
          <div className="flex items-center gap-1.5">
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger className="h-7 w-32 text-[11.5px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os tipos</SelectItem>
                <SelectItem value="MATERIAL">Material</SelectItem>
                <SelectItem value="SERVICO">Serviço</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-7 w-44 text-[11.5px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="border-b">
                <th className="text-left px-2 py-1.5 font-semibold">Nº</th>
                <th className="text-left px-2 py-1.5 font-semibold">Tipo</th>
                <th className="text-left px-2 py-1.5 font-semibold">Status</th>
                <th className="text-left px-2 py-1.5 font-semibold">Prioridade</th>
                <th className="text-left px-2 py-1.5 font-semibold">Data necessária</th>
                <th className="text-right px-2 py-1.5 font-semibold">Itens</th>
                <th className="text-right px-2 py-1.5 font-semibold">Valor estimado</th>
                <th className="text-right px-2 py-1.5 font-semibold">Valor aprovado</th>
                <th className="text-left px-2 py-1.5 font-semibold">Criado em</th>
                <th className="text-right px-2 py-1.5 font-semibold w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-2 py-6 text-center text-muted-foreground">Carregando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="px-2 py-6 text-center text-muted-foreground">
                  Nenhuma requisição encontrada.
                </td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30 cursor-pointer"
                  onClick={() => r.id && setDetalheId(r.id)}>
                  <td className="px-2 py-1 tabular-nums font-semibold">#{r.numero}</td>
                  <td className="px-2 py-1">{r.tipo}</td>
                  <td className="px-2 py-1">{r.status && <StatusBadge status={r.status as SupReqStatus} />}</td>
                  <td className="px-2 py-1">{r.prioridade}</td>
                  <td className="px-2 py-1 tabular-nums">{r.data_necessidade ?? "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{r.qtd_itens ?? 0}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {Number(r.valor_estimado ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {r.valor_aprovado != null
                      ? Number(r.valor_aprovado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                      : "—"}
                  </td>
                  <td className="px-2 py-1 tabular-nums">
                    {r.criado_em ? format(new Date(r.criado_em), "dd/MM/yyyy HH:mm") : "—"}
                  </td>
                  <td className="px-2 py-1 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      actions={[
                        { kind: "visualizar", onClick: () => r.id && setDetalheId(r.id) },
                        { kind: "historico", onClick: () => r.id && setDetalheId(r.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-muted/30 text-[11px]">
                <tr>
                  <td colSpan={6} className="px-2 py-1 text-muted-foreground">
                    {rows.length} requisiç{rows.length === 1 ? "ão" : "ões"} {isFetching && " · atualizando…"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums font-semibold">
                    R$ {totalEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <NovaRequisicaoDialog open={novoOpen} onOpenChange={setNovoOpen}
        onCreated={(id) => setDetalheId(id)} />
      <RequisicaoDetailDialog id={detalheId} open={!!detalheId}
        onOpenChange={(v) => { if (!v) setDetalheId(null); }} />
    </div>
  );
}
