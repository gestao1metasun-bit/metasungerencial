import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/paineis/posvenda")({
  head: () => ({ meta: [{ title: "Painel Pós-venda — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/paineis/posvenda"
      title="Painel Pós-venda"
      subtitle="Chamados, garantias, SLA e recorrências."
      legacyHref="/posvenda"
      legacyLabel="Operação Pós-venda"
    />
  ),
});
