import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/paineis/estoque")({
  head: () => ({ meta: [{ title: "Painel Estoque — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/paineis/estoque"
      title="Painel Estoque"
      subtitle="Saldo, reservas, entregas, estoque baixo e custo."
      legacyHref="/estoque"
      legacyLabel="Operação Estoque"
    />
  ),
});
