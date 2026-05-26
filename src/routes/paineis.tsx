import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/paineis")({
  head: () => ({ meta: [{ title: "Painéis — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/paineis"
      title="Painéis"
      subtitle="Centralização de KPIs e visões gerenciais de todas as áreas."
      legacyHref="/dashboard"
      legacyLabel="Dashboard Geral (legado)"
    />
  ),
});
