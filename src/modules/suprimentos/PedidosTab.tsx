/**
 * D20.SUP.4 — Pedidos de Compra.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnterpriseRecordToolbar, RowActions } from "@/components/app/enterprise";
import {
  usePedidosLista, useAprovarPedido, useEnviarPedido, useCancelarPedido,
  PED_LABEL, PED_STATUS_OPTIONS, type SupPedStatus, type PedidoListaRow,
} from "@/lib/repositories/suprimentos-compras-repo";
import { PedidoDetailDialog } from "./PedidoDetailDialog";

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

function StatusBadge({ s }: { s: SupPedStatus }) {
  const tone: Record<SupPedStatus, string> = {
    EMITIDO: "bg-muted text-muted-foreground",
    APROVADO: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    ENVIADO_FORNECEDOR: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
    PARCIALMENTE_RECEBIDO: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    RECEBIDO: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200",
    CANCELADO: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300",
  };
  return <Badge variant="outline" className={`text-[10.5px] px-1.5 py-0 ${tone[s]}`}>{PED_LABEL[s]}</Badge>;
}

export function PedidosTab() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupPedStatus | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data = [], isLoading, refetch } = usePedidosLista({ search, status: status || null });
  const aprovar = useAprovarPedido();
  const enviar = useEnviarPedido();
  const cancelar = useCancelarPedido();

  async function onAprovar(p: PedidoListaRow) {
    try { await aprovar.mutateAsync({ p_id: p.id }); toast.success(`Pedido #${p.numero} aprovado`); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onEnviar(p: PedidoListaRow) {
    try { await enviar.mutateAsync({ p_id: p.id }); toast.success(`Pedido #${p.numero} enviado ao fornecedor`); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onCancelar(p: PedidoListaRow) {
    const motivo = prompt("Motivo do cancelamento (≥5 caracteres):");
    if (!motivo || motivo.trim().length < 5) return;
    try { await cancelar.mutateAsync({ p_id: p.id, p_motivo: motivo.trim() }); toast.success(`Pedido #${p.numero} cancelado`); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-2">
      <EnterpriseRecordToolbar
        searchPlaceholder="Buscar pedido ou fornecedor…"
        searchValue={search}
        onSearchChange={setSearch}
        onReload={() => refetch()}
        actions={[
          { kind: "filter", label: "Filtros", element: (
            <Select value={status || undefined} onValueChange={(v) => setStatus((v as SupPedStatus) || "")}>
              <SelectTrigger className="h-7 w-[160px] text-[11.5px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {PED_STATUS_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
              </SelectContent>
            </Select>
          )},
        ]}
      />
      <Card className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider">
            <tr>
              <th className="px-2 py-1.5 text-left">#</th>
              <th className="px-2 py-1.5 text-left">Requisição</th>
              <th className="px-2 py-1.5 text-left">Fornecedor</th>
              <th className="px-2 py-1.5 text-left">Status</th>
              <th className="px-2 py-1.5 text-right">Valor</th>
              <th className="px-2 py-1.5 text-left">Criado</th>
              <th className="px-2 py-1.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (<tr><td colSpan={7} className="p-3 text-center text-muted-foreground">Carregando…</td></tr>)}
            {!isLoading && data.length === 0 && (<tr><td colSpan={7} className="p-3 text-center text-muted-foreground">Nenhum pedido. Gere a partir de uma cotação aprovada.</td></tr>)}
            {data.map((p) => (
              <tr key={p.id} className="border-t border-border/60 hover:bg-muted/30">
                <td className="px-2 py-1 font-medium tabular-nums">#{p.numero}</td>
                <td className="px-2 py-1 tabular-nums">REQ-{p.requisicao_numero}</td>
                <td className="px-2 py-1 truncate max-w-[200px]">{p.fornecedor_nome}</td>
                <td className="px-2 py-1"><StatusBadge s={p.status} /></td>
                <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(Number(p.valor_total ?? 0))}</td>
                <td className="px-2 py-1 tabular-nums">{fmtDate(p.criado_em)}</td>
                <td className="px-2 py-1">
                  <RowActions
                    onView={() => setOpenId(p.id)}
                    extra={[
                      ...(p.status === "EMITIDO" ? [{ key: "aprovar", label: "Aprovar", icon: "send" as const, onClick: () => onAprovar(p), tone: "green" as const }] : []),
                      ...((p.status === "APROVADO" || p.status === "EMITIDO") ? [{ key: "enviar", label: "Enviar fornecedor", icon: "send" as const, onClick: () => onEnviar(p), tone: "blue" as const }] : []),
                      ...(!["RECEBIDO","CANCELADO"].includes(p.status) ? [{ key: "cancelar", label: "Cancelar", icon: "x" as const, onClick: () => onCancelar(p), tone: "red" as const }] : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <PedidoDetailDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
