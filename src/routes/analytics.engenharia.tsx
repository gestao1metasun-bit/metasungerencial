import { createFileRoute } from "@tanstack/react-router";
import { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
import {
  AnalyticsSectorShell, AnalyticsSectorPendingBanner,
} from "@/components/app/analytics/AnalyticsSectorShell";

export const Route = createFileRoute("/analytics/engenharia")({
  head: () => ({ meta: [{ title: "Analytics · Engenharia — Meta Sun Gerencial" }] }),
  component: AnalyticsEngenhariaPage,
});

function AnalyticsEngenhariaPage() {
  return (
    <AnalyticsSectorShell
      title="Analytics · Engenharia"
      subtitle="Obras ativas/executando/standby/atrasadas, produtividade, prazo médio, custo previsto × realizado, gargalos."
    >
      <EnterpriseToolbar title="Setor engenharia" hint="ribbon · equipe · status · período" />
      <div className="mt-3">
        <AnalyticsSectorPendingBanner
          onda="D12.4"
          descricao="Obras ativas, executando, standby, atrasadas, produtividade da equipe, média de instalação, obras por equipe, prazo médio, cronograma, gargalos, materiais pendentes, custo previsto × realizado. Drill-down: linha → /engenharia filtrado."
          fontes={["v_obras_metricas_reais", "v_origem_estoque", "v_origem_financeiro", "obras", "use-eng-metricas"]}
        />
      </div>
    </AnalyticsSectorShell>
  );
}
