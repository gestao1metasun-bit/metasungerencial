import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { AuditoriaCoberturaCard } from "@/components/app/governanca/AuditoriaCoberturaCard";
import { ReconciliacaoCard } from "@/components/app/governanca/ReconciliacaoCard";

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

        <Card className="p-8 text-center text-sm text-muted-foreground">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          KPIs consolidados serão exibidos aqui. Use o ribbon acima para navegar
          entre Comercial, Financeiro, Engenharia, Estoque, Financiamentos,
          Aprovações e Pós-venda.
        </Card>
      </div>
    </>
  );
}
