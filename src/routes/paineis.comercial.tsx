import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/paineis/comercial")({
  head: () => ({ meta: [{ title: "Painel Comercial — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/paineis/comercial"
      title="Painel Comercial"
      subtitle="Funil, contratos, propostas, vendedores e conversão."
      legacyHref="/comercial"
      legacyLabel="Operação Comercial"
    />
  ),
});
