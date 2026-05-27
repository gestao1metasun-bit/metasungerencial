import { createFileRoute } from "@tanstack/react-router";
import { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
import {
  AnalyticsSectorShell, AnalyticsSectorPendingBanner,
} from "@/components/app/analytics/AnalyticsSectorShell";

export const Route = createFileRoute("/analytics/financiamentos")({
  head: () => ({ meta: [{ title: "Analytics · Financiamentos — Meta Sun Gerencial" }] }),
  component: AnalyticsFinanciamentosPage,
});

function AnalyticsFinanciamentosPage() {
  return (
    <AnalyticsSectorShell
      title="Analytics · Financiamentos"
      subtitle="Total financiado, banco, gerente, liberados/pendentes/cancelados, ticket, prazo médio, tempo de liberação."
    >
      <EnterpriseToolbar title="Setor financiamentos" hint="ribbon · banco · gerente · status · prazo" />
      <div className="mt-3">
        <AnalyticsSectorPendingBanner
          onda="D12.3"
          descricao="Total financiado, por banco (BASA × SICREDI × outros), por gerente, operações liberadas / pendentes / canceladas, ticket de financiamento, prazo médio, tempo médio de liberação, previsão de recebimento e ranking de bancos."
          fontes={["v_analytics_financiamentos", "contratos (financiamento_*)", "movimentacoes_financeiras"]}
        />
      </div>
    </AnalyticsSectorShell>
  );
}
