/**
 * D17.UI.6 — Grid Enterprise das Operações Financeiras (padrão RM/TOTVS)
 *
 * - RowActions por status (RASCUNHO / APROVADA / LIBERADA / CANCELADA / RENEGOCIADA).
 * - AnexosButton inline (entidade `operacoes_financeiras`).
 * - Drawer com Parcelas + Títulos gerados (com Estornar por título) + Timeline.
 * - ProcessosMenu contextual no header do drawer.
 * - Toda ação registra perf_log via withPerf (no repo) e error_log em falha.
 */
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  CheckCircle2, PlayCircle, Loader2, ListChecks, Undo2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  RowActions, type RowAction, type RowActionKind,
  AnexosButton, ProcessosMenu, type ProcessoItem,
} from "@/components/app/enterprise";
import {
  type OpFinTipo, type OpFinStatus, type OperacaoFinanceira, type OpFinTitulo,
  useOperacoesFinanceiras, useOpFinEventos, useOpFinParcelas, useOpFinTitulos,
  useAprovarOperacao, useLiberarOperacao, useCancelarOperacao, useEstornarOperacao,
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

/** Ações por status — padrão RM/TOTVS. */
function buildRowActions(status: OpFinStatus): RowAction[] {
  const base: RowAction[] = [{ kind: "visualizar" }];
  switch (status) {
    case "RASCUNHO":
    case "EM_APROVACAO":
      return [
        ...base,
        { kind: "editar", overflow: true },
        { kind: "aprovar", label: "Aprovar" },
        { kind: "baixar", label: "Aprovar e Liberar" },
        { kind: "cancelar" },
        { kind: "anexos" },
        { kind: "historico", overflow: true },
      ];
    case "APROVADA":
      return [
        ...base,
        { kind: "baixar", label: "Liberar (gera títulos)" },
        { kind: "cancelar" },
        { kind: "anexos" },
        { kind: "historico", overflow: true },
      ];
    case "LIBERADA":
    case "EM_PAGAMENTO":
    case "QUITADA":
      return [
        ...base,
        { kind: "estornar", label: "Estornar (na visão)" },
        { kind: "anexos" },
        { kind: "historico", overflow: true },
      ];
    case "CANCELADA":
    case "RENEGOCIADA":
    default:
      return [
        ...base,
        { kind: "anexos" },
        { kind: "historico", overflow: true },
      ];
  }
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

  const doAprovar = async (o: OperacaoFinanceira) => {
    try {
      await aprovar.mutateAsync({ id: o.id });
      toast.success(`Operação ${o.codigo ?? ""} aprovada.`);
    } catch (e) {
      toast.error(`Falha ao aprovar: ${(e as Error).message}`);
    }
  };
  const doLiberar = async (o: OperacaoFinanceira) => {
    try {
      await liberar.mutateAsync(o.id);
      toast.success(`Operação ${o.codigo ?? ""} liberada — títulos gerados.`);
    } catch (e) {
      toast.error(`Falha ao liberar: ${(e as Error).message}`);
    }
  };
  const doAprovarELiberar = async (o: OperacaoFinanceira) => {
    try {
      if (o.status === "RASCUNHO" || o.status === "EM_APROVACAO") {
        await aprovar.mutateAsync({ id: o.id });
      }
      await liberar.mutateAsync(o.id);
      toast.success(`Operação ${o.codigo ?? ""} aprovada e liberada — títulos gerados.`);
    } catch (e) {
      toast.error(`Falha no fluxo: ${(e as Error).message}`);
    }
  };
  const doCancelar = async (o: OperacaoFinanceira) => {
    const motivo = window.prompt("Motivo do cancelamento (mín. 5 chars):");
    if (!motivo || motivo.trim().length < 5) {
      toast.error("Motivo obrigatório (mín. 5 chars).");
      return;
    }
    try {
      await cancelar.mutateAsync({ id: o.id, motivo });
      toast.success("Operação cancelada.");
    } catch (e) {
      toast.error(`Falha ao cancelar: ${(e as Error).message}`);
    }
  };

  const handleRowAction = (kind: RowActionKind, o: OperacaoFinanceira) => {
    switch (kind) {
      case "visualizar":
      case "historico":
        setDetalheId(o.id); break;
      case "editar":
        toast.info("Edição inline chega em D17.UI.6.b (drawer dedicado). Por ora use Visualizar.");
        setDetalheId(o.id); break;
      case "aprovar": void doAprovar(o); break;
      case "baixar":
        if (o.status === "APROVADA") void doLiberar(o);
        else void doAprovarELiberar(o);
        break;
      case "cancelar": void doCancelar(o); break;
      case "estornar":
        setDetalheId(o.id);
        toast.info("Estornar é por título — abra a operação e clique em Estornar no título desejado.");
        break;
      case "anexos":
        // tratado pelo AnexosButton ao lado
        break;
      default: break;
    }
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
                <th className="px-3 py-2 text-center">Parc.</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right w-[280px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((o) => {
                const contraparte =
                  o.socio_nome || o.terceiro_nome || o.colaborador_nome ||
                  o.instituicao || o.banco_contrato || "—";
                const actions = buildRowActions(o.status);
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
                        {/* AnexosButton substitui kind:'anexos' (precisa do entidade_id) */}
                        <AnexosButton
                          entidade="operacoes_financeiras"
                          entidadeId={o.id}
                          titulo={`Anexos · ${o.codigo ?? o.id.slice(0,8)}`}
                          descricao="Contrato de empréstimo, comprovante, termo de aporte, autorização, recibo."
                          categoriaPadrao="financeiro"
                        />
                        <RowActions
                          rowId={o.id}
                          actions={actions.filter((a) => a.kind !== "anexos")}
                          onAction={(k) => handleRowAction(k, o)}
                        />
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
        <SheetContent side="right" className="w-[560px] sm:w-[680px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm flex items-center justify-between gap-2">
              <span>{detalhe ? `Operação ${detalhe.codigo ?? detalhe.id.slice(0,8)}` : "Detalhe"}</span>
              {detalhe && (
                <DetalheProcessos
                  op={detalhe}
                  onAprovar={() => doAprovar(detalhe)}
                  onLiberar={() => doLiberar(detalhe)}
                  onAprovarELiberar={() => doAprovarELiberar(detalhe)}
                  onCancelar={() => doCancelar(detalhe)}
                />
              )}
            </SheetTitle>
          </SheetHeader>
          {detalhe && <DetalheOperacao op={detalhe} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function DetalheProcessos({
  op, onAprovar, onLiberar, onAprovarELiberar, onCancelar,
}: {
  op: OperacaoFinanceira;
  onAprovar: () => void;
  onLiberar: () => void;
  onAprovarELiberar: () => void;
  onCancelar: () => void;
}) {
  const podeAprovar = op.status === "RASCUNHO" || op.status === "EM_APROVACAO";
  const podeLiberar = op.status === "APROVADA";
  const podeCancelar = !["QUITADA","CANCELADA","RENEGOCIADA"].includes(op.status);
  const items: ProcessoItem[] = [
    { id: "aprovar", label: "Aprovar operação", icon: CheckCircle2, tone: "success",
      disabled: !podeAprovar, hint: podeAprovar ? undefined : "Status não permite.",
      onClick: onAprovar, group: "Workflow" },
    { id: "liberar", label: "Liberar operação (gera títulos)", icon: PlayCircle, tone: "success",
      disabled: !podeLiberar, hint: podeLiberar ? undefined : "Aprovar antes.",
      onClick: onLiberar, group: "Workflow" },
    { id: "aprov-liber", label: "Aprovar e liberar", icon: PlayCircle, tone: "success",
      disabled: !podeAprovar, hint: podeAprovar ? undefined : "Status não permite.",
      onClick: onAprovarELiberar, group: "Workflow" },
    { id: "cancelar", label: "Cancelar operação", tone: "danger",
      disabled: !podeCancelar, hint: podeCancelar ? undefined : "Operação finalizada.",
      onClick: onCancelar, group: "Workflow" },
  ];
  return <ProcessosMenu items={items} label="Processos" />;
}

function DetalheOperacao({ op }: { op: OperacaoFinanceira }) {
  const { data: parcelas = [] } = useOpFinParcelas(op.id);
  const { data: eventos = [] } = useOpFinEventos(op.id);
  const { data: titulos = [] } = useOpFinTitulos(op.id);
  const estornar = useEstornarOperacao();

  const doEstornarTitulo = async (t: OpFinTitulo) => {
    const motivo = window.prompt(`Motivo do estorno do título ${t.codigo ?? t.id.slice(0,8)} (mín. 5 chars):`);
    if (!motivo || motivo.trim().length < 5) {
      toast.error("Motivo obrigatório (mín. 5 chars).");
      return;
    }
    try {
      await estornar.mutateAsync({ tituloId: t.id, motivo });
      toast.success(`Título ${t.codigo ?? ""} estornado.`);
    } catch (e) {
      toast.error(`Falha ao estornar: ${(e as Error).message}`);
    }
  };

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
          <div className="text-xs text-muted-foreground italic">Nenhuma parcela gerada.</div>
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
        <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">
          Títulos gerados ({titulos.length}) <span className="text-muted-foreground/70 normal-case">— origem_tipo = OPERACAO_FINANCEIRA</span>
        </div>
        {titulos.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">
            Nenhum título ainda. Use <strong>Liberar</strong> para gerar 1 título por parcela.
          </div>
        ) : (
          <table className="w-full text-[11.5px] border border-border/60 rounded">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left">Código</th>
                <th className="px-2 py-1 text-left">Tipo</th>
                <th className="px-2 py-1 text-left">Vencimento</th>
                <th className="px-2 py-1 text-right">Valor</th>
                <th className="px-2 py-1 text-left">Status</th>
                <th className="px-2 py-1 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {titulos.map((t) => (
                <tr key={t.id} className="border-t border-border/60">
                  <td className="px-2 py-1 font-mono text-[10.5px]">{t.codigo ?? t.id.slice(0,8)}</td>
                  <td className="px-2 py-1">{t.tipo}</td>
                  <td className="px-2 py-1">{t.vencimento ? format(new Date(t.vencimento), "dd/MM/yyyy") : "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(Number(t.valor_liquido))}</td>
                  <td className="px-2 py-1"><Badge variant="outline" className="text-[10px] font-normal">{t.status}</Badge></td>
                  <td className="px-2 py-1 text-right">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600"
                      title="Estornar título" disabled={estornar.isPending || t.status === "ESTORNADO"}
                      onClick={() => doEstornarTitulo(t)}>
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">Histórico ({eventos.length})</div>
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
