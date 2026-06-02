/**
 * D20.SUP.4 — Detalhe de Cotação.
 * Permite escolher fornecedor por item, enviar, aprovar, reprovar, cancelar, gerar pedido.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCotacaoDetalhe, useEnviarCotacao, useAprovarCotacao, useReprovarCotacao,
  useCancelarCotacao, useGerarPedido, useUpsertCotacaoItem,
  COT_LABEL, type SupCotStatus,
} from "@/lib/repositories/suprimentos-compras-repo";
import { useFornecedoresOficiais } from "@/lib/repositories/cadastros-repo";

type Props = { id: string | null; onClose: () => void };

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s: string) => new Date(s).toLocaleString("pt-BR");

export function CotacaoDetailDialog({ id, onClose }: Props) {
  const { data, isLoading } = useCotacaoDetalhe(id);
  const cot = data?.cabecalho as Record<string, unknown> | null | undefined;
  const itens = (data?.itens ?? []) as Array<Record<string, unknown>>;
  const eventos = (data?.eventos ?? []) as Array<Record<string, unknown>>;
  const status = cot?.status as SupCotStatus | undefined;
  const fornecedoresQ = useFornecedoresOficiais();
  const fornecedores = ((fornecedoresQ.data ?? []) as Array<{ id: string; nome: string }>);

  const enviar = useEnviarCotacao();
  const aprovar = useAprovarCotacao();
  const reprovar = useReprovarCotacao();
  const cancelar = useCancelarCotacao();
  const gerarPedido = useGerarPedido();
  const upsertItem = useUpsertCotacaoItem();

  const [forn, setForn] = useState<string>("");
  useEffect(() => { setForn((cot?.fornecedor_aprovado_id as string) || ""); }, [cot?.fornecedor_aprovado_id]);

  const totalPorFornecedor = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of itens) {
      const f = (i.fornecedor_id as string) || "";
      if (!f) continue;
      m.set(f, (m.get(f) ?? 0) + Number(i.quantidade ?? 0) * Number(i.valor_unitario ?? 0));
    }
    return m;
  }, [itens]);

  async function onSaveItem(it: Record<string, unknown>, patch: Partial<{ fornecedor_id: string; valor_unitario: number; quantidade: number }>) {
    try {
      await upsertItem.mutateAsync({
        id: it.id as string,
        cotacao_id: it.cotacao_id as string,
        requisicao_item_id: it.requisicao_item_id as string,
        fornecedor_id: patch.fornecedor_id ?? (it.fornecedor_id as string),
        descricao: it.descricao as string,
        unidade: (it.unidade as string) ?? null,
        quantidade: Number(patch.quantidade ?? it.quantidade ?? 0),
        valor_unitario: Number(patch.valor_unitario ?? it.valor_unitario ?? 0),
      });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function onEnviar() {
    if (!id) return;
    try { await enviar.mutateAsync({ p_id: id }); toast.success("Cotação enviada"); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onAprovar() {
    if (!id) return;
    if (!forn) { toast.error("Selecione o fornecedor vencedor"); return; }
    try { await aprovar.mutateAsync({ p_id: id, p_fornecedor_id: forn }); toast.success("Cotação aprovada"); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onReprovar() {
    if (!id) return;
    const motivo = prompt("Motivo da reprovação (≥5):") ?? "";
    if (motivo.trim().length < 5) return;
    try { await reprovar.mutateAsync({ p_id: id, p_motivo: motivo.trim() }); toast.success("Cotação reprovada"); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onCancelar() {
    if (!id) return;
    const motivo = prompt("Motivo do cancelamento (≥5):") ?? "";
    if (motivo.trim().length < 5) return;
    try { await cancelar.mutateAsync({ p_id: id, p_motivo: motivo.trim() }); toast.success("Cotação cancelada"); onClose(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onGerarPedido() {
    if (!id) return;
    try {
      const pid = await gerarPedido.mutateAsync({ p_cotacao_id: id });
      toast.success("Pedido gerado");
      onClose();
      setTimeout(() => { window.location.hash = `#tab=pedidos&open=${pid}`; }, 100);
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            Cotação #{(cot?.numero as number) ?? "—"}
            {status && <Badge variant="outline" className="text-[10.5px]">{COT_LABEL[status]}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !cot ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {(status === "RASCUNHO") && (
                <Button size="sm" onClick={onEnviar} className="bg-blue-600 hover:bg-blue-700">Enviar a fornecedores</Button>
              )}
              {(status === "ENVIADA" || status === "EM_ANALISE" || status === "RASCUNHO") && (
                <div className="flex items-center gap-2">
                  <Select value={forn} onValueChange={setForn}>
                    <SelectTrigger className="h-8 w-[260px] text-[11.5px]"><SelectValue placeholder="Fornecedor vencedor…" /></SelectTrigger>
                    <SelectContent>
                      {fornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}{totalPorFornecedor.get(f.id) ? ` · ${fmtBRL(totalPorFornecedor.get(f.id)!)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={onAprovar} className="bg-emerald-600 hover:bg-emerald-700" disabled={!forn}>Aprovar</Button>
                  <Button size="sm" variant="outline" onClick={onReprovar}>Reprovar</Button>
                </div>
              )}
              {status === "APROVADA" && (
                <Button size="sm" onClick={onGerarPedido} className="bg-emerald-600 hover:bg-emerald-700">Gerar pedido de compra</Button>
              )}
              {status && !["CANCELADA","REPROVADA"].includes(status) && (
                <Button size="sm" variant="outline" onClick={onCancelar} className="text-red-700 border-red-300">Cancelar cotação</Button>
              )}
            </div>

            <Tabs defaultValue="itens">
              <TabsList className="h-8">
                <TabsTrigger value="itens" className="text-[11.5px]">Itens & fornecedores ({itens.length})</TabsTrigger>
                <TabsTrigger value="historico" className="text-[11.5px]">Histórico ({eventos.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="itens">
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 text-[10.5px] uppercase">
                      <tr>
                        <th className="px-2 py-1 text-left">Descrição</th>
                        <th className="px-2 py-1 text-left">Un</th>
                        <th className="px-2 py-1 text-right">Qtd</th>
                        <th className="px-2 py-1 text-right">R$ Unit</th>
                        <th className="px-2 py-1 text-right">Total</th>
                        <th className="px-2 py-1 text-left">Fornecedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it) => {
                        const editable = !["APROVADA","REPROVADA","CANCELADA"].includes(status ?? "");
                        const total = Number(it.quantidade ?? 0) * Number(it.valor_unitario ?? 0);
                        return (
                          <tr key={String(it.id)} className="border-t">
                            <td className="px-2 py-1">{it.descricao as string}</td>
                            <td className="px-2 py-1">{(it.unidade as string) ?? "—"}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{Number(it.quantidade ?? 0)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">
                              <Input
                                type="number" step="0.0001"
                                defaultValue={String(it.valor_unitario ?? 0)}
                                disabled={!editable}
                                className="h-7 text-[11.5px] w-24 inline-block"
                                onBlur={(e) => {
                                  const v = Number(e.target.value);
                                  if (v !== Number(it.valor_unitario)) onSaveItem(it, { valor_unitario: v });
                                }}
                              />
                            </td>
                            <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(total)}</td>
                            <td className="px-2 py-1">
                              <Select
                                value={(it.fornecedor_id as string) ?? ""}
                                onValueChange={(v) => onSaveItem(it, { fornecedor_id: v })}
                                disabled={!editable}
                              >
                                <SelectTrigger className="h-7 w-[200px] text-[11.5px]"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                                <SelectContent>
                                  {fornecedores.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                      {itens.length === 0 && (<tr><td colSpan={6} className="p-3 text-center text-muted-foreground">Sem itens.</td></tr>)}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Totais por fornecedor:{" "}
                  {Array.from(totalPorFornecedor.entries()).map(([fid, t]) => (
                    <span key={fid} className="mr-2 px-1.5 py-0.5 rounded border bg-muted/40">
                      {fornecedores.find((f) => f.id === fid)?.nome ?? fid}: <b>{fmtBRL(t)}</b>
                    </span>
                  ))}
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
                  {eventos.length === 0 && <p className="text-[11.5px] text-muted-foreground">Sem eventos.</p>}
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
