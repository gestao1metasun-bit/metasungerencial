/**
 * D20.SUP.4 — Cotações (lista + ações principais).
 */
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EnterpriseRecordToolbar, RowActions,
} from "@/components/app/enterprise";
import {
  useCotacoesLista, useEnviarCotacao, useCancelarCotacao, useGerarPedido,
  COT_LABEL, COT_STATUS_OPTIONS, type SupCotStatus, type CotacaoListaRow,
} from "@/lib/repositories/suprimentos-compras-repo";
import { CotacaoDetailDialog } from "./CotacaoDetailDialog";

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

function StatusBadge({ s }: { s: SupCotStatus }) {
  const tone: Record<SupCotStatus, string> = {
    RASCUNHO: "bg-muted text-muted-foreground",
    ENVIADA: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
    EM_ANALISE: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    APROVADA: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    REPROVADA: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300",
    CANCELADA: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300",
  };
  return <Badge variant="outline" className={`text-[10.5px] px-1.5 py-0 ${tone[s]}`}>{COT_LABEL[s]}</Badge>;
}

export function CotacoesTab() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupCotStatus | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data = [], isLoading, refetch } = useCotacoesLista({ search, status: status || null });
  const enviar = useEnviarCotacao();
  const cancelar = useCancelarCotacao();
  const gerarPedido = useGerarPedido();

  async function onEnviar(c: CotacaoListaRow) {
    try { await enviar.mutateAsync({ p_id: c.id }); toast.success(`Cotação #${c.numero} enviada`); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onCancelar(c: CotacaoListaRow) {
    const motivo = prompt("Motivo do cancelamento (≥5 caracteres):");
    if (!motivo || motivo.trim().length < 5) return;
    try { await cancelar.mutateAsync({ p_id: c.id, p_motivo: motivo.trim() }); toast.success(`Cotação #${c.numero} cancelada`); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onGerarPedido(c: CotacaoListaRow) {
    if (c.status !== "APROVADA") { toast.error("Cotação precisa estar APROVADA"); return; }
    try {
      const id = await gerarPedido.mutateAsync({ p_cotacao_id: c.id });
      toast.success(`Pedido gerado a partir da cotação #${c.numero}`);
      window.location.hash = `#tab=pedidos&open=${id}`;
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-2">
      <EnterpriseRecordToolbar
        searchPlaceholder="Buscar nº cotação ou requisição…"
        searchValue={search}
        onSearchChange={setSearch}
        onReload={() => refetch()}
        actions={[
          { kind: "filter", label: "Filtros", element: (
            <Select value={status || undefined} onValueChange={(v) => setStatus((v as SupCotStatus) || "")}>
              <SelectTrigger className="h-7 w-[150px] text-[11.5px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {COT_STATUS_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
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
              <th className="px-2 py-1.5 text-left">Status</th>
              <th className="px-2 py-1.5 text-left">Fornecedores</th>
              <th className="px-2 py-1.5 text-left">Aprovado</th>
              <th className="px-2 py-1.5 text-right">Valor</th>
              <th className="px-2 py-1.5 text-left">Criado</th>
              <th className="px-2 py-1.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (<tr><td colSpan={8} className="p-3 text-center text-muted-foreground">Carregando…</td></tr>)}
            {!isLoading && data.length === 0 && (<tr><td colSpan={8} className="p-3 text-center text-muted-foreground">Nenhuma cotação. Use o botão “Enviar para compra” na Requisição.</td></tr>)}
            {data.map((c) => (
              <tr key={c.id} className="border-t border-border/60 hover:bg-muted/30">
                <td className="px-2 py-1 font-medium tabular-nums">#{c.numero}</td>
                <td className="px-2 py-1 tabular-nums">REQ-{c.requisicao_numero}</td>
                <td className="px-2 py-1"><StatusBadge s={c.status} /></td>
                <td className="px-2 py-1 tabular-nums">{c.qtd_fornecedores}</td>
                <td className="px-2 py-1 truncate max-w-[180px]">{c.fornecedor_aprovado_nome ?? "—"}</td>
                <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(Number(c.valor_total ?? 0))}</td>
                <td className="px-2 py-1 tabular-nums">{fmtDate(c.criado_em)}</td>
                <td className="px-2 py-1">
                  <RowActions
                    onView={() => setOpenId(c.id)}
                    extra={[
                      ...(c.status === "RASCUNHO" ? [{ key: "enviar", label: "Enviar", icon: "send" as const, onClick: () => onEnviar(c), tone: "blue" as const }] : []),
                      ...(c.status === "APROVADA" ? [{ key: "pedido", label: "Gerar pedido", icon: "send" as const, onClick: () => onGerarPedido(c), tone: "green" as const }] : []),
                      ...(c.status !== "CANCELADA" && c.status !== "REPROVADA" ? [{ key: "cancelar", label: "Cancelar", icon: "x" as const, onClick: () => onCancelar(c), tone: "red" as const }] : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <CotacaoDetailDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
