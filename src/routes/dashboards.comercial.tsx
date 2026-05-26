import { createFileRoute } from "@tanstack/react-router";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/dashboards/comercial")({
  head: () => ({ meta: [{ title: "Dashboard Comercial — Meta Sun Gerencial" }] }),
  component: () => (
    <DashboardShellStub
      routePath="/dashboards/comercial"
      title="Dashboard Comercial"
      subtitle="Funil, contratos, propostas, vendedores e conversão."
      legacyHref="/comercial"
      legacyLabel="Operação Comercial"
    />
  ),
});
