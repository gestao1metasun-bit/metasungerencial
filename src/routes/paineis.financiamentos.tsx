import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/paineis/financiamentos")({
  head: () => ({ meta: [{ title: "Painel Financiamentos — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/paineis/financiamentos"
      title="Painel Financiamentos"
      subtitle="Carteira, bancos, liberações, prazos e pendências."
      legacyHref="/financiamentos"
      legacyLabel="Operação Financiamentos"
    />
  ),
});
