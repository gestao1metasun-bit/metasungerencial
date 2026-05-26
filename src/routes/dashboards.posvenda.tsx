import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/dashboards/posvenda")({
  head: () => ({ meta: [{ title: "Dashboard Pós-venda — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/dashboards/posvenda"
      title="Dashboard Pós-venda"
      subtitle="Chamados, garantias, SLA e recorrências."
      legacyHref="/posvenda"
      legacyLabel="Operação Pós-venda"
    />
  ),
});
