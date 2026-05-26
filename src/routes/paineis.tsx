import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { AuditoriaCoberturaCard } from "@/components/app/governanca/AuditoriaCoberturaCard";
import { DashboardShellStub } from "@/components/app/dashboards/DashboardShellStub";

export const Route = createFileRoute("/paineis")({
  head: () => ({ meta: [{ title: "Painéis — Meta Sun Gerencial" }] }),
  component: PaineisHome,
});

function PaineisHome() {
  return (
    <>
      <PageHeader
        title="Painéis"
        subtitle="Centralização de KPIs, governança e visões gerenciais de todas as áreas."
      />
      <div className="space-y-4">
        <AuditoriaCoberturaCard />
        <DashboardShellStub
          routePath="/paineis"
          title=""
          subtitle=""
          legacyHref="/dashboard"
          legacyLabel="Dashboard Geral (legado)"
        />
      </div>
    </>
  );
}
