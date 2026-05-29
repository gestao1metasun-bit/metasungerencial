/**
 * D17.UI Fase 5b — Grid Enterprise das Operações Financeiras
 */
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  CheckCircle2, PlayCircle, XCircle, Eye, History as HistoryIcon,
  Loader2, ListChecks,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  type OpFinTipo, type OpFinStatus, type OperacaoFinanceira,
  useOperacoesFinanceiras, useOpFinEventos, useOpFinParcelas,
  useAprovarOperacao, useLiberarOperacao, useCancelarOperacao,
} from "@/lib/repositories/op-financeiras-repo";

const STATUS_VARIANT: Record<OpFinStatus, string> = {
  RASCUNHO:     "bg-slate-100 text-slate-700",
  EM_APROVACAO: "bg-amber-100 text-amber-800",
  APROVADA:     "bg-blue-100 text-blue-800",
  LIBERADA:     "bg-emerald-100 text-emerald-800",
  EM_PAGAMENTO: "bg-indigo-100 text-indigo-800",
  QUITADA:      "bg-emerald-200 text-emerald-900",
  RENEGOCIADA:  "bg-violet-100 text-violet-800",
  CANCELADA:    "bg-rose-100 text-rose-800",
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  tipos?: OpFinTipo[];
  apenasParceladas?: boolean;
  search: string;
  emptyHint: string;
}

