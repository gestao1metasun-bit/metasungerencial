import { createFileRoute } from "@tanstack/react-router";
import { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
import {
  AnalyticsSectorShell, AnalyticsSectorPendingBanner,
} from "@/components/app/analytics/AnalyticsSectorShell";

export const Route = createFileRoute("/analytics/comercial")({
  head: () => ({ meta: [{ title: "Analytics · Comercial — Meta Sun Gerencial" }] }),
  component: AnalyticsComercialPage,
});

function AnalyticsComercialPage() {
  return (
    <AnalyticsSectorShell
      title="Analytics · Comercial"
      subtitle="Contratos, vendedores, conversão, funil, ticket médio e evolução comercial reconciliada."
    >
      <EnterpriseToolbar title="Setor comercial" hint="ribbon · período · filtros · ranking · drill-down" />
      <div className="mt-3">
        <AnalyticsSectorPendingBanner
          onda="D12.1"
          descricao="Contratos gerados/assinados/pendentes/cancelados, valor vendido, ticket médio (geral e por vendedor), kWp/kWh, conversão, tempo médio de assinatura, ranking e funil — todos com 👁 drill-down para a base de contratos."
          fontes={["v_analytics_comercial_kpis", "v_ranking_vendedores", "v_funil_comercial", "contratos", "leads"]}
        />
      </div>
    </AnalyticsSectorShell>
  );
}
