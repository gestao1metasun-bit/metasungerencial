import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownCircle, ArrowUpCircle, Wallet, Clock, AlertCircle, FileSpreadsheet,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, Legend,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { receitaDespesa, contasReceber, contasPagar, fmtBRL } from "@/lib/mock-data";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Meta Sun Gerencial" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const receitas = receitaDespesa.reduce((s, r) => s + r.receita, 0);
  const despesas = receitaDespesa.reduce((s, r) => s + r.despesa, 0);
  const aReceber = contasReceber.filter((c) => c.status === "A receber").reduce((s, c) => s + c.valor, 0);
  const aPagar = contasPagar.filter((c) => c.status === "A pagar").reduce((s, c) => s + c.valor, 0);
  const vencidos = contasPagar.filter((c) => c.status === "Vencido").reduce((s, c) => s + c.valor, 0);

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Estrutura inicial — dados fictícios. Pronto para integração futura (Sheets, CSV, APIs)."
        actions={<Button variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" /> Importar dados</Button>}
      />

      <Tabs defaultValue="dashboard">
        <TabsList className="bg-card border border-border flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="receber">Contas a receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a pagar</TabsTrigger>
          <TabsTrigger value="dre">DRE Gerencial</TabsTrigger>
          <TabsTrigger value="import">Importações</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-4">
            <StatCard label="Receita mensal" value={fmtBRL(receitas / 5)} icon={ArrowDownCircle} tone="success" />
            <StatCard label="Despesa mensal" value={fmtBRL(despesas / 5)} icon={ArrowUpCircle} tone="destructive" />
            <StatCard label="Resultado" value={fmtBRL((receitas - despesas) / 5)} icon={Wallet} tone="primary" trend={{ value: "+22%", positive: true }} />
            <StatCard label="Faturamento acumulado" value={fmtBRL(receitas)} icon={TrendingUp} tone="info" />
            <StatCard label="A receber" value={fmtBRL(aReceber)} icon={Clock} tone="info" />
            <StatCard label="A pagar" value={fmtBRL(aPagar)} icon={Clock} tone="warning" />
            <StatCard label="Vencidos" value={fmtBRL(vencidos)} icon={AlertCircle} tone="destructive" />
            <StatCard label="Projeção mensal" value={fmtBRL(580000)} icon={TrendingUp} tone="primary" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card className="p-5 bg-[image:var(--gradient-card)]">
              <div className="mb-3 text-sm font-semibold">Receita x Despesa</div>
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
              <div className="mb-3 text-sm font-semibold">Fluxo de caixa</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={receitaDespesa.map((r) => ({ mes: r.mes, saldo: r.receita - r.despesa }))}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="saldo" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="receber" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)]">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead>ID</TableHead><TableHead>Descrição</TableHead><TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {contasReceber.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
                    <TableCell className="font-medium">{c.descricao}</TableCell>
                    <TableCell className="text-muted-foreground">{c.cliente}</TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(c.valor)}</TableCell>
                    <TableCell className="text-muted-foreground">{c.vencimento}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pagar" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)]">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead>ID</TableHead><TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {contasPagar.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
                    <TableCell className="font-medium">{c.descricao}</TableCell>
                    <TableCell className="text-muted-foreground">{c.fornecedor}</TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(c.valor)}</TableCell>
                    <TableCell className="text-muted-foreground">{c.vencimento}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="dre" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-6">
            <h2 className="text-lg font-semibold">DRE Gerencial — Resumido</h2>
            <p className="mt-1 text-sm text-muted-foreground">Período atual</p>
            <div className="mt-6 space-y-3">
              {[
                { label: "Receita Bruta", valor: receitas, tone: "text-success" },
                { label: "(–) Impostos sobre vendas", valor: -receitas * 0.12, tone: "text-destructive" },
                { label: "Receita Líquida", valor: receitas * 0.88, tone: "font-semibold" },
                { label: "(–) Custos operacionais", valor: -despesas * 0.6, tone: "text-destructive" },
                { label: "Lucro Bruto", valor: receitas * 0.88 - despesas * 0.6, tone: "font-semibold" },
                { label: "(–) Despesas administrativas", valor: -despesas * 0.4, tone: "text-destructive" },
                { label: "Resultado Operacional", valor: receitas * 0.88 - despesas, tone: "text-lg font-bold text-primary" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={row.tone}>{fmtBRL(row.valor)}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="receitas" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-5">
            <div className="mb-3 text-sm font-semibold">Receitas por mês</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={receitaDespesa}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="receita" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="despesas" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-5">
            <div className="mb-3 text-sm font-semibold">Despesas por mês</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={receitaDespesa}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="despesa" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-6">
            <h2 className="text-base font-semibold">Importações futuras</h2>
            <p className="mt-1 text-sm text-muted-foreground">O módulo financeiro está preparado para receber dados externos.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                { n: "Google Sheets", d: "Sincronizar planilhas operacionais" },
                { n: "Arquivo CSV", d: "Upload de extrato bancário" },
                { n: "Excel (.xlsx)", d: "Lançamentos em lote" },
                { n: "API Bancária (Open Finance)", d: "Conciliação automática" },
              ].map((i) => (
                <div key={i.n} className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-4">
                  <div>
                    <div className="font-medium">{i.n}</div>
                    <div className="text-xs text-muted-foreground">{i.d}</div>
                  </div>
                  <Button variant="outline" size="sm"><FileSpreadsheet className="mr-2 h-4 w-4" /> Conectar</Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
