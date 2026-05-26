import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/dashboards")({
  head: () => ({ meta: [{ title: "Dashboards — Meta Sun Gerencial" }] }),
  component: DashboardsIndex,
});

function DashboardsIndex() {
  return (
    <DashboardShellStub
      routePath="/dashboards"
      title="Dashboards"
      subtitle="Centralização de KPIs e visões gerenciais de todas as áreas."
      legacyHref="/dashboard"
      legacyLabel="Dashboard Geral (legado)"
    />
  );
}
