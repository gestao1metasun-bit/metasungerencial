/**
 * D20.SUP.4 — Detalhe de Recebimento (somente leitura + confirmar se rascunho).
 */
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useRecebimentoDetalhe, useConfirmarRecebimento,
  REC_LABEL, type SupRecStatus,
} from "@/lib/repositories/suprimentos-compras-repo";

type Props = { id: string | null; onClose: () => void };
const fmtDT = (s: string) => new Date(s).toLocaleString("pt-BR");

export function RecebimentoDetailDialog({ id, onClose }: Props) {
  const { data, isLoading } = useRecebimentoDetalhe(id);
  const rec = data?.cabecalho as Record<string, unknown> | null | undefined;
  const itens = (data?.itens ?? []) as Array<Record<string, unknown>>;
  const eventos = (data?.eventos ?? []) as Array<Record<string, unknown>>;
  const status = rec?.status as SupRecStatus | undefined;
  const confirmar = useConfirmarRecebimento();

  async function onConfirmar() {
    if (!id) return;
    try { await confirmar.mutateAsync({ p_id: id }); toast.success("Recebimento confirmado"); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            Recebimento #{(rec?.numero as number) ?? "—"}
            {status && <Badge variant="outline" className="text-[10.5px]">{REC_LABEL[status]}</Badge>}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !rec ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            {status === "RASCUNHO" && (
              <Button size="sm" onClick={onConfirmar} className="bg-emerald-600 hover:bg-emerald-700 mb-2 w-fit">Confirmar recebimento</Button>
            )}
            <div className="text-[12px] space-y-1 mb-2">
              <div><b>Documento:</b> {(rec.documento as string) ?? "—"}</div>
              <div><b>Data:</b> {rec.data_recebimento as string}</div>
            </div>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40 text-[10.5px] uppercase">
                  <tr><th className="px-2 py-1 text-left">Item pedido</th><th className="px-2 py-1 text-right">Qtd recebida</th><th className="px-2 py-1 text-left">Obs</th></tr>
                </thead>
                <tbody>
                  {itens.map((it) => (
                    <tr key={String(it.id)} className="border-t">
                      <td className="px-2 py-1 tabular-nums">{String(it.pedido_item_id).slice(0,8)}…</td>
                      <td className="px-2 py-1 text-right tabular-nums">{Number(it.quantidade_recebida ?? 0)}</td>
                      <td className="px-2 py-1">{(it.observacao as string) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 space-y-1 max-h-[30vh] overflow-y-auto">
              {eventos.map((e) => (
                <div key={String(e.id)} className="text-[11.5px] border-l-2 border-indigo-300 pl-2 py-0.5">
                  <span className="font-semibold">{e.tipo_evento as string}</span> — {(e.observacao as string) ?? ""}{" "}
                  <span className="text-muted-foreground">· {fmtDT(e.data_hora as string)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
