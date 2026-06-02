/**
 * D20.SUP.3 — Aba Materiais dentro da O.S.
 *
 * Lê v_os_requisicoes_resumo (security_invoker) e mostra requisições
 * vinculadas com itens solicitados/reservados/entregues/devolvidos +
 * custo material acumulado (já refletido em os_custos_realizados via
 * rpc_os_baixar_material).
 */
import { Boxes, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useOsRequisicoes, STATUS_LABEL, STATUS_TONE, type SupReqStatus } from "@/lib/repositories/suprimentos-requisicoes-repo";
import { RequisicaoDetailDialog } from "@/modules/suprimentos/RequisicaoDetailDialog";

const TONE: Record<string, string> = {
  muted: "bg-muted text-muted-foreground border-border",
  info: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
  warning: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
  success: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
  danger: "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300",
  primary: "bg-primary/10 text-primary border-primary/30",
};

const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function MateriaisTab({ osId }: { osId: string }) {
  const { data, isLoading } = useOsRequisicoes(osId);
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-8 text-[12px] text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando requisições…
    </div>;
  }

  const rows = data ?? [];
  const totalCusto = rows.reduce((acc, r) => acc + Number(r.custo_material_total ?? 0), 0);
  const totalAprov = rows.reduce((acc, r) => acc + Number(r.total_aprovado ?? 0), 0);
  const totalEntreg = rows.reduce((acc, r) => acc + Number(r.total_entregue ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-2.5">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Requisições</div>
          <div className="text-[16px] font-semibold tabular-nums">{rows.length}</div>
        </Card>
        <Card className="p-2.5">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Qtd aprovada</div>
          <div className="text-[16px] font-semibold tabular-nums">{fmt(totalAprov)}</div>
        </Card>
        <Card className="p-2.5">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Qtd entregue</div>
          <div className="text-[16px] font-semibold tabular-nums">{fmt(totalEntreg)}</div>
        </Card>
        <Card className="p-2.5">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Custo material</div>
          <div className="text-[16px] font-semibold tabular-nums">R$ {fmt(totalCusto)}</div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-[12px] text-muted-foreground">
            <Boxes className="h-6 w-6 mx-auto mb-2 opacity-50" />
            Nenhuma requisição de material vinculada a esta O.S.
          </div>
        ) : (
          <table className="w-full text-[11.5px]">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="border-b">
                <th className="text-left px-2 py-1.5">Nº</th>
                <th className="text-left px-2 py-1.5">Tipo</th>
                <th className="text-left px-2 py-1.5">Status</th>
                <th className="text-right px-2 py-1.5">Itens</th>
                <th className="text-right px-2 py-1.5">Solicit.</th>
                <th className="text-right px-2 py-1.5">Aprov.</th>
                <th className="text-right px-2 py-1.5">Reserv.</th>
                <th className="text-right px-2 py-1.5">Entreg.</th>
                <th className="text-right px-2 py-1.5">Devolv.</th>
                <th className="text-right px-2 py-1.5">Custo</th>
                <th className="text-center px-2 py-1.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tone = STATUS_TONE[r.status as SupReqStatus];
                return (
                  <tr key={r.requisicao_id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-2 py-1.5 tabular-nums font-mono">#{r.numero}</td>
                    <td className="px-2 py-1.5">{r.tipo}</td>
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className={`text-[10.5px] ${TONE[tone]}`}>
                        {STATUS_LABEL[r.status as SupReqStatus]}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.qtd_itens}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(r.total_solicitado)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(r.total_aprovado)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(r.total_reservado)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(r.total_entregue)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(r.total_devolvido)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold">R$ {fmt(r.custo_material_total)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10.5px]"
                        onClick={() => setOpenId(r.requisicao_id)}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div className="text-[10.5px] text-muted-foreground">
        Custos refletem o que já foi baixado de estoque para a O.S. (origem = ESTOQUE) e impactam o Orçado x Realizado automaticamente.
      </div>

      <RequisicaoDetailDialog
        id={openId}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </div>
  );
}
