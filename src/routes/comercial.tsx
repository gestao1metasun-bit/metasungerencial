import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Eye, FileText, CheckCircle2, Clock, XCircle,
  DollarSign, TrendingUp, Users, Briefcase,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { contratos, clientes, vendedores, evolucaoMensal, fmtBRL } from "@/lib/mock-data";

export const Route = createFileRoute("/comercial")({
  head: () => ({ meta: [{ title: "Comercial — Meta Sun Gerencial" }] }),
  component: ComercialPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function ComercialPage() {
  const [tab, setTab] = useState("dashboard");
  return (
    <>
      <PageHeader title="Comercial" subtitle="Gestão de clientes, propostas, contratos e vendedores." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5"><DashboardComercial /></TabsContent>
        <TabsContent value="clientes" className="mt-5"><ClientesTab /></TabsContent>
        <TabsContent value="contratos" className="mt-5"><ContratosTab /></TabsContent>
        <TabsContent value="vendedores" className="mt-5"><VendedoresTab /></TabsContent>
      </Tabs>
    </>
  );
}

function DashboardComercial() {
  const total = contratos.length;
  const assinados = contratos.filter((c) => c.status === "Assinado");
  const pendentes = contratos.filter((c) => c.status === "Pendente").length;
  const cancelados = contratos.filter((c) => c.status === "Cancelado").length;
  const valor = assinados.reduce((s, c) => s + c.valor, 0);
  const kwp = contratos.reduce((s, c) => s + c.kwp, 0);
  const ticket = valor / Math.max(assinados.length, 1);
  const conv = (assinados.length / total) * 100;

  const statusData = ["Gerado", "Assinado", "Pendente", "Cancelado"].map((s) => ({
    name: s, value: contratos.filter((c) => c.status === s).length,
  }));
  const porVendedor = vendedores.map((v) => ({ nome: v.nome.split(" ")[0], valor: v.vendido, contratos: v.contratos }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Contratos gerados" value={total} icon={FileText} tone="primary" />
        <StatCard label="Assinados" value={assinados.length} icon={CheckCircle2} tone="success" />
        <StatCard label="Pendentes" value={pendentes} icon={Clock} tone="warning" />
        <StatCard label="Cancelados" value={cancelados} icon={XCircle} tone="destructive" />
        <StatCard label="Valor vendido" value={fmtBRL(valor)} icon={DollarSign} tone="primary" />
        <StatCard label="Ticket médio" value={fmtBRL(ticket)} icon={TrendingUp} tone="info" />
        <StatCard label="Taxa de conversão" value={`${conv.toFixed(1)}%`} icon={TrendingUp} tone="success" />
        <StatCard label="kWp vendido" value={kwp.toFixed(1)} icon={TrendingUp} tone="warning" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-3 text-sm font-semibold">Funil de status</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={95} paddingAngle={2}>
                {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-3 text-sm font-semibold">Evolução mensal</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={evolucaoMensal}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="contratos" stroke="var(--chart-1)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 bg-[image:var(--gradient-card)] lg:col-span-2">
          <div className="mb-3 text-sm font-semibold">Performance por vendedor</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porVendedor}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="valor" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function ClientesTab() {
  const [q, setQ] = useState("");
  const filtered = clientes.filter((c) =>
    [c.nome, c.doc, c.cidade].some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, documento ou cidade" className="pl-9 bg-input/60" />
        </div>
        <NovoClienteDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Nome</TableHead>
            <TableHead>CPF/CNPJ</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Contratos</TableHead>
            <TableHead>Atualização</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.nome}</TableCell>
              <TableCell className="text-muted-foreground">{c.doc}</TableCell>
              <TableCell>{c.cidade}/{c.uf}</TableCell>
              <TableCell className="text-muted-foreground">{c.telefone}</TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell className="text-center">{c.contratos}</TableCell>
              <TableCell className="text-muted-foreground">{c.atualizado}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
        <span>{filtered.length} de {clientes.length} clientes</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled>Anterior</Button>
          <Button variant="outline" size="sm">Próxima</Button>
        </div>
      </div>
    </Card>
  );
}

function NovoClienteDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Cadastre um novo cliente no sistema.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1.5"><Label>Nome / Razão Social</Label><Input placeholder="Nome completo" /></div>
          <div className="space-y-1.5"><Label>CPF / CNPJ</Label><Input placeholder="000.000.000-00" /></div>
          <div className="space-y-1.5"><Label>Telefone</Label><Input placeholder="(00) 00000-0000" /></div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" placeholder="cliente@email.com" /></div>
          <div className="space-y-1.5"><Label>Cidade</Label><Input placeholder="Cidade" /></div>
          <div className="space-y-1.5"><Label>Estado</Label><Input placeholder="UF" /></div>
          <div className="md:col-span-2 space-y-1.5"><Label>Endereço</Label><Input placeholder="Rua, número, bairro" /></div>
          <div className="md:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground" onClick={() => { toast.success("Cliente cadastrado com sucesso"); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContratosTab() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const filtered = useMemo(() => contratos.filter((c) =>
    (status === "todos" || c.status === status) &&
    [c.id, c.cliente, c.vendedor].some((v) => v.toLowerCase().includes(q.toLowerCase()))
  ), [q, status]);

  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contrato, cliente ou vendedor" className="pl-9 bg-input/60" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Gerado">Gerado</SelectItem>
            <SelectItem value="Assinado">Assinado</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <NovoContratoDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Contrato</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">kWp</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
              <TableCell className="font-medium">{c.cliente}</TableCell>
              <TableCell className="text-muted-foreground">{c.vendedor}</TableCell>
              <TableCell className="text-right font-medium">{fmtBRL(c.valor)}</TableCell>
              <TableCell className="text-right">{c.kwp.toFixed(1)}</TableCell>
              <TableCell className="text-muted-foreground">{c.pagamento}</TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell className="text-muted-foreground">{c.data}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
        <span>{filtered.length} de {contratos.length} contratos</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled>Anterior</Button>
          <Button variant="outline" size="sm">Próxima</Button>
        </div>
      </div>
    </Card>
  );
}

function NovoContratoDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> Novo Contrato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
          <DialogDescription>Cadastre um novo contrato comercial.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Número do contrato</Label><Input placeholder="CT-2025-XXXX" /></div>
          <div className="space-y-1.5"><Label>Data do contrato</Label><Input type="date" /></div>
          <div className="space-y-1.5"><Label>Cliente</Label>
            <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Vendedor</Label>
            <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Valor do contrato (R$)</Label><Input type="number" placeholder="0,00" /></div>
          <div className="space-y-1.5"><Label>Potência (kWp)</Label><Input type="number" step="0.1" placeholder="0,0" /></div>
          <div className="space-y-1.5"><Label>Geração estimada (kWh/mês)</Label><Input type="number" placeholder="0" /></div>
          <div className="space-y-1.5"><Label>Tipo de pagamento</Label>
            <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vista">À vista</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="fin">Financiamento</SelectItem>
                <SelectItem value="ent_fin">Entrada + Financiamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5"><Label>Status</Label>
            <Select defaultValue="Gerado"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Gerado">Gerado</SelectItem>
                <SelectItem value="Assinado">Assinado</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground" onClick={() => { toast.success("Contrato cadastrado"); setOpen(false); }}>Salvar contrato</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendedoresTab() {
  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Equipe comercial</div>
        <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo vendedor</Button>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Vendedor</TableHead><TableHead>E-mail</TableHead>
          <TableHead className="text-center">Contratos</TableHead>
          <TableHead className="text-right">Vendido</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {vendedores.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {v.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                {v.nome}
              </TableCell>
              <TableCell className="text-muted-foreground">{v.email}</TableCell>
              <TableCell className="text-center">{v.contratos}</TableCell>
              <TableCell className="text-right font-medium">{fmtBRL(v.vendido)}</TableCell>
              <TableCell><StatusBadge status={v.status} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