export function OperacoesFinanceirasGrid({ tipos, apenasParceladas, search, emptyHint }: Props) {
  const { data: linhas = [], isLoading, isFetching } = useOperacoesFinanceiras({
    tipos, apenasParceladas, search,
  });
  const aprovar = useAprovarOperacao();
  const liberar = useLiberarOperacao();
  const cancelar = useCancelarOperacao();

  const [detalheId, setDetalheId] = useState<string | null>(null);
  const detalhe = useMemo(() => linhas.find((l) => l.id === detalheId) ?? null, [linhas, detalheId]);

  const handleAprovar = (o: OperacaoFinanceira) => {
    aprovar.mutate({ id: o.id }, {
      onSuccess: () => toast.success(`Operação ${o.codigo ?? o.id.slice(0,8)} aprovada.`),
      onError: (e) => toast.error(`Falha ao aprovar: ${(e as Error).message}`),
    });
  };
  const handleLiberar = (o: OperacaoFinanceira) => {
    liberar.mutate(o.id, {
      onSuccess: () => toast.success(`Operação ${o.codigo ?? ""} liberada — títulos gerados.`),
      onError: (e) => toast.error(`Falha ao liberar: ${(e as Error).message}`),
    });
  };
  const handleCancelar = (o: OperacaoFinanceira) => {
    const motivo = window.prompt("Motivo do cancelamento (mín. 5 chars):");
    if (!motivo || motivo.trim().length < 5) return;
    cancelar.mutate({ id: o.id, motivo }, {
      onSuccess: () => toast.success("Operação cancelada."),
      onError: (e) => toast.error(`Falha ao cancelar: ${(e as Error).message}`),
    });
  };

  if (isLoading) {
    return (
      <Card className="p-10 text-center text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Carregando operações…
      </Card>
    );
  }

  if (linhas.length === 0) {
    return (
      <Card className="p-10 text-center">
        <ListChecks className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <div className="text-sm font-medium">Nenhuma operação encontrada</div>
        <p className="text-xs text-muted-foreground mt-1">{emptyHint}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Contraparte</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-center">Parcelas</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((o) => {
                const contraparte =
                  o.socio_nome || o.terceiro_nome || o.colaborador_nome ||
                  o.instituicao || o.banco_contrato || "—";
                return (
                  <tr key={o.id} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-mono text-[11.5px]">{o.codigo ?? o.id.slice(0,8)}</td>
                    <td className="px-3 py-1.5">{format(new Date(o.data_operacao), "dd/MM/yyyy")}</td>
                    <td className="px-3 py-1.5 text-[11.5px]">{o.tipo.replace(/_/g, " ")}</td>
                    <td className="px-3 py-1.5 truncate max-w-[200px]" title={contraparte}>{contraparte}</td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">{fmtBRL(o.valor_total)}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums">{o.qtd_parcelas}</td>
                    <td className="px-3 py-1.5">
                      <Badge className={`${STATUS_VARIANT[o.status]} font-normal`}>{o.status}</Badge>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600"
                          title="Visualizar" onClick={() => setDetalheId(o.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {o.status === "EM_APROVACAO" && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600"
                            title="Aprovar" onClick={() => handleAprovar(o)} disabled={aprovar.isPending}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {o.status === "APROVADA" && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-700"
                            title="Liberar (gera títulos)" onClick={() => handleLiberar(o)} disabled={liberar.isPending}>
                            <PlayCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {!["QUITADA","CANCELADA","RENEGOCIADA"].includes(o.status) && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600"
                            title="Cancelar" onClick={() => handleCancelar(o)} disabled={cancelar.isPending}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-600"
                          title="Histórico / Timeline" onClick={() => setDetalheId(o.id)}>
                          <HistoryIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isFetching && (
          <div className="px-3 py-1 text-[11px] text-muted-foreground border-t border-border/60">
            Atualizando…
          </div>
        )}
      </Card>

      <Sheet open={!!detalheId} onOpenChange={(o) => !o && setDetalheId(null)}>
        <SheetContent side="right" className="w-[480px] sm:w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm">
              {detalhe ? `Operação ${detalhe.codigo ?? detalhe.id.slice(0,8)}` : "Detalhe"}
            </SheetTitle>
          </SheetHeader>
          {detalhe && <DetalheOperacao op={detalhe} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function DetalheOperacao({ op }: { op: OperacaoFinanceira }) {
  const { data: parcelas = [] } = useOpFinParcelas(op.id);
  const { data: eventos = [] } = useOpFinEventos(op.id);
  return (
    <div className="mt-4 space-y-4 text-[12.5px]">
      <section className="rounded border border-border/70 p-3 space-y-1.5">
        <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{op.tipo.replace(/_/g, " ")}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
          <Badge className={`${STATUS_VARIANT[op.status]} font-normal`}>{op.status}</Badge></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Natureza</span><span>{op.natureza_caixa}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-medium">{fmtBRL(op.valor_total)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span>{format(new Date(op.data_operacao), "dd/MM/yyyy")}</span></div>
        {op.finalidade && <div className="pt-1 text-muted-foreground">Finalidade: <span className="text-foreground">{op.finalidade}</span></div>}
      </section>

      <section>
        <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">Parcelas ({parcelas.length})</div>
        {parcelas.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">Nenhuma parcela gerada (use Liberar).</div>
        ) : (
          <table className="w-full text-[11.5px] border border-border/60 rounded">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left">#</th>
                <th className="px-2 py-1 text-left">Vencimento</th>
                <th className="px-2 py-1 text-left">Competência</th>
                <th className="px-2 py-1 text-right">Valor</th>
                <th className="px-2 py-1 text-left">Observação</th>
                <th className="px-2 py-1 text-left">Título</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-2 py-1">{p.numero}</td>
                  <td className="px-2 py-1">{format(new Date(p.vencimento), "dd/MM/yyyy")}</td>
                  <td className="px-2 py-1">{p.competencia ? format(new Date(p.competencia), "MM/yyyy") : "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(p.valor)}</td>
                  <td className="px-2 py-1 text-muted-foreground">{p.observacao || "—"}</td>
                  <td className="px-2 py-1 font-mono text-[10.5px]">{p.titulo_id ? p.titulo_id.slice(0,8) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">Timeline ({eventos.length})</div>
        {eventos.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">Sem eventos.</div>
        ) : (
          <ol className="relative border-l-2 border-primary/20 pl-3 space-y-2">
            {eventos.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[8px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <div className="rounded border border-border/60 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11.5px]">{e.evento}</span>
                    <span className="text-[10.5px] text-muted-foreground">
                      {format(new Date(e.criado_em), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  {e.motivo && <div className="text-[11px] text-muted-foreground mt-0.5">{e.motivo}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
