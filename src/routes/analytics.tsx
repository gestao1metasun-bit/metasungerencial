import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTabFromHash } from "@/lib/route-tabs";
import { useLancamentos, useRecorrentes, fmtBRLPrecise, type Lancamento } from "@/lib/financeiro-store";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Meta Sun Gerencial" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [tab, setTab] = useTabFromHash("/analytics");
  const [lancs] = useLancamentos();
  const [recs] = useRecorrentes();
  const fixasMensais = recs.filter((r) => r.ativa && r.recorrencia === "Mensal").reduce((s, r) => s + r.valor, 0);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Indicadores financeiros consolidados — DRE, margens e desempenho operacional."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="mt-5">
          <DRETab lancs={lancs} fixas={fixasMensais} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function DRETab({ lancs, fixas }: { lancs: Lancamento[]; fixas: number }) {
  const receitas = lancs.filter((l) => l.tipo === "Entrada" && (l.camada === "Realizado" || l.camada === "Confirmado")).reduce((s, l) => s + l.valor, 0);
  const custoObras = lancs.filter((l) => l.obra && l.tipo === "Saída").reduce((s, l) => s + l.valor, 0);
  const despAdmin = lancs.filter((l) => !l.obra && l.tipo === "Saída").reduce((s, l) => s + l.valor, 0) + fixas;
  const impostos = receitas * 0.12;
  const liquida = receitas - impostos;
  const bruto = liquida - custoObras;
  const operacional = bruto - despAdmin;

  const rows = [
    { label: "Receita Bruta", valor: receitas, tone: "text-success" },
    { label: "(–) Impostos sobre vendas (12%)", valor: -impostos, tone: "text-destructive" },
    { label: "Receita Líquida", valor: liquida, tone: "font-semibold" },
    { label: "(–) Custos de obras", valor: -custoObras, tone: "text-destructive" },
    { label: "Lucro Bruto", valor: bruto, tone: "font-semibold" },
    { label: "(–) Despesas administrativas + fixas", valor: -despAdmin, tone: "text-destructive" },
    { label: "Resultado Operacional", valor: operacional, tone: "text-lg font-bold text-primary" },
  ];

  return (
    <Card className="bg-[image:var(--gradient-card)] p-6">
      <h2 className="text-lg font-semibold">DRE Gerencial</h2>
      <p className="mt-1 text-sm text-muted-foreground">Calculado a partir dos lançamentos realizados/confirmados + despesas fixas.</p>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-border pb-2 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={r.tone}>{fmtBRLPrecise(r.valor)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
