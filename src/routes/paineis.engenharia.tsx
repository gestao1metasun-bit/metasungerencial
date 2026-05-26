import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/paineis/engenharia")({
  head: () => ({ meta: [{ title: "Painel Engenharia — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/paineis/engenharia"
      title="Painel Engenharia"
      subtitle="Obras, cronograma, produtividade, custos e pendências."
      legacyHref="/engenharia"
      legacyLabel="Operação Engenharia"
    />
  ),
});
