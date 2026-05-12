import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus, HardHat, Wrench, Clock, CheckCircle2, AlertTriangle, Pencil, Users,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { obras, pendencias, equipes } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/engenharia")({
  head: () => ({ meta: [{ title: "Engenharia — Meta Sun Gerencial" }] }),
  component: EngenhariaPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function EngenhariaPage() {
  return (
    <>
      <PageHeader title="Engenharia" subtitle="Obras, equipes, cronograma e pendências." />
      <Tabs defaultValue="dashboard">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ativas">Obras ativas</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          <TabsTrigger value="produtividade">Produtividade</TabsTrigger>
          <TabsTrigger value="finalizados">Finalizados</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5"><DashboardEng /></TabsContent>
        <TabsContent value="ativas" className="mt-5"><ObrasTab filter={(o) => o.status !== "Finalizado"} /></TabsContent>
        <TabsContent value="cronograma" className="mt-5"><ObrasTab filter={(o) => ["Executando instalação", "Aguardando instalação"].includes(o.status)} /></TabsContent>
        <TabsContent value="pendencias" className="mt-5"><PendenciasTab /></TabsContent>
        <TabsContent value="equipes" className="mt-5"><EquipesTab /></TabsContent>
        <TabsContent value="produtividade" className="mt-5"><ProdutividadeTab /></TabsContent>
        <TabsContent value="finalizados" className="mt-5"><ObrasTab filter={(o) => o.status === "Finalizado"} /></TabsContent>
      </Tabs>
    </>
  );
}

