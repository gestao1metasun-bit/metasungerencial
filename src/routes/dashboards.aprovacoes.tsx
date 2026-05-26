import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/dashboards/aprovacoes")({
  head: () => ({ meta: [{ title: "Dashboard Aprovações — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/dashboards/aprovacoes"
      title="Dashboard Aprovações"
      subtitle="SLA, gargalos, pendências, por setor e por aprovador."
      legacyHref="/aprovacoes"
      legacyLabel="Central de Aprovações"
    />
  ),
});
