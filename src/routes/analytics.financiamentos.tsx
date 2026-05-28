import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/analytics/financiamentos")({
  head: () => ({ meta: [{ title: "Painel Financiamentos — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/analytics/financiamentos"
      title="Painel Financiamentos"
      subtitle="Carteira, bancos, liberações, prazos e pendências."
      legacyHref="/financiamentos"
      legacyLabel="Operação Financiamentos"
    />
  ),
});
