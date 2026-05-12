import { createFileRoute } from "@tanstack/react-router";
import {
  FileText, CheckCircle2, Clock, XCircle, DollarSign, Banknote,
  HardHat, TrendingUp, ArrowDownCircle, ArrowUpCircle, Wallet,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contratos, evolucaoMensal, receitaDespesa, financiamentos, obras, vendedores, fmtBRL } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Geral — Meta Sun Gerencial" }] }),
  component: DashboardGeral,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function DashboardGeral() {
  const total = contratos.length;
  const assinados = contratos.filter((c) => c.status === "Assinado").length;
  const pendentes = contratos.filter((c) => c.status === "Pendente").length;
  const cancelados = contratos.filter((c) => c.status === "Cancelado").length;
  const valorVendido = contratos.filter((c) => c.status === "Assinado").reduce((s, c) => s + c.valor, 0);
  const valorFinanciado = financiamentos.reduce((s, f) => s + f.valorFinanciado, 0);
  const obrasAtivas = obras.filter((o) => o.status !== "Finalizado").length;
  const ticketMedio = valorVendido / Math.max(assinados, 1);
  const receitas = receitaDespesa.reduce((s, r) => s + r.receita, 0);
  const despesas = receitaDespesa.reduce((s, r) => s + r.despesa, 0);

  const statusData = [
    { name: "Assinado", value: assinados },
    { name: "Pendente", value: pendentes },
    { name: "Gerado", value: contratos.filter((c) => c.status === "Gerado").length },
    { name: "Cancelado", value: cancelados },
  ];

  const vendedoresData = vendedores.map((v) => ({ nome: v.nome.split(" ")[0], vendido: v.vendido }));

  return (
    <>
      <PageHeader
        title="Dashboard Geral"
        subtitle="Visão consolidada de todos os módulos."
        actions={
          <>
            <Select defaultValue="mes">
              <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Este mês</SelectItem>
                <SelectItem value="trim">Trimestre</SelectItem>
                <SelectItem value="ano">Ano</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Contratos" value={total} icon={FileText} tone="primary" hint={`${assinados} assinados`} />
        <StatCard label="Assinados" value={assinados} icon={CheckCircle2} tone="success" trend={{ value: "+12% mês", positive: true }} />
        <StatCard label="Pendentes" value={pendentes} icon={Clock} tone="warning" />
        <StatCard label="Cancelados" value={cancelados} icon={XCircle} tone="destructive" />
        <StatCard label="Valor vendido" value={fmtBRL(valorVendido)} icon={DollarSign} tone="primary" />
        <StatCard label="Total financiado" value={fmtBRL(valorFinanciado)} icon={Banknote} tone="info" />
        <StatCard label="Obras em andamento" value={obrasAtivas} icon={HardHat} tone="info" />
        <StatCard label="Ticket médio" value={fmtBRL(ticketMedio)} icon={TrendingUp} tone="primary" />
        <StatCard label="Receitas" value={fmtBRL(receitas)} icon={ArrowDownCircle} tone="success" />
        <StatCard label="Despesas" value={fmtBRL(despesas)} icon={ArrowUpCircle} tone="destructive" />
        <StatCard label="Resultado" value={fmtBRL(receitas - despesas)} icon={Wallet} tone="success" trend={{ value: "+18%", positive: true }} />
        <StatCard label="kWp vendido" value={contratos.reduce((s, c) => s + c.kwp, 0).toFixed(1)} icon={TrendingUp} tone="warning" hint="kWp totais" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Evolução mensal</div>
              <div className="text-xs text-muted-foreground">Contratos x Vendido x Financiado</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolucaoMensal}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="vendido" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="financiado" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-4 text-sm font-semibold">Receita x Despesa</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={receitaDespesa}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesa" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-4 text-sm font-semibold">Contratos por status</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-4 text-sm font-semibold">Vendido por vendedor</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vendedoresData} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis type="category" dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} width={80} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="vendido" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}
