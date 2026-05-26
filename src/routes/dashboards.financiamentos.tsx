import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/dashboards/financiamentos")({
  head: () => ({ meta: [{ title: "Dashboard Financiamentos — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/dashboards/financiamentos"
      title="Dashboard Financiamentos"
      subtitle="Carteira, bancos, liberações, prazos e pendências."
      legacyHref="/financiamentos"
      legacyLabel="Operação Financiamentos"
    />
  ),
});
