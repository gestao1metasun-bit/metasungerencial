/**
 * D20.SUP.2.UI + D20.SUP.3 — Diálogo Detalhe / Ações da Requisição
 *
 * Ações via RPCs oficiais (Enviar, Aprovar, Reprovar, Retornar, Cancelar,
 * Verificar estoque, Reservar, Entregar/Baixar, Devolver item, Enviar p/
 * compra, Atender total). Cada botão respeita o status atual e a
 * disponibilidade (regras de pedra do backend).
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, CheckCircle2, XCircle, Undo2, Ban, ShoppingCart, PackageCheck,
  Boxes, History, FileText, Loader2, PackagePlus, Truck, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useRequisicaoDetalhe, useEnviarRequisicao, useAprovarRequisicao,
  useReprovarRequisicao, useRetornarRequisicao, useCancelarRequisicao,
  useEnviarCompra, useAtenderTotal,
  useVerificarEstoqueRPC, useReservarRequisicao, useEntregarRequisicao,
  useDevolverItemRequisicao,
  STATUS_LABEL, STATUS_TONE, type SupReqStatus,
  type VerificacaoEstoqueItem,
} from "@/lib/repositories/suprimentos-requisicoes-repo";

const TONE_CLASS: Record<string, string> = {
  muted: "bg-muted text-muted-foreground border-border",
  info: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
  warning: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
  success: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
  danger: "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300",
  primary: "bg-primary/10 text-primary border-primary/30",
};

const ATEND_TONE: Record<VerificacaoEstoqueItem["status_atendimento"], string> = {
  DISPONIVEL: TONE_CLASS.success,
  RESERVADO: TONE_CLASS.primary,
  PARCIAL: TONE_CLASS.warning,
  INDISPONIVEL: TONE_CLASS.danger,
  SEM_VINCULO: TONE_CLASS.muted,
  NAO_APROVADO: TONE_CLASS.muted,
};
const ATEND_LABEL: Record<VerificacaoEstoqueItem["status_atendimento"], string> = {
  DISPONIVEL: "Disponível",
  RESERVADO: "Reservado",
  PARCIAL: "Parcial",
  INDISPONIVEL: "Indisponível",
  SEM_VINCULO: "Sem vínculo",
  NAO_APROVADO: "Não aprovado",
};

function StatusBadge({ status }: { status: SupReqStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <Badge variant="outline" className={`text-[11px] ${TONE_CLASS[tone]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function MotivoPrompt({ titulo, placeholder, onConfirm, onCancel, busy }: {
  titulo: string; placeholder: string;
  onConfirm: (m: string) => void; onCancel: () => void; busy?: boolean;
}) {
  const [m, setM] = useState("");
  return (
    <div className="border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 rounded p-2 space-y-1.5">
      <div className="text-[11.5px] font-semibold">{titulo}</div>
      <Textarea rows={2} className="text-[12px]" placeholder={placeholder} value={m} onChange={(e) => setM(e.target.value)} />
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" className="h-7 text-[11.5px]" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button size="sm" className="h-7 text-[11.5px]" disabled={busy || m.trim().length < 5}
          onClick={() => onConfirm(m.trim())}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar"}
        </Button>
      </div>
      <div className="text-[10.5px] text-muted-foreground">Mínimo 5 caracteres.</div>
    </div>
  );
}

export function RequisicaoDetailDialog({
  id, open, onOpenChange,
}: {
  id: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useRequisicaoDetalhe(open ? id : null);
  const [prompt, setPrompt] = useState<"reprovar" | "retornar" | "cancelar" | "compra" | null>(null);
  const [verificacao, setVerificacao] = useState<VerificacaoEstoqueItem[] | null>(null);
  const [devolverItem, setDevolverItem] = useState<{ id: string; max: number; descricao: string } | null>(null);

  const enviar = useEnviarRequisicao();
  const aprovar = useAprovarRequisicao();
  const reprovar = useReprovarRequisicao();
  const retornar = useRetornarRequisicao();
  const cancelar = useCancelarRequisicao();
  const verificar = useVerificarEstoqueRPC();
  const reservar = useReservarRequisicao();
  const entregar = useEntregarRequisicao();
  const devolver = useDevolverItemRequisicao();
  const enviarCompra = useEnviarCompra();
  const atender = useAtenderTotal();
  const criarCotacao = useCriarCotacao();

  if (!id) return null;
  const cab = data?.cabecalho ?? null;
  const status = cab?.status as SupReqStatus | undefined;
  const temOs = !!cab?.os_id;

  const can = {
    enviar: status === "RASCUNHO" || status === "RETORNADA",
    aprovar: status === "ENVIADA" || status === "EM_APROVACAO",
    reprovar: status === "ENVIADA" || status === "EM_APROVACAO",
    retornar: status === "ENVIADA" || status === "EM_APROVACAO",
    cancelar: !!status && !["CANCELADA", "ATENDIDA", "REPROVADA"].includes(status),
    verificar: !!status && ["APROVADA", "AGUARDANDO_ESTOQUE", "EM_SEPARACAO", "PARCIALMENTE_ATENDIDA"].includes(status),
    reservar: !!status && ["APROVADA", "AGUARDANDO_ESTOQUE", "EM_SEPARACAO", "PARCIALMENTE_ATENDIDA"].includes(status) && temOs,
    entregar: !!status && ["EM_SEPARACAO", "PARCIALMENTE_ATENDIDA"].includes(status) && temOs,
    enviarCompra: !!status && ["APROVADA", "AGUARDANDO_ESTOQUE"].includes(status),
    atender: !!status && ["APROVADA", "EM_SEPARACAO", "EM_COMPRA", "PARCIALMENTE_ATENDIDA"].includes(status),
  };

  async function run<T>(fn: () => Promise<T>, ok?: string) {
    try { const r = await fn(); if (ok) toast.success(ok); return r; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha na operação."); throw e; }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-[14px] flex items-center gap-2 flex-wrap">
            <FileText className="h-4 w-4" />
            Requisição #{cab?.numero ?? "—"} {status && <StatusBadge status={status} />}
            {cab?.tipo && <Badge variant="outline" className="text-[10.5px]">{cab.tipo}</Badge>}
            {cab?.prioridade && <Badge variant="outline" className="text-[10.5px]">{cab.prioridade}</Badge>}
            {!temOs && <span className="text-[10.5px] text-muted-foreground">(sem O.S. vinculada — reserva/baixa indisponível)</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !cab ? (
          <div className="p-8 text-center text-[12px] text-muted-foreground">Carregando…</div>
        ) : (
          <>
            {/* Ações */}
            <div className="flex flex-wrap gap-1.5 border-b pb-2">
              <Button size="sm" variant="outline" className="h-7 text-[11.5px]" disabled={!can.enviar || enviar.isPending}
                onClick={() => run(() => enviar.mutateAsync(cab.id), "Requisição enviada.")}>
                <Send className="h-3.5 w-3.5 mr-1" /> Enviar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                disabled={!can.aprovar || aprovar.isPending}
                onClick={() => run(() => aprovar.mutateAsync({ id: cab.id }), "Requisição aprovada.")}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-red-300 text-red-700 hover:bg-red-50"
                disabled={!can.reprovar} onClick={() => setPrompt("reprovar")}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reprovar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-amber-300 text-amber-700 hover:bg-amber-50"
                disabled={!can.retornar} onClick={() => setPrompt("retornar")}>
                <Undo2 className="h-3.5 w-3.5 mr-1" /> Retornar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-red-300 text-red-700 hover:bg-red-50"
                disabled={!can.cancelar} onClick={() => setPrompt("cancelar")}>
                <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>

              <span className="mx-1 h-6 border-l self-center" />

              <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={!can.verificar || verificar.isPending}
                onClick={() => run(async () => {
                  const r = await verificar.mutateAsync(cab.id);
                  setVerificacao(r);
                  const indisp = r.filter((x) => x.status_atendimento === "INDISPONIVEL").length;
                  const parc = r.filter((x) => x.status_atendimento === "PARCIAL").length;
                  if (indisp + parc === 0) toast.success("Estoque atende a requisição.");
                  else toast.info(`${indisp} indisponível(is), ${parc} parcial(is).`);
                })}>
                <Boxes className="h-3.5 w-3.5 mr-1" /> Verificar estoque
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={!can.reservar || reservar.isPending}
                title={!temOs ? "Requer O.S. vinculada" : ""}
                onClick={() => run(async () => {
                  const r = await reservar.mutateAsync(cab.id);
                  toast.success(`${r.itens_reservados} item(ns) reservado(s).`);
                })}>
                <PackagePlus className="h-3.5 w-3.5 mr-1" /> Reservar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                disabled={!can.entregar || entregar.isPending}
                title={!temOs ? "Requer O.S. vinculada" : ""}
                onClick={() => run(async () => {
                  const r = await entregar.mutateAsync({ id: cab.id });
                  toast.success(`${r.itens_entregues} item(ns) entregue(s). Custo gerado na O.S.`);
                })}>
                <Truck className="h-3.5 w-3.5 mr-1" /> Entregar / Baixar
              </Button>

              <span className="mx-1 h-6 border-l self-center" />

              <Button size="sm" variant="outline" className="h-7 text-[11.5px]"
                disabled={!can.enviarCompra} onClick={() => setPrompt("compra")}>
                <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Enviar para compra
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                disabled={!can.atender || atender.isPending}
                onClick={() => run(() => atender.mutateAsync({ id: cab.id }), "Atendimento total registrado.")}>
                <PackageCheck className="h-3.5 w-3.5 mr-1" /> Atender total
              </Button>
            </div>

            {prompt === "reprovar" && (
              <MotivoPrompt titulo="Motivo da reprovação" placeholder="Descreva o motivo (mín. 5 chars)"
                onCancel={() => setPrompt(null)} busy={reprovar.isPending}
                onConfirm={(m) => run(async () => { await reprovar.mutateAsync({ id: cab.id, motivo: m }); setPrompt(null); }, "Requisição reprovada.")} />
            )}
            {prompt === "retornar" && (
              <MotivoPrompt titulo="Motivo do retorno" placeholder="O que precisa ser ajustado?"
                onCancel={() => setPrompt(null)} busy={retornar.isPending}
                onConfirm={(m) => run(async () => { await retornar.mutateAsync({ id: cab.id, motivo: m }); setPrompt(null); }, "Requisição retornada.")} />
            )}
            {prompt === "cancelar" && (
              <MotivoPrompt titulo="Motivo do cancelamento" placeholder="Por que cancelar?"
                onCancel={() => setPrompt(null)} busy={cancelar.isPending}
                onConfirm={(m) => run(async () => { await cancelar.mutateAsync({ id: cab.id, motivo: m }); setPrompt(null); }, "Requisição cancelada.")} />
            )}
            {prompt === "compra" && (
              <MotivoPrompt titulo="Justificativa (envio para compra)" placeholder="Motivo do envio para compra"
                onCancel={() => setPrompt(null)} busy={enviarCompra.isPending || criarCotacao.isPending}
                onConfirm={(m) => run(async () => {
                  await enviarCompra.mutateAsync({ id: cab.id, justificativa: m });
                  await criarCotacao.mutateAsync(cab.id);
                  setPrompt(null);
                  toast.success("Cotação criada — abra a aba Cotações em /suprimentos.");
                })} />
            )}

            {devolverItem && (
              <DevolverItemPrompt
                descricao={devolverItem.descricao}
                max={devolverItem.max}
                busy={devolver.isPending}
                onCancel={() => setDevolverItem(null)}
                onConfirm={(qtd, motivo) => run(async () => {
                  await devolver.mutateAsync({ item_id: devolverItem.id, quantidade: qtd, motivo });
                  setDevolverItem(null);
                }, "Devolução registrada.")}
              />
            )}

            <Tabs defaultValue={verificacao ? "estoque" : "dados"} className="w-full" key={verificacao ? "v" : "n"}>
              <TabsList className="h-7">
                <TabsTrigger value="dados" className="text-[11.5px]">Dados</TabsTrigger>
                <TabsTrigger value="itens" className="text-[11.5px]">Itens ({data?.itens.length ?? 0})</TabsTrigger>
                {verificacao && <TabsTrigger value="estoque" className="text-[11.5px]"><Boxes className="h-3 w-3 mr-1" />Estoque ({verificacao.length})</TabsTrigger>}
                <TabsTrigger value="historico" className="text-[11.5px]"><History className="h-3 w-3 mr-1" />Histórico ({data?.eventos.length ?? 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="mt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1.5 text-[12px]">
                  <Field label="Tipo" value={cab.tipo} />
                  <Field label="Status" value={STATUS_LABEL[cab.status as SupReqStatus]} />
                  <Field label="Prioridade" value={cab.prioridade} />
                  <Field label="Setor" value={cab.setor ?? "—"} />
                  <Field label="Data necessária" value={cab.data_necessidade ?? "—"} />
                  <Field label="O.S. vinculada" value={cab.os_id ?? "—"} />
                  <Field label="Valor estimado" value={`R$ ${Number(cab.valor_estimado ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Field label="Valor aprovado" value={cab.valor_aprovado != null ? `R$ ${Number(cab.valor_aprovado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"} />
                  <Field label="Criado em" value={cab.criado_em ? format(new Date(cab.criado_em), "dd/MM/yyyy HH:mm") : "—"} />
                </div>
                {cab.justificativa && (
                  <div className="mt-2">
                    <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Justificativa</div>
                    <div className="text-[12px] whitespace-pre-wrap">{cab.justificativa}</div>
                  </div>
                )}
                {cab.motivo_reprovacao && <Motivo titulo="Motivo da reprovação" texto={cab.motivo_reprovacao} tone="danger" />}
                {cab.motivo_retorno && <Motivo titulo="Motivo do retorno" texto={cab.motivo_retorno} tone="warning" />}
                {cab.motivo_cancelamento && <Motivo titulo="Motivo do cancelamento" texto={cab.motivo_cancelamento} tone="danger" />}
              </TabsContent>

              <TabsContent value="itens" className="mt-2">
                <ScrollArea className="max-h-[360px]">
                  <table className="w-full text-[11.5px]">
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th className="text-left px-1.5 py-1">#</th>
                        <th className="text-left px-1.5 py-1">Descrição</th>
                        <th className="text-left px-1.5 py-1">Un.</th>
                        <th className="text-right px-1.5 py-1">Solicit.</th>
                        <th className="text-right px-1.5 py-1">Aprov.</th>
                        <th className="text-right px-1.5 py-1">Reserv.</th>
                        <th className="text-right px-1.5 py-1">Entreg.</th>
                        <th className="text-right px-1.5 py-1">Devolv.</th>
                        <th className="text-right px-1.5 py-1">Vlr total</th>
                        <th className="text-center px-1.5 py-1">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.itens.map((it) => {
                        const podeDevolver = Number(it.quantidade_entregue ?? 0) - Number(it.quantidade_devolvida ?? 0) > 0;
                        return (
                          <tr key={it.id} className="border-b last:border-0">
                            <td className="px-1.5 py-1 tabular-nums">{it.ordem}</td>
                            <td className="px-1.5 py-1">{it.descricao}</td>
                            <td className="px-1.5 py-1">{it.unidade}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(it.quantidade_solicitada).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(it.quantidade_aprovada).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(it.quantidade_reservada ?? 0).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(it.quantidade_entregue ?? 0).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(it.quantidade_devolvida ?? 0).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(it.valor_estimado_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                            <td className="px-1.5 py-1 text-center">
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10.5px] text-red-700 hover:bg-red-50"
                                disabled={!podeDevolver}
                                onClick={() => setDevolverItem({
                                  id: it.id,
                                  descricao: it.descricao,
                                  max: Number(it.quantidade_entregue ?? 0) - Number(it.quantidade_devolvida ?? 0),
                                })}>
                                <RotateCcw className="h-3 w-3 mr-1" /> Devolver
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {(!data?.itens || data.itens.length === 0) && (
                        <tr><td colSpan={10} className="px-1.5 py-3 text-center text-muted-foreground">Sem itens.</td></tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </TabsContent>

              {verificacao && (
                <TabsContent value="estoque" className="mt-2">
                  <ScrollArea className="max-h-[360px]">
                    <table className="w-full text-[11.5px]">
                      <thead className="text-muted-foreground">
                        <tr className="border-b">
                          <th className="text-left px-1.5 py-1">Descrição</th>
                          <th className="text-right px-1.5 py-1">Aprov.</th>
                          <th className="text-right px-1.5 py-1">Reserv.</th>
                          <th className="text-right px-1.5 py-1">Falta</th>
                          <th className="text-right px-1.5 py-1">Saldo físico</th>
                          <th className="text-right px-1.5 py-1">Reserv. total</th>
                          <th className="text-right px-1.5 py-1">Disponível</th>
                          <th className="text-center px-1.5 py-1">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verificacao.map((v) => (
                          <tr key={v.item_id} className="border-b last:border-0">
                            <td className="px-1.5 py-1">{v.descricao}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(v.qtd_aprovada).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(v.qtd_reservada).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(v.falta).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(v.saldo_fisico).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{Number(v.saldo_reservado_total).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums font-semibold">{Number(v.saldo_disponivel).toFixed(2)}</td>
                            <td className="px-1.5 py-1 text-center">
                              <Badge variant="outline" className={`text-[10.5px] ${ATEND_TONE[v.status_atendimento]}`}>
                                {ATEND_LABEL[v.status_atendimento]}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </TabsContent>
              )}

              <TabsContent value="historico" className="mt-2">
                <ScrollArea className="max-h-[360px]">
                  {data?.eventos.length ? (
                    <ul className="space-y-1.5">
                      {data.eventos.map((e) => (
                        <li key={e.id} className="border rounded px-2 py-1.5 text-[11.5px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{e.tipo_evento}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {format(new Date(e.data_hora), "dd/MM/yyyy HH:mm")}
                            </span>
                          </div>
                          {(e.status_anterior || e.status_novo) && (
                            <div className="text-muted-foreground">
                              {e.status_anterior ?? "—"} → {e.status_novo ?? "—"}
                            </div>
                          )}
                          {e.observacao && <div className="mt-0.5 whitespace-pre-wrap">{e.observacao}</div>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[12px] text-center text-muted-foreground py-4">Sem eventos.</div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DevolverItemPrompt({ descricao, max, onConfirm, onCancel, busy }: {
  descricao: string; max: number;
  onConfirm: (qtd: number, motivo: string) => void; onCancel: () => void; busy?: boolean;
}) {
  const [qtd, setQtd] = useState<string>(max.toString());
  const [motivo, setMotivo] = useState("");
  const q = Number(qtd);
  const ok = q > 0 && q <= max && motivo.trim().length >= 5;
  return (
    <div className="border border-red-300 bg-red-50/50 dark:bg-red-950/20 rounded p-2 space-y-1.5">
      <div className="text-[11.5px] font-semibold">Devolver item: {descricao}</div>
      <div className="flex gap-2 items-end">
        <div className="flex-shrink-0">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Qtd (máx {max})</div>
          <Input type="number" min={0} max={max} step="0.01" value={qtd} onChange={(e) => setQtd(e.target.value)} className="h-7 text-[12px] w-28" />
        </div>
        <Textarea rows={2} className="text-[12px] flex-1" placeholder="Motivo (mín. 5 chars)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </div>
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" className="h-7 text-[11.5px]" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button size="sm" className="h-7 text-[11.5px]" disabled={busy || !ok} onClick={() => onConfirm(q, motivo.trim())}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar devolução"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[12px] tabular-nums">{value}</div>
    </div>
  );
}

function Motivo({ titulo, texto, tone }: { titulo: string; texto: string; tone: "danger" | "warning" }) {
  const cls = tone === "danger"
    ? "border-red-300 bg-red-50/60 dark:bg-red-950/20 text-red-800 dark:text-red-300"
    : "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300";
  return (
    <div className={`mt-2 border rounded p-2 ${cls}`}>
      <div className="text-[10.5px] uppercase tracking-wider font-semibold">{titulo}</div>
      <div className="text-[12px] whitespace-pre-wrap">{texto}</div>
    </div>
  );
}
