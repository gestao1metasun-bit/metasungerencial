import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/analytics/financeiro")({
  head: () => ({ meta: [{ title: "Painel Financeiro — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/analytics/financeiro"
      title="Painel Financeiro"
      subtitle="Fluxo de caixa, títulos, inadimplência e resultado operacional."
      legacyHref="/financeiro"
      legacyLabel="Operação Financeira"
    />
  ),
});
