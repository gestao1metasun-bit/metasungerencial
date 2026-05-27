import { createFileRoute } from "@tanstack/react-router";
import { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
import {
  AnalyticsSectorShell, AnalyticsSectorPendingBanner,
} from "@/components/app/analytics/AnalyticsSectorShell";

export const Route = createFileRoute("/analytics/aprovacoes")({
  head: () => ({ meta: [{ title: "Analytics · Aprovações — Meta Sun Gerencial" }] }),
  component: AnalyticsAprovacoesPage,
});

function AnalyticsAprovacoesPage() {
  return (
    <AnalyticsSectorShell
      title="Analytics · Aprovações"
      subtitle="Pendentes, SLA vencido, tempo médio, por setor, por aprovador, gargalos da fila operacional."
    >
      <EnterpriseToolbar title="Setor aprovações" hint="ribbon · setor · aprovador · SLA" />
      <div className="mt-3">
        <AnalyticsSectorPendingBanner
          onda="D12.6"
          descricao="Aprovações pendentes, SLA vencido, tempo médio de aprovação, por setor, por aprovador, gargalos, workflow e fila operacional — drill-down para /aprovacoes filtrado."
          fontes={["workflow_aprovacoes", "workflow_aprovacoes_historico", "workflow_alcadas"]}
        />
      </div>
    </AnalyticsSectorShell>
  );
}
