import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/analytics/aprovacoes")({
  head: () => ({ meta: [{ title: "Painel Aprovações — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/analytics/aprovacoes"
      title="Painel Aprovações"
      subtitle="SLA, gargalos, pendências, por setor e por aprovador."
      legacyHref="/aprovacoes"
      legacyLabel="Central de Aprovações"
    />
  ),
});
