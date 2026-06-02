/**
 * D21 — Alerta Financeiro: Pedidos prontos para gerar Conta a Pagar.
 *
 * Lê v_sup_pedidos_prontos_financeiro (security_invoker).
 * Não gera título direto desta lista — abre o pedido em /suprimentos para
 * usar a RPC oficial (mesma rotina auditada). Mantém centralização.
 */
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePedidosProntosFinanceiro } from "@/lib/repositories/suprimentos-alcadas-repo";

const fmtBRL = (n: number) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

export function PedidosProntosFinanceiroCard() {
  const { data, isLoading } = usePedidosProntosFinanceiro();
  const navigate = useNavigate();

  if (isLoading) return null;
  const list = data ?? [];
  if (list.length === 0) return null;

  const total = list.reduce((s, p) => s + Number(p.valor ?? 0), 0);

  return (
    <Card className="p-3 mb-3 border-emerald-300 bg-emerald-50/60">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-emerald-900">
          <Bell className="h-4 w-4" />
          <span className="text-[12.5px] font-semibold">
            Pedidos prontos para Conta a Pagar
          </span>
          <Badge variant="outline" className="text-[10.5px] border-emerald-400 text-emerald-800 bg-white">
            {list.length} pedido(s) · {fmtBRL(total)}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11.5px]"
          onClick={() => navigate({ to: "/suprimentos", hash: "tab=pedidos" })}
        >
          Abrir Suprimentos
        </Button>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-[12px]">
          <thead className="bg-muted/40 text-[10.5px] uppercase">
            <tr>
              <th className="px-2 py-1 text-left">Pedido</th>
              <th className="px-2 py-1 text-left">Fornecedor</th>
              <th className="px-2 py-1 text-right">Valor</th>
              <th className="px-2 py-1 text-left">Vencimento</th>
              <th className="px-2 py-1 text-left">Natureza</th>
              <th className="px-2 py-1 text-left">CC / CR</th>
              <th className="px-2 py-1 text-left">O.S. / Obra</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.pedido_id} className="border-t">
                <td className="px-2 py-1 font-medium">#{p.pedido_numero}</td>
                <td className="px-2 py-1">{p.fornecedor_nome ?? "—"}</td>
                <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(Number(p.valor))}</td>
                <td className="px-2 py-1">{fmtDate(p.vencimento_previsto)}</td>
                <td className="px-2 py-1">{p.natureza_codigo ?? p.natureza_nome ?? "—"}</td>
                <td className="px-2 py-1 text-[11.5px]">
                  {p.cc_codigo ?? "—"} / {p.cr_codigo ?? "—"}
                </td>
                <td className="px-2 py-1 text-[11.5px]">
                  {p.os_id ? "O.S." : p.obra_id ? "Obra" : p.projeto_id ? "Projeto" : "—"}
                </td>
                <td className="px-2 py-1 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10.5px] px-2"
                    onClick={() => navigate({ to: "/suprimentos", hash: "tab=pedidos" })}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Abrir pedido
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10.5px] text-muted-foreground mt-1">
        A geração do título é feita pela RPC oficial dentro de Suprimentos (idempotente). Esta lista
        é apenas o alerta — nenhum título é gerado a partir daqui.
      </p>
    </Card>
  );
}
