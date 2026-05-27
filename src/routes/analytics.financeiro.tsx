import { createFileRoute } from "@tanstack/react-router";
import { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
import {
  AnalyticsSectorShell, AnalyticsSectorPendingBanner,
} from "@/components/app/analytics/AnalyticsSectorShell";

export const Route = createFileRoute("/analytics/financeiro")({
  head: () => ({ meta: [{ title: "Analytics · Financeiro — Meta Sun Gerencial" }] }),
  component: AnalyticsFinanceiroPage,
});

function AnalyticsFinanceiroPage() {
  return (
    <AnalyticsSectorShell
      title="Analytics · Financeiro"
      subtitle="AP/AR, vencidos, fluxo 30/60/90, inadimplência, realizado × previsto, DRE resumido, CR, natureza e conta."
    >
      <EnterpriseToolbar title="Setor financeiro" hint="ribbon · período · status · CR · natureza · conta" />
      <div className="mt-3">
        <AnalyticsSectorPendingBanner
          onda="D12.2"
          descricao="Total a pagar/receber, vencidos, fluxo 30/60/90, previsão de recebimento, inadimplência, realizado×previsto, DRE resumido, maiores despesas/receitas, saldo de caixa, comparativo mensal e drill-down para /financeiro-titulos."
          fontes={["v_hardening_report", "v_titulos_*", "vw_fluxo_caixa_real", "v_analytics_financeiro_kpis", "v_dre_gerencial"]}
        />
      </div>
    </AnalyticsSectorShell>
  );
}
