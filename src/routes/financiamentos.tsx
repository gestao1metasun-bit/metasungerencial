import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, Search, Pencil, CheckCircle2, Copy, Banknote, Building2,
  TrendingUp, Clock, AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { financiamentos, bancos, fmtBRL } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/financiamentos")({
  head: () => ({ meta: [{ title: "Financiamentos — Meta Sun Gerencial" }] }),
  component: FinanciamentosPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function FinanciamentosPage() {
  return (
    <>
      <PageHeader title="Financiamentos" subtitle="Operações bancárias, prazos e liberações." />
      <Tabs defaultValue="dashboard">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="carteira">Carteira</TabsTrigger>
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
          <TabsTrigger value="finalizados">Finalizados</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5"><DashboardFin /></TabsContent>
        <TabsContent value="carteira" className="mt-5"><Carteira /></TabsContent>
        <TabsContent value="bancos" className="mt-5"><BancosTab /></TabsContent>
        <TabsContent value="finalizados" className="mt-5"><Carteira filterFin /></TabsContent>
      </Tabs>
    </>
  );
}

function DashboardFin() {
  const total = financiamentos.reduce((s, f) => s + f.valorFinanciado, 0);
  const ativos = financiamentos.filter((f) => !["Finalizado", "Cancelado", "Reprovado"].includes(f.statusOp));
  const liberados = financiamentos.filter((f) => f.statusOp === "Liberado").length;
  const finalizados = financiamentos.filter((f) => f.statusOp === "Finalizado").length;
  const previsao = ativos.reduce((s, f) => s + f.valorFinanciado, 0);

  const porBanco = bancos.map((b) => ({ name: b.nome, value: b.total }));
  const porStatus = ["Em análise", "Aprovado", "Aguardando documentação", "Liberado", "Finalizado"].map((s) => ({
    name: s, qtd: financiamentos.filter((f) => f.statusOp === s).length,
  }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Total financiado" value={fmtBRL(total)} icon={Banknote} tone="primary" />
        <StatCard label="Operações ativas" value={ativos.length} icon={TrendingUp} tone="info" />
        <StatCard label="Liberados" value={liberados} icon={CheckCircle2} tone="success" />
        <StatCard label="Finalizados" value={finalizados} icon={CheckCircle2} tone="muted" />
        <StatCard label="Previsão recebimento" value={fmtBRL(previsao)} icon={Clock} tone="warning" />
        {bancos.slice(0, 3).map((b) => (
          <StatCard key={b.id} label={b.nome} value={fmtBRL(b.total)} icon={Building2} tone="info" hint={`${b.operacoes} operações`} />
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-3 text-sm font-semibold">Total por banco</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={porBanco} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} paddingAngle={2}>
                {porBanco.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-3 text-sm font-semibold">Operações por status</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porStatus}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="qtd" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function Carteira({ filterFin = false }: { filterFin?: boolean }) {
  const [q, setQ] = useState("");
  const [banco, setBanco] = useState("todos");
  const list = useMemo(
    () => financiamentos
      .filter((f) => (filterFin ? f.statusOp === "Finalizado" : f.statusOp !== "Finalizado"))
      .filter((f) => banco === "todos" || f.banco === banco)
      .filter((f) => [f.id, f.cliente, f.contrato, f.gerente].some((v) => v.toLowerCase().includes(q.toLowerCase()))),
    [q, banco, filterFin]
  );

  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, contrato ou gerente" className="pl-9 bg-input/60" />
        </div>
        <Select value={banco} onValueChange={setBanco}>
          <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os bancos</SelectItem>
            {bancos.map((b) => <SelectItem key={b.id} value={b.nome}>{b.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        {!filterFin && (
          <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> Nova operação
          </Button>
        )}
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Operação</TableHead><TableHead>Cliente</TableHead><TableHead>Contrato</TableHead>
          <TableHead>Banco</TableHead><TableHead>Gerente</TableHead>
          <TableHead className="text-right">Financiado</TableHead>
          <TableHead>Status</TableHead><TableHead>Liberação</TableHead>
          <TableHead className="text-center">Dias rest.</TableHead><TableHead>Previsão</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {list.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-mono text-xs text-primary">{f.id}</TableCell>
              <TableCell className="font-medium">{f.cliente}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{f.contrato}</TableCell>
              <TableCell>{f.banco}</TableCell>
              <TableCell className="text-muted-foreground">{f.gerente}</TableCell>
              <TableCell className="text-right font-medium">{fmtBRL(f.valorFinanciado)}</TableCell>
              <TableCell><StatusBadge status={f.statusOp} /></TableCell>
              <TableCell className="text-xs text-muted-foreground">{f.statusLib}</TableCell>
              <TableCell className="text-center">
                {f.restantes > 0 ? (
                  <span className={f.restantes <= 5 ? "text-warning font-semibold" : ""}>{f.restantes}d</span>
                ) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">{f.previsao}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Replicar" onClick={() => toast.success("Operação replicada")}><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Finalizar" onClick={() => toast.success("Operação finalizada")}><CheckCircle2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {list.length === 0 && (
            <TableRow><TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-2 h-6 w-6" /> Nenhuma operação encontrada
            </TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
        <span>{list.length} operações</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled>Anterior</Button>
          <Button variant="outline" size="sm">Próxima</Button>
        </div>
      </div>
    </Card>
  );
}

function BancosTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {bancos.map((b) => (
        <Card key={b.id} className="bg-[image:var(--gradient-card)] p-5">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><Building2 className="h-5 w-5" /></div>
            <StatusBadge status={b.status} />
          </div>
          <div className="mt-4 text-lg font-semibold">{b.nome}</div>
          <div className="mt-1 text-xs text-muted-foreground">{b.operacoes} operações</div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-primary">{fmtBRL(b.total)}</div>
        </Card>
      ))}
    </div>
  );
}
