/**
 * D20.SUP.4 — Detalhe de Pedido de Compra.
 * Permite aprovar, enviar ao fornecedor, cancelar e criar recebimento.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  usePedidoDetalhe, useAprovarPedido, useEnviarPedido, useCancelarPedido,
  useCriarRecebimento, useConfirmarRecebimento,
  PED_LABEL, type SupPedStatus,
} from "@/lib/repositories/suprimentos-compras-repo";
import {
  usePrepararPedidoFinanceiro, useBloquearPedidoFinanceiro, useDesbloquearPedidoFinanceiro,
  useGerarTituloAP,
} from "@/lib/repositories/suprimentos-alcadas-repo";
import { useNavigate } from "@tanstack/react-router";

type Props = { id: string | null; onClose: () => void };
const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s: string) => new Date(s).toLocaleString("pt-BR");

export function PedidoDetailDialog({ id, onClose }: Props) {
  const { data, isLoading, refetch } = usePedidoDetalhe(id);
  const ped = data?.cabecalho as Record<string, unknown> | null | undefined;
  const itens = (data?.itens ?? []) as Array<Record<string, unknown>>;
  const eventos = (data?.eventos ?? []) as Array<Record<string, unknown>>;
  const status = ped?.status as SupPedStatus | undefined;
  const aprovar = useAprovarPedido();
  const enviar = useEnviarPedido();
  const cancelar = useCancelarPedido();
  const criarRec = useCriarRecebimento();
  const confirmarRec = useConfirmarRecebimento();
  const prepararFin = usePrepararPedidoFinanceiro();
  const bloquearFin = useBloquearPedidoFinanceiro();
  const desbloquearFin = useDesbloquearPedidoFinanceiro();
  const gerarTituloAp = useGerarTituloAP();
  const navigate = useNavigate();
  const tituloApId = (ped?.titulo_ap_id as string | null) ?? null;

  const [docNF, setDocNF] = useState("");
  const [qtdsRec, setQtdsRec] = useState<Record<string, number>>({});

  const statusFinanceiro = (ped?.status_financeiro as string) ?? "NAO_GERADO";
  const [finCond, setFinCond] = useState("");
  const [finData, setFinData] = useState("");
  const [finDoc, setFinDoc] = useState("");
  const [finValor, setFinValor] = useState("");
  const [finObs, setFinObs] = useState("");

  async function onAprovar() { if (!id) return; try { await aprovar.mutateAsync({ p_id: id }); toast.success("Pedido aprovado"); } catch (e) { toast.error((e as Error).message); } }
  async function onEnviar() { if (!id) return; try { await enviar.mutateAsync({ p_id: id }); toast.success("Pedido enviado ao fornecedor"); } catch (e) { toast.error((e as Error).message); } }
  async function onCancelar() {
    if (!id) return;
    const motivo = prompt("Motivo (≥5):") ?? "";
    if (motivo.trim().length < 5) return;
    try { await cancelar.mutateAsync({ p_id: id, p_motivo: motivo.trim() }); toast.success("Pedido cancelado"); onClose(); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function onReceberConfirmar() {
    if (!id) return;
    const itensReceber = itens
      .map((it) => ({ pedido_item_id: it.id as string, qtd: Number(qtdsRec[it.id as string] ?? 0) }))
      .filter((x) => x.qtd > 0);
    if (itensReceber.length === 0) { toast.error("Informe ao menos uma quantidade"); return; }
    try {
      const recId = await criarRec.mutateAsync({ pedido_id: id, documento: docNF || null });
      // inserir itens do recebimento (RLS permite a quem tem permissão de criar)
      const payload = itensReceber.map((x) => ({ recebimento_id: recId, pedido_item_id: x.pedido_item_id, quantidade_recebida: x.qtd }));
      const { error } = await supabase.from("suprimentos_recebimento_itens" as never).insert(payload as never);
      if (error) throw error;
      await confirmarRec.mutateAsync({ p_id: recId });
      toast.success("Recebimento confirmado e estoque atualizado");
      setQtdsRec({}); setDocNF("");
      refetch();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            Pedido de Compra #{(ped?.numero as number) ?? "—"}
            {status && <Badge variant="outline" className="text-[10.5px]">{PED_LABEL[status]}</Badge>}
            {statusFinanceiro !== "NAO_GERADO" && (
              <Badge
                variant="outline"
                className={`text-[10.5px] ${
                  statusFinanceiro === "PRONTO_PARA_FINANCEIRO" ? "border-emerald-300 text-emerald-700 bg-emerald-50" :
                  statusFinanceiro === "BLOQUEADO" ? "border-red-300 text-red-700 bg-red-50" :
                  statusFinanceiro === "GERADO" ? "border-blue-300 text-blue-700 bg-blue-50" : ""
                }`}
              >Fin: {statusFinanceiro.replace(/_/g, " ")}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !ped ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {status === "EMITIDO" && (<Button size="sm" onClick={onAprovar} className="bg-emerald-600 hover:bg-emerald-700">Aprovar</Button>)}
              {(status === "APROVADO" || status === "EMITIDO") && (<Button size="sm" onClick={onEnviar} className="bg-blue-600 hover:bg-blue-700">Enviar ao fornecedor</Button>)}
              {status && !["RECEBIDO","CANCELADO"].includes(status) && (
                <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={onCancelar}>Cancelar pedido</Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px] mb-2">
              <div><b>Total:</b> {fmtBRL(Number(ped.valor_total ?? 0))}</div>
              <div><b>Criado:</b> {fmtDT(ped.criado_em as string)}</div>
            </div>

            <Tabs defaultValue="itens">
              <TabsList className="h-8">
                <TabsTrigger value="itens" className="text-[11.5px]">Itens ({itens.length})</TabsTrigger>
                <TabsTrigger value="receber" className="text-[11.5px]">Receber</TabsTrigger>
                <TabsTrigger value="financeiro" className="text-[11.5px]">Preparação financeira</TabsTrigger>
                <TabsTrigger value="historico" className="text-[11.5px]">Histórico ({eventos.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="itens">
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 text-[10.5px] uppercase">
                      <tr>
                        <th className="px-2 py-1 text-left">Descrição</th>
                        <th className="px-2 py-1 text-right">Qtd</th>
                        <th className="px-2 py-1 text-right">Recebida</th>
                        <th className="px-2 py-1 text-right">R$ Unit</th>
                        <th className="px-2 py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it) => (
                        <tr key={String(it.id)} className="border-t">
                          <td className="px-2 py-1">{it.descricao as string}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{Number(it.quantidade ?? 0)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{Number(it.quantidade_recebida ?? 0)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(Number(it.valor_unitario ?? 0))}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(Number(it.valor_total ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="receber">
                {status === "CANCELADO" || status === "RECEBIDO" ? (
                  <p className="text-[12px] text-muted-foreground">Pedido {PED_LABEL[status]}. Não há mais recebimento a registrar.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <div><Label className="text-[11px]">Documento / NF</Label>
                        <Input className="h-8 text-[12px] w-56" value={docNF} onChange={(e) => setDocNF(e.target.value)} placeholder="Nº NF ou docto" />
                      </div>
                      <Button size="sm" onClick={onReceberConfirmar} className="bg-emerald-600 hover:bg-emerald-700">Confirmar recebimento</Button>
                    </div>
                    <div className="overflow-x-auto rounded border">
                      <table className="w-full text-[12px]">
                        <thead className="bg-muted/40 text-[10.5px] uppercase">
                          <tr><th className="px-2 py-1 text-left">Descrição</th><th className="px-2 py-1 text-right">Pendente</th><th className="px-2 py-1 text-right">A receber agora</th></tr>
                        </thead>
                        <tbody>
                          {itens.map((it) => {
                            const pend = Number(it.quantidade ?? 0) - Number(it.quantidade_recebida ?? 0);
                            return (
                              <tr key={String(it.id)} className="border-t">
                                <td className="px-2 py-1">{it.descricao as string}</td>
                                <td className="px-2 py-1 text-right tabular-nums">{pend}</td>
                                <td className="px-2 py-1 text-right">
                                  <Input type="number" min={0} max={pend} step="0.0001"
                                    className="h-7 w-24 text-[11.5px] inline-block"
                                    value={qtdsRec[it.id as string] ?? ""}
                                    onChange={(e) => setQtdsRec((s) => ({ ...s, [it.id as string]: Number(e.target.value) }))}
                                    disabled={pend <= 0}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="financeiro">
                <div className="space-y-2">
                  <div className="text-[11.5px] text-muted-foreground">
                    Preenche os dados para o financeiro. Nenhum título é gerado automaticamente — o
                    pedido apenas fica <b>Pronto para financeiro</b> e pode ser baixado pela equipe.
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div><Label className="text-[11px]">Condição de pagamento *</Label>
                      <Input className="h-8 text-[12px]" value={finCond} onChange={(e) => setFinCond(e.target.value)} placeholder="Ex.: 30/60/90" /></div>
                    <div><Label className="text-[11px]">Data prevista *</Label>
                      <Input type="date" className="h-8 text-[12px]" value={finData} onChange={(e) => setFinData(e.target.value)} /></div>
                    <div><Label className="text-[11px]">Documento / NF</Label>
                      <Input className="h-8 text-[12px]" value={finDoc} onChange={(e) => setFinDoc(e.target.value)} placeholder="Nº NF" /></div>
                    <div><Label className="text-[11px]">Valor aprovado final *</Label>
                      <Input type="number" step="0.01" className="h-8 text-[12px]" value={finValor}
                        onChange={(e) => setFinValor(e.target.value)} placeholder={String(ped.valor_total ?? 0)} /></div>
                    <div className="col-span-2 md:col-span-4"><Label className="text-[11px]">Observação</Label>
                      <Input className="h-8 text-[12px]" value={finObs} onChange={(e) => setFinObs(e.target.value)} /></div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={!finCond || !finData || !finValor}
                      onClick={async () => {
                        try {
                          await prepararFin.mutateAsync({
                            pedido_id: id!,
                            condicao_pagamento: finCond,
                            data_prevista_pagamento: finData,
                            documento_fiscal: finDoc || null,
                            valor_aprovado_final: Number(finValor),
                            financeiro_observacao: finObs || null,
                          });
                          toast.success("Pedido pronto para o financeiro");
                          refetch();
                        } catch (e) { toast.error((e as Error).message); }
                      }}>Enviar para o financeiro</Button>
                    <Button size="sm" variant="outline" className="text-red-700 border-red-300"
                      onClick={async () => {
                        const m = prompt("Motivo do bloqueio (≥5):") ?? "";
                        if (m.trim().length < 5) return;
                        try { await bloquearFin.mutateAsync({ pedido_id: id!, motivo: m.trim() }); toast.success("Pedido bloqueado no financeiro"); refetch(); }
                        catch (e) { toast.error((e as Error).message); }
                      }}>Bloquear no financeiro</Button>
                    {statusFinanceiro === "BLOQUEADO" && (
                      <Button size="sm" variant="outline"
                        onClick={async () => {
                          const m = prompt("Motivo do desbloqueio (≥5):") ?? "";
                          if (m.trim().length < 5) return;
                          try { await desbloquearFin.mutateAsync({ pedido_id: id!, motivo: m.trim() }); toast.success("Pedido desbloqueado"); refetch(); }
                          catch (e) { toast.error((e as Error).message); }
                        }}>Desbloquear</Button>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-1">
                    Status financeiro atual: <b>{statusFinanceiro.replace(/_/g, " ")}</b>
                    {ped.financeiro_bloqueio_motivo ? <span className="text-red-700"> — {String(ped.financeiro_bloqueio_motivo)}</span> : null}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="historico">
                <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                  {eventos.map((e) => (
                    <div key={String(e.id)} className="text-[11.5px] border-l-2 border-indigo-300 pl-2 py-0.5">
                      <span className="font-semibold">{e.tipo_evento as string}</span> — {(e.observacao as string) ?? ""}{" "}
                      <span className="text-muted-foreground">· {fmtDT(e.data_hora as string)}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
