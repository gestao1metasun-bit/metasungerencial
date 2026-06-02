/**
 * D20.SUP.4 — Recebimentos.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnterpriseRecordToolbar, RowActions } from "@/components/app/enterprise";
import {
  useRecebimentosLista, useConfirmarRecebimento,
  REC_LABEL, REC_STATUS_OPTIONS, type SupRecStatus, type RecebimentoListaRow,
} from "@/lib/repositories/suprimentos-compras-repo";
import { RecebimentoDetailDialog } from "./RecebimentoDetailDialog";

const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

function StatusBadge({ s }: { s: SupRecStatus }) {
  const tone: Record<SupRecStatus, string> = {
    RASCUNHO: "bg-muted text-muted-foreground",
    CONFIRMADO: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    CANCELADO: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300",
  };
  return <Badge variant="outline" className={`text-[10.5px] px-1.5 py-0 ${tone[s]}`}>{REC_LABEL[s]}</Badge>;
}

export function RecebimentosTab() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupRecStatus | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data = [], isLoading, refetch } = useRecebimentosLista({ search, status: status || null });
  const confirmar = useConfirmarRecebimento();

  async function onConfirmar(r: RecebimentoListaRow) {
    try { await confirmar.mutateAsync({ p_id: r.id }); toast.success(`Recebimento #${r.numero} confirmado`); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-2">
      <EnterpriseRecordToolbar
        searchPlaceholder="Buscar recebimento ou documento…"
        searchValue={search}
        onSearchChange={setSearch}
        onReload={() => refetch()}
        actions={[
          { kind: "filter", label: "Filtros", element: (
            <Select value={status || undefined} onValueChange={(v) => setStatus((v as SupRecStatus) || "")}>
              <SelectTrigger className="h-7 w-[150px] text-[11.5px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {REC_STATUS_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
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
              <th className="px-2 py-1.5 text-left">Pedido</th>
              <th className="px-2 py-1.5 text-left">Documento</th>
              <th className="px-2 py-1.5 text-left">Data</th>
              <th className="px-2 py-1.5 text-left">Status</th>
              <th className="px-2 py-1.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (<tr><td colSpan={6} className="p-3 text-center text-muted-foreground">Carregando…</td></tr>)}
            {!isLoading && data.length === 0 && (<tr><td colSpan={6} className="p-3 text-center text-muted-foreground">Nenhum recebimento. Abra um Pedido enviado para registrar.</td></tr>)}
            {data.map((r) => (
              <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                <td className="px-2 py-1 font-medium tabular-nums">#{r.numero}</td>
                <td className="px-2 py-1 tabular-nums">PED-{r.pedido_numero}</td>
                <td className="px-2 py-1 truncate max-w-[200px]">{r.documento ?? "—"}</td>
                <td className="px-2 py-1 tabular-nums">{fmtDate(r.data_recebimento)}</td>
                <td className="px-2 py-1"><StatusBadge s={r.status} /></td>
                <td className="px-2 py-1">
                  <RowActions
                    onView={() => setOpenId(r.id)}
                    extra={[
                      ...(r.status === "RASCUNHO" ? [{ key: "confirmar", label: "Confirmar", icon: "send" as const, onClick: () => onConfirmar(r), tone: "green" as const }] : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <RecebimentoDetailDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
