import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart, Download, Briefcase, Banknote, HardHat, Wallet, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Meta Sun Gerencial" }] }),
  component: RelatoriosPage,
});

const reports = [
  { id: "rel-com", title: "Relatório Comercial", desc: "Contratos, conversão, vendedores, ticket médio.", icon: Briefcase, tone: "primary" },
  { id: "rel-fin", title: "Relatório de Financiamentos", desc: "Operações por banco, prazos e liberações.", icon: Banknote, tone: "info" },
  { id: "rel-eng", title: "Relatório de Engenharia", desc: "Obras, equipes, produtividade e pendências.", icon: HardHat, tone: "warning" },
  { id: "rel-fnc", title: "Relatório Financeiro", desc: "Receitas, despesas, fluxo de caixa, DRE.", icon: Wallet, tone: "success" },
  { id: "rel-exec", title: "Relatório Executivo Geral", desc: "Visão consolidada para diretoria.", icon: FileBarChart, tone: "primary" },
] as const;

const toneMap: Record<string, string> = {
  primary: "bg-primary/15 text-primary",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
};

function RelatoriosPage() {
  return (
    <>
      <PageHeader title="Relatórios" subtitle="Exporte relatórios consolidados de cada módulo." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className="group bg-[image:var(--gradient-card)] p-5 transition hover:shadow-[var(--shadow-elegant)]">
              <div className={`grid h-11 w-11 place-items-center rounded-lg ${toneMap[r.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{r.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              <div className="mt-5 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1"><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
                <Button size="sm" className="flex-1 bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"><Download className="mr-2 h-4 w-4" /> PDF</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
