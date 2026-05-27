import { createFileRoute } from "@tanstack/react-router";
import { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
import {
  AnalyticsSectorShell, AnalyticsSectorPendingBanner,
} from "@/components/app/analytics/AnalyticsSectorShell";

export const Route = createFileRoute("/analytics/posvenda")({
  head: () => ({ meta: [{ title: "Analytics · Pós-venda — Meta Sun Gerencial" }] }),
  component: AnalyticsPosvendaPage,
});

function AnalyticsPosvendaPage() {
  return (
    <AnalyticsSectorShell
      title="Analytics · Pós-venda"
      subtitle="Chamados, SLA, satisfação, recorrências, volume por consultor e por equipe."
    >
      <EnterpriseToolbar title="Setor pós-venda" hint="ribbon · categoria · consultor · SLA" />
      <div className="mt-3">
        <AnalyticsSectorPendingBanner
          onda="D12.7"
          descricao="Volume de chamados, SLA, satisfação, recorrências, abertos × resolvidos, motivos mais frequentes e ranking por consultor — ligado ao módulo de pós-venda."
          fontes={["posvenda_chamados", "posvenda_store", "v_posvenda_kpis"]}
        />
      </div>
    </AnalyticsSectorShell>
  );
}
