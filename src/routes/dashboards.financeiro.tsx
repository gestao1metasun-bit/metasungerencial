import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/dashboards/financeiro")({
  head: () => ({ meta: [{ title: "Dashboard Financeiro — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/dashboards/financeiro"
      title="Dashboard Financeiro"
      subtitle="Fluxo de caixa, títulos, inadimplência e resultado operacional."
      legacyHref="/financeiro"
      legacyLabel="Operação Financeira"
    />
  ),
});
