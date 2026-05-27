import { createFileRoute } from "@tanstack/react-router";
import { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
import {
  AnalyticsSectorShell, AnalyticsSectorPendingBanner,
} from "@/components/app/analytics/AnalyticsSectorShell";

export const Route = createFileRoute("/analytics/estoque")({
  head: () => ({ meta: [{ title: "Analytics · Estoque — Meta Sun Gerencial" }] }),
  component: AnalyticsEstoquePage,
});

function AnalyticsEstoquePage() {
  return (
    <AnalyticsSectorShell
      title="Analytics · Estoque"
      subtitle="Saldo, reservado, disponível, trânsito, compras, consumo, críticos, curva ABC, entregas, divergências."
    >
      <EnterpriseToolbar title="Setor estoque" hint="ribbon · categoria · obra · período" />
      <div className="mt-3">
        <AnalyticsSectorPendingBanner
          onda="D12.5"
          descricao="Saldo total, reservado, disponível, em trânsito, compras, consumo, materiais críticos, curva ABC futura, itens mais usados, perdas, entregas, inventário, divergências e rastreabilidade — sempre consequência de movimentação oficial."
          fontes={["v_estoque_saldo", "v_estoque_reservado", "v_estoque_transito", "v_estoque_curva_abc", "estoque_movimentos", "estoque_reservas"]}
        />
      </div>
    </AnalyticsSectorShell>
  );
}
