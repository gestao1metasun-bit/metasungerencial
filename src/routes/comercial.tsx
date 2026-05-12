import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Eye, FileText, CheckCircle2, Clock, XCircle,
  DollarSign, TrendingUp, Users, AlertTriangle, Target, Trash2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
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
import {
  contratos as contratosSeed, clientes as clientesSeed, vendedores, propostas as propostasSeed,
  evolucaoMensal, propostasMensais, conversaoMensal, fmtBRL,
} from "@/lib/mock-data";

export const Route = createFileRoute("/comercial")({
  head: () => ({ meta: [{ title: "Comercial — Meta Sun Gerencial" }] }),
  component: ComercialPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

type Contrato = (typeof contratosSeed)[number] & { banco?: string; modulos?: number; obs?: string };

function enrich(c: (typeof contratosSeed)[number]): Contrato {
  return { ...c, banco: "BASA", modulos: Math.round(c.kwp * 2), obs: "" };
}

function ComercialPage() {
  const [tab, setTab] = useState("dashboard");
  const [contratos, setContratos] = useState<Contrato[]>(() => contratosSeed.map(enrich));
  const [clientes, setClientes] = useState(clientesSeed);
  const [propostas, setPropostas] = useState(propostasSeed);

  return (
    <>
      <PageHeader title="Comercial" subtitle="Gestão de clientes, propostas, contratos e vendedores." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          
          <TabsTrigger value="propostas">Propostas</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="analise">Análise Executiva</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5">
          <DashboardComercial contratos={contratos} setContratos={setContratos} />
        </TabsContent>
        
        <TabsContent value="propostas" className="mt-5"><PropostasTab propostas={propostas} setPropostas={setPropostas} /></TabsContent>
        <TabsContent value="contratos" className="mt-5"><ContratosTab contratos={contratos} setContratos={setContratos} /></TabsContent>
        <TabsContent value="vendedores" className="mt-5"><VendedoresTab contratos={contratos} /></TabsContent>
        <TabsContent value="analise" className="mt-5"><AnaliseExecutivaTab contratos={contratos} /></TabsContent>
      </Tabs>
    </>
  );
}

/* ---------------- DASHBOARD ---------------- */

function DashboardComercial({
  contratos, setContratos,
}: { contratos: Contrato[]; setContratos: (v: Contrato[]) => void }) {
  const total = contratos.length;
  const valorTotal = contratos.reduce((s, c) => s + c.valor, 0);
  const assinados = contratos.filter((c) => c.status === "Assinado");
  const pendentes = contratos.filter((c) => c.status === "Pendente");
  const cancelados = contratos.filter((c) => c.status === "Cancelado");
  const valorAssinado = assinados.reduce((s, c) => s + c.valor, 0);
  const valorPend = pendentes.reduce((s, c) => s + c.valor, 0);
  const valorCanc = cancelados.reduce((s, c) => s + c.valor, 0);
  const ticket = valorAssinado / Math.max(assinados.length, 1);

  const [openModal, setOpenModal] = useState<null | "gerados" | "assinados" | "pendentes" | "cancelados" | "valor" | "ticket">(null);

  const updateStatus = (id: string, status: string) => {
    setContratos(contratos.map((c) => (c.id === id ? { ...c, status } : c)));
    toast.success(`${id} → ${status}`);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Contratos Gerados" value={total} hint={fmtBRL(valorTotal)} icon={FileText} tone="primary" trend={{ value: "100%", positive: true }} onView={() => setOpenModal("gerados")} />
        <StatCard label="Assinados" value={`${assinados.length} (${((assinados.length/Math.max(total,1))*100).toFixed(1)}%)`} hint={fmtBRL(valorAssinado)} icon={CheckCircle2} tone="success" onView={() => setOpenModal("assinados")} />
        <StatCard label="Pendentes" value={`${pendentes.length} (${((pendentes.length/Math.max(total,1))*100).toFixed(1)}%)`} hint={fmtBRL(valorPend)} icon={Clock} tone="warning" onView={() => setOpenModal("pendentes")} />
        <StatCard label="Cancelados" value={`${cancelados.length} (${((cancelados.length/Math.max(total,1))*100).toFixed(1)}%)`} hint={fmtBRL(valorCanc)} icon={XCircle} tone="destructive" onView={() => setOpenModal("cancelados")} />
        <StatCard label="Valor Assinado" value={fmtBRL(valorAssinado)} hint={`${assinados.length} contratos`} icon={DollarSign} tone="success" onView={() => setOpenModal("valor")} />
        <StatCard label="Ticket Médio" value={fmtBRL(ticket)} hint={`média ${assinados.length} assin.`} icon={TrendingUp} tone="info" onView={() => setOpenModal("ticket")} />
      </div>

      <DetailContratosModal
        open={openModal !== null}
        onClose={() => setOpenModal(null)}
        title={
          openModal === "assinados" ? "Contratos assinados" :
          openModal === "pendentes" ? "Contratos pendentes" :
          openModal === "cancelados" ? "Contratos cancelados" :
          openModal === "valor" ? "Ranking por valor assinado" :
          openModal === "ticket" ? "Análise de ticket médio" :
          "Todos os contratos gerados"
        }
        contratos={
          openModal === "assinados" ? assinados :
          openModal === "pendentes" ? pendentes :
          openModal === "cancelados" ? cancelados :
          openModal === "valor" ? [...assinados].sort((a, b) => b.valor - a.valor) :
          openModal === "ticket" ? assinados :
          contratos
        }
        showTicketSummary={openModal === "ticket"}
        onUpdateStatus={updateStatus}
      />

      {/* Top vendedores + meta */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Top vendedores</div>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>#</TableHead><TableHead>Vendedor</TableHead>
              <TableHead className="text-center">Contratos</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
              <TableHead className="text-right">kWp</TableHead>
              <TableHead className="text-right">Conv.</TableHead>
              <TableHead className="text-right">Part.</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {[...vendedores].sort((a,b)=>b.vendido-a.vendido).map((v, i) => {
                const part = (v.vendido / vendedores.reduce((s,x)=>s+x.vendido,0)) * 100;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-bold text-primary">{i+1}</TableCell>
                    <TableCell className="font-medium">{v.nome}</TableCell>
                    <TableCell className="text-center">{v.contratos}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRL(v.vendido)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(v.vendido / Math.max(v.contratos,1))}</TableCell>
                    <TableCell className="text-right">{v.kwp.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{v.conversao}%</TableCell>
                    <TableCell className="text-right text-primary">{part.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Ranking visual</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vendedores.map(v => ({ nome: v.nome.split(" ")[0], valor: v.vendido }))} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="nome" type="category" stroke="var(--muted-foreground)" fontSize={11} width={70} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="valor" fill="var(--chart-1)" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Gráficos de evolução e conversão */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Evolução de propostas</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={propostasMensais}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="geradas" stackId="1" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.3} />
              <Area type="monotone" dataKey="fechadas" stackId="2" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Gerados × Assinados (conversão)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={conversaoMensal}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="gerados" fill="var(--chart-1)" radius={[4,4,0,0]} />
              <Bar dataKey="assinados" fill="var(--chart-2)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 text-sm font-semibold">Valor vendido mensal</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={evolucaoMensal}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="vendido" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function DetailContratosModal({
  open, onClose, title, contratos, showTicketSummary, onUpdateStatus,
}: {
  open: boolean; onClose: () => void; title: string; contratos: Contrato[];
  showTicketSummary?: boolean; onUpdateStatus: (id: string, status: string) => void;
}) {
  const total = contratos.length;
  const valor = contratos.reduce((s,c)=>s+c.valor, 0);
  const ticket = valor / Math.max(total, 1);
  const maior = contratos.reduce((m,c)=>c.valor>m?c.valor:m, 0);
  const menor = contratos.reduce((m,c)=>c.valor<m?c.valor:m, contratos[0]?.valor ?? 0);

  return (
    <Dialog open={open} onOpenChange={(v)=>!v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {total} contrato{total!==1?"s":""} · Valor total {fmtBRL(valor)}
          </DialogDescription>
        </DialogHeader>

        {showTicketSummary && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Ticket médio</div><div className="text-lg font-bold text-primary">{fmtBRL(ticket)}</div></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Maior venda</div><div className="text-lg font-bold text-success">{fmtBRL(maior)}</div></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Menor venda</div><div className="text-lg font-bold">{fmtBRL(menor)}</div></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Contratos</div><div className="text-lg font-bold">{total}</div></div>
          </div>
        )}

        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
            <TableHead>Banco</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {contratos.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
                <TableCell className="font-medium">{c.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{c.vendedor}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
                <TableCell className="text-right">{c.kwp.toFixed(1)}</TableCell>
                <TableCell className="text-muted-foreground">{c.banco}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-muted-foreground">{c.data}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Select value={c.status} onValueChange={(v) => onUpdateStatus(c.id, v)}>
                    <SelectTrigger className="h-8 w-36 inline-flex"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gerado">Gerado</SelectItem>
                      <SelectItem value="Assinado">Assinado</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {total===0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhum contrato</TableCell></TableRow>}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- CLIENTES ---------------- */

function ClientesTab({ clientes, setClientes }: { clientes: typeof clientesSeed; setClientes: (v: typeof clientesSeed) => void }) {
  const [q, setQ] = useState("");
  const filtered = clientes.filter((c) =>
    [c.nome, c.doc, c.cidade].some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );
  const remove = (id: string) => { setClientes(clientes.filter((c) => c.id !== id)); toast.success("Cliente removido"); };
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, documento ou cidade" className="pl-9" />
        </div>
        <NovoClienteDialog onSave={(c) => { setClientes([{ ...c, id: `CLI-${String(clientes.length+1).padStart(3,"0")}`, contratos: 0, atualizado: new Date().toISOString().slice(0,10) }, ...clientes]); }} />
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Nome</TableHead><TableHead>CPF/CNPJ</TableHead><TableHead>Cidade</TableHead>
          <TableHead>Telefone</TableHead><TableHead>Status</TableHead>
          <TableHead className="text-center">Contratos</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.nome}</TableCell>
              <TableCell className="text-muted-foreground">{c.doc}</TableCell>
              <TableCell>{c.cidade}/{c.uf}</TableCell>
              <TableCell className="text-muted-foreground">{c.telefone}</TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell className="text-center">{c.contratos}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
        <span>{filtered.length} de {clientes.length} clientes</span>
      </div>
    </Card>
  );
}

function NovoClienteDialog({ onSave }: { onSave: (c: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", doc: "", telefone: "", email: "", cidade: "", uf: "", endereco: "", obs: "", status: "Ativo" });
  const submit = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome"); return; }
    onSave(form);
    toast.success("Cliente cadastrado");
    setForm({ nome: "", doc: "", telefone: "", email: "", cidade: "", uf: "", endereco: "", obs: "", status: "Ativo" });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo Cliente</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Novo Cliente</DialogTitle><DialogDescription>Cadastre um novo cliente.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1.5"><Label>Nome / Razão Social</Label><Input value={form.nome} onChange={(e)=>setForm({...form, nome: e.target.value})} /></div>
          <div className="space-y-1.5"><Label>CPF / CNPJ</Label><Input value={form.doc} onChange={(e)=>setForm({...form, doc: e.target.value})} /></div>
          <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone} onChange={(e)=>setForm({...form, telefone: e.target.value})} /></div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} /></div>
          <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.cidade} onChange={(e)=>setForm({...form, cidade: e.target.value})} /></div>
          <div className="space-y-1.5"><Label>UF</Label><Input value={form.uf} onChange={(e)=>setForm({...form, uf: e.target.value})} /></div>
          <div className="md:col-span-2 space-y-1.5"><Label>Endereço</Label><Input value={form.endereco} onChange={(e)=>setForm({...form, endereco: e.target.value})} /></div>
          <div className="md:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea rows={3} value={form.obs} onChange={(e)=>setForm({...form, obs: e.target.value})} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground" onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- PROPOSTAS ---------------- */

function PropostasTab({ propostas, setPropostas }: { propostas: typeof propostasSeed; setPropostas: (v: typeof propostasSeed) => void }) {
  const [q, setQ] = useState("");
  const list = propostas.filter((p) => [p.id, p.cliente, p.vendedor].some((v) => v.toLowerCase().includes(q.toLowerCase())));
  const updateStatus = (id: string, status: string) => {
    setPropostas(propostas.map((p) => p.id === id ? { ...p, status } : p));
    toast.success(`${id} → ${status}`);
  };
  const porStatus = ["Em negociação","Enviada","Aguardando retorno","Convertida","Fechada","Recusada","Perdida"]
    .map((s) => ({ status: s, qtd: propostas.filter((p) => p.status === s).length }))
    .filter((x) => x.qtd > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 text-sm font-semibold">Propostas por mês</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={propostasMensais}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="geradas" fill="var(--chart-1)" radius={[4,4,0,0]} />
              <Bar dataKey="fechadas" fill="var(--chart-2)" radius={[4,4,0,0]} />
              <Bar dataKey="perdidas" fill="var(--chart-5)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Distribuição por status</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={porStatus} dataKey="qtd" nameKey="status" innerRadius={45} outerRadius={85}>
                {porStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proposta, cliente ou vendedor" className="pl-9" />
          </div>
          <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={() => toast.info("Use o módulo Comercial para criar propostas completas")}>
            <Plus className="mr-2 h-4 w-4" /> Nova Proposta
          </Button>
        </div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Proposta</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
            <TableHead>Status</TableHead><TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {list.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs text-primary">{p.id}</TableCell>
                <TableCell className="font-medium">{p.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{p.vendedor}</TableCell>
                <TableCell className="text-right font-medium">{fmtBRL(p.valor)}</TableCell>
                <TableCell className="text-right">{p.kwp.toFixed(1)}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell className="text-muted-foreground">{p.data}</TableCell>
                <TableCell className="text-right">
                  <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                    <SelectTrigger className="h-8 w-40 inline-flex"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em negociação">Em negociação</SelectItem>
                      <SelectItem value="Enviada">Enviada</SelectItem>
                      <SelectItem value="Aguardando retorno">Aguardando retorno</SelectItem>
                      <SelectItem value="Convertida">Convertida</SelectItem>
                      <SelectItem value="Fechada">Fechada</SelectItem>
                      <SelectItem value="Recusada">Recusada</SelectItem>
                      <SelectItem value="Perdida">Perdida</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------------- CONTRATOS ---------------- */

function ContratosTab({ contratos, setContratos }: { contratos: Contrato[]; setContratos: (v: Contrato[]) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const filtered = useMemo(() => contratos.filter((c) =>
    (status === "todos" || c.status === status) &&
    [c.id, c.cliente, c.vendedor].some((v) => v.toLowerCase().includes(q.toLowerCase()))
  ), [contratos, q, status]);

  const updateStatus = (id: string, st: string) => {
    setContratos(contratos.map((c) => c.id === id ? { ...c, status: st } : c));
    toast.success(`${id} → ${st}`);
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contrato, cliente ou vendedor" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Gerado">Gerado</SelectItem>
            <SelectItem value="Assinado">Assinado</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Button className="bg-primary text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo Contrato</Button>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
          <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
          <TableHead className="text-center">Mód.</TableHead>
          <TableHead>Banco</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
              <TableCell className="font-medium">{c.cliente}</TableCell>
              <TableCell className="text-muted-foreground">{c.vendedor}</TableCell>
              <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
              <TableCell className="text-right">{c.kwp.toFixed(1)}</TableCell>
              <TableCell className="text-center">{c.modulos}</TableCell>
              <TableCell className="text-muted-foreground">{c.banco}</TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell className="text-muted-foreground">{c.data}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                  <SelectTrigger className="h-8 w-32 inline-flex"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gerado">Gerado</SelectItem>
                    <SelectItem value="Assinado">Assinado</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ---------------- VENDEDORES ---------------- */

function VendedoresTab({ contratos }: { contratos: Contrato[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {vendedores.map((v) => {
        const meus = contratos.filter((c) => c.vendedor === v.nome);
        const valor = meus.reduce((s, c) => s + c.valor, 0);
        const ass = meus.filter((c) => c.status === "Assinado").length;
        const pct = (valor / Math.max(v.meta, 1)) * 100;
        return (
          <Card key={v.id} className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {v.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{v.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{v.email}</div>
              </div>
              <StatusBadge status={v.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Contratos</div><div className="font-bold">{meus.length}</div></div>
              <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Assinados</div><div className="font-bold text-success">{ass}</div></div>
              <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Vendido</div><div className="font-bold text-primary">{fmtBRL(valor)}</div></div>
              <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Conversão</div><div className="font-bold">{v.conversao}%</div></div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Meta {fmtBRL(v.meta)}</span><span className="font-semibold">{pct.toFixed(0)}%</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- ANÁLISE EXECUTIVA ---------------- */

function AnaliseExecutivaTab({ contratos }: { contratos: Contrato[] }) {
  const total = contratos.reduce((s, c) => s + c.valor, 0);
  const mediaVendedor = vendedores.reduce((s,v)=>s+v.vendido,0) / vendedores.length;
  const baixo = vendedores.filter((v) => v.vendido < mediaVendedor);
  const pendentes = contratos.filter((c) => c.status === "Pendente");
  const conv = contratos.filter((c)=>c.status==="Assinado").length / Math.max(contratos.length, 1) * 100;
  const projecao = total * 1.12;

  const alertas: { tipo: "warning" | "destructive" | "info"; titulo: string; descricao: string }[] = [
    { tipo: "warning", titulo: `${baixo.length} vendedor(es) abaixo da média`, descricao: baixo.map(v=>v.nome).join(", ") || "—" },
    { tipo: "destructive", titulo: `${pendentes.length} contrato(s) pendente(s)`, descricao: pendentes.length>0 ? `Valor parado: ${fmtBRL(pendentes.reduce((s,c)=>s+c.valor,0))}` : "Sem pendências críticas" },
    { tipo: "info", titulo: `Taxa de conversão: ${conv.toFixed(1)}%`, descricao: conv >= 60 ? "Acima da meta operacional" : "Abaixo da meta — revisar funil" },
    { tipo: "info", titulo: `Projeção próximos 30 dias`, descricao: `${fmtBRL(projecao)} (+12% vs período atual)` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {alertas.map((a, i) => (
          <Card key={i} className="p-4">
            <div className={`mb-2 inline-flex items-center gap-1 text-xs font-semibold ${a.tipo==="destructive"?"text-destructive":a.tipo==="warning"?"text-warning":"text-info"}`}>
              <AlertTriangle className="h-3.5 w-3.5" /> {a.titulo}
            </div>
            <div className="text-sm text-muted-foreground">{a.descricao}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Cumprimento de meta por vendedor</div>
        <div className="space-y-3">
          {[...vendedores].sort((a,b)=>b.vendido-a.vendido).map((v) => {
            const pct = (v.vendido / v.meta) * 100;
            return (
              <div key={v.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{v.nome}</span>
                  <span className="text-muted-foreground">{fmtBRL(v.vendido)} / {fmtBRL(v.meta)} <span className={`ml-2 font-semibold ${pct>=100?"text-success":pct>=80?"text-info":"text-warning"}`}>{pct.toFixed(0)}%</span></span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${pct>=100?"bg-success":pct>=80?"bg-info":"bg-warning"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Tendência mensal — valor vendido</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={evolucaoMensal}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="vendido" stroke="var(--chart-1)" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
