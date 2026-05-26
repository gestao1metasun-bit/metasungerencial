import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/dashboards/engenharia")({
  head: () => ({ meta: [{ title: "Dashboard Engenharia — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/dashboards/engenharia"
      title="Dashboard Engenharia"
      subtitle="Obras, cronograma, produtividade, custos e pendências."
      legacyHref="/engenharia"
      legacyLabel="Operação Engenharia"
    />
  ),
});