function ProdutividadeTab() {
  const data = equipes.map((e) => {
    const finalizadas = obras.filter((o) => o.equipe === e.nome && o.status === "Finalizado").length;
    const ativas = obras.filter((o) => o.equipe === e.nome && o.status !== "Finalizado").length;
    const pend = pendencias.filter((p) => p.equipe === e.nome && p.status === "Aguardando resolução").length;
    return { nome: e.nome, finalizadas, ativas, pend };
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-3 text-sm font-semibold">Obras finalizadas vs ativas</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="finalizadas" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="ativas" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-3 text-sm font-semibold">Indicadores por equipe</div>
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.nome} className="rounded-lg border border-border bg-card/40 p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{d.nome}</div>
                <div className="text-xs text-muted-foreground">{d.pend} pendência(s) abertas</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-md bg-success/10 p-2"><div className="text-xs text-muted-foreground">Finalizadas</div><div className="font-bold text-success">{d.finalizadas}</div></div>
                <div className="rounded-md bg-primary/10 p-2"><div className="text-xs text-muted-foreground">Ativas</div><div className="font-bold text-primary">{d.ativas}</div></div>
                <div className="rounded-md bg-warning/10 p-2"><div className="text-xs text-muted-foreground">Pendências</div><div className="font-bold text-warning">{d.pend}</div></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function DashboardEng() {
  const ativas = obras.filter((o) => o.status !== "Finalizado").length;
  const exec = obras.filter((o) => o.status === "Executando instalação").length;
  const aguard = obras.filter((o) => o.status === "Aguardando instalação").length;
  const projeto = obras.filter((o) => o.status === "Em projeto/aprovação").length;
  const standby = obras.filter((o) => o.status === "Standby").length;
  const fin = obras.filter((o) => o.status === "Finalizado").length;
  const pend = pendencias.filter((p) => p.status === "Aguardando resolução").length;

  const porStatus = ["Executando instalação", "Aguardando instalação", "Em projeto/aprovação", "Standby", "Finalizado"]
    .map((s) => ({ name: s, qtd: obras.filter((o) => o.status === s).length }));
  const porEquipe = equipes.map((e) => ({ nome: e.nome, obras: e.obrasAtivas }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-4">
        <StatCard label="Obras ativas" value={ativas} icon={HardHat} tone="primary" />
        <StatCard label="Executando" value={exec} icon={Wrench} tone="success" />
        <StatCard label="Aguardando" value={aguard} icon={Clock} tone="info" />
        <StatCard label="Em projeto" value={projeto} icon={Wrench} tone="warning" />
        <StatCard label="Standby" value={standby} icon={Clock} tone="muted" />
        <StatCard label="Finalizadas" value={fin} icon={CheckCircle2} tone="success" />
        <StatCard label="Pendências abertas" value={pend} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Equipes" value={equipes.length} icon={Users} tone="info" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-3 text-sm font-semibold">Obras por status</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={porStatus} dataKey="qtd" nameKey="name" innerRadius={55} outerRadius={100} paddingAngle={2}>
                {porStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-3 text-sm font-semibold">Obras por equipe</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porEquipe}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="obras" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function ObrasTab({ filter }: { filter: (o: typeof obras[number]) => boolean }) {
  const [equipe, setEquipe] = useState("todas");
  const list = obras.filter(filter).filter((o) => equipe === "todas" || o.equipe === equipe);

  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <Select value={equipe} onValueChange={setEquipe}>
          <SelectTrigger className="w-48 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as equipes</SelectItem>
            {equipes.map((e) => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="ml-auto bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> Nova obra
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Obra</TableHead><TableHead>Cliente</TableHead><TableHead>Contrato</TableHead>
          <TableHead className="text-center">Módulos</TableHead><TableHead className="text-right">kWp</TableHead>
          <TableHead>Equipe</TableHead><TableHead>Início</TableHead><TableHead>Previsto</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {list.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-xs text-primary">{o.id}</TableCell>
              <TableCell className="font-medium">{o.cliente}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{o.contrato}</TableCell>
              <TableCell className="text-center">{o.modulos}</TableCell>
              <TableCell className="text-right">{o.potencia.toFixed(1)}</TableCell>
              <TableCell>{o.equipe}</TableCell>
              <TableCell className="text-muted-foreground">{o.inicio}</TableCell>
              <TableCell className="text-muted-foreground">{o.previsto}</TableCell>
              <TableCell><StatusBadge status={o.status} /></TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                {o.status !== "Finalizado" && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Finalizar" onClick={() => toast.success("Obra finalizada")}><CheckCircle2 className="h-4 w-4" /></Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {list.length === 0 && (
            <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">Nenhuma obra encontrada</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function PendenciasTab() {
  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Pendências de obra</div>
        <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Nova pendência</Button>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Pendência</TableHead><TableHead>Equipe</TableHead><TableHead>Cliente</TableHead>
          <TableHead>Obra</TableHead><TableHead>Problema</TableHead><TableHead>Solução</TableHead>
          <TableHead>Status</TableHead><TableHead>Abertura</TableHead><TableHead>Resolução</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {pendencias.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs text-primary">{p.id}</TableCell>
              <TableCell>{p.equipe}</TableCell>
              <TableCell className="font-medium">{p.cliente}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{p.obra}</TableCell>
              <TableCell className="max-w-xs truncate">{p.problema}</TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">{p.solucao}</TableCell>
              <TableCell><StatusBadge status={p.status} /></TableCell>
              <TableCell className="text-muted-foreground">{p.abertura}</TableCell>
              <TableCell className="text-muted-foreground">{p.resolucao ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function EquipesTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {equipes.map((e) => (
        <Card key={e.id} className="bg-[image:var(--gradient-card)] p-5">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><Users className="h-5 w-5" /></div>
            <StatusBadge status={e.status} />
          </div>
          <div className="mt-4 text-lg font-semibold">{e.nome}</div>
          <div className="mt-1 text-xs text-muted-foreground">Líder: {e.lider}</div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-md bg-muted/40 p-2">
              <div className="text-xs text-muted-foreground">Membros</div>
              <div className="text-xl font-semibold">{e.membros}</div>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <div className="text-xs text-muted-foreground">Obras ativas</div>
              <div className="text-xl font-semibold text-primary">{e.obrasAtivas}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
