import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Inbox, ShieldCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/aprovacoes")({
  head: () => ({
    meta: [
      { title: "Central de Aprovações — Meta Sun" },
      { name: "description", content: "Fila corporativa de aprovações por alçada (compra, material, desconto)." },
    ],
  }),
  component: AprovacoesPage,
});

function AprovacoesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Workflow Corporativo"
        title="Central de Aprovações"
        subtitle="Fila única de solicitações por alçada — compras, materiais e descontos. Integração D5.2/D5.3 em breve."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Inbox, label: "Pendentes para mim", value: "—", hint: "Aguardando workflow engine" },
          { icon: ClipboardCheck, label: "Aprovadas hoje", value: "—", hint: "Histórico do dia" },
          { icon: Clock, label: "SLA em risco", value: "—", hint: "Próximas a expirar" },
          { icon: ShieldCheck, label: "Minhas alçadas", value: "—", hint: "Configuração ativa" },
        ].map((c) => (
          <Card key={c.label} className="border-border/70">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{c.value}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{c.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Fila de aprovações</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          A fila operacional será conectada nas próximas ondas (D5.2 — Solicitação de Material;
          D5.3 — Solicitação de Compra). O engine genérico (D5.1) já está provisionado:
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">workflow_aprovacoes</code>,
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">workflow_alcadas</code>,
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">workflow_aprovacoes_historico</code>.
        </CardContent>
      </Card>
    </div>
  );
}
