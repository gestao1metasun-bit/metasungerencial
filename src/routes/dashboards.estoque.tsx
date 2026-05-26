import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/dashboards/estoque")({
  head: () => ({ meta: [{ title: "Dashboard Estoque — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/dashboards/estoque"
      title="Dashboard Estoque"
      subtitle="Saldo, reservas, entregas, estoque baixo e custo."
      legacyHref="/estoque"
      legacyLabel="Operação Estoque"
    />
  ),
});
