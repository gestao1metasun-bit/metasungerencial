import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus, HardHat, Wrench, Clock, CheckCircle2, AlertTriangle, Pencil, Users,
  ChevronUp, ChevronDown, RotateCcw, Eye, Trash2,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  obras as obrasSeed, pendencias as pendenciasSeed, equipes as equipesSeed,
  produtividadeEquipe, diasPrevistos,
} from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/engenharia")({
  head: () => ({ meta: [{ title: "Engenharia — Meta Sun Gerencial" }] }),
  component: EngenhariaPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const TELHADOS = ["Fibrocimento", "Cerâmica", "Metálico", "Solo", "Laje", "Outro"];
const STATUS = ["Executando instalação", "Aguardando instalação", "Em projeto/aprovação", "Standby", "Finalizado"];
const STATUS_RANK: Record<string, number> = {
  "Executando instalação": 0,
  "Aguardando instalação": 1,
  "Em projeto/aprovação": 2,
  "Standby": 3,
  "Finalizado": 4,
};
const STATUS_ROW_BG: Record<string, string> = {
  "Executando instalação": "bg-success/5 hover:bg-success/10",
  "Aguardando instalação": "bg-warning/5 hover:bg-warning/10",
  "Em projeto/aprovação": "bg-info/5 hover:bg-info/10",
  "Standby": "bg-muted/40 hover:bg-muted/60",
  "Finalizado": "",
};

function fmtBR(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
function fmtContrato(id?: string): string {
  if (!id) return "";
  const m = id.match(/(\d{1,4})\s*$/);
  if (!m) return id;
  return `${String(parseInt(m[1], 10)).padStart(3, "0")}/2026`;
}
function addDaysISO(iso: string, days: number): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Obra = (typeof obrasSeed)[number] & {
  ordem: number; inv2: string; inv3: string; telhadoTipo: string;
  inicioReal?: string; fimReal?: string;
};

function enrichObras(): Obra[] {
  return obrasSeed.map((o, i) => ({
    ...o,
    ordem: i + 1,
    inv2: "",
    inv3: "",
    telhadoTipo: o.telhado === "Cerâmico" ? "Cerâmica" : o.telhado === "Metálico" ? "Metálico" : o.telhado === "Fibrocimento" ? "Fibrocimento" : "Outro",
    inicioReal: o.status === "Finalizado" ? o.inicio : undefined,
    fimReal: o.status === "Finalizado" ? (o.finalizacao ?? undefined) : undefined,
  }));
}

function EngenhariaPage() {
  const [obras, setObras] = useState<Obra[]>(() => enrichObras());
  const [pends, setPends] = useState(pendenciasSeed);
  const [equipes, setEquipes] = useState(equipesSeed);

  return (
    <>
      <PageHeader title="Engenharia" subtitle="Obras, equipes, cronograma e produtividade." />
      <Tabs defaultValue="dashboard">
        <TabsList className="bg-card border border-border flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ativas">Obras ativas</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          <TabsTrigger value="produtividade">Produtividade</TabsTrigger>
          <TabsTrigger value="finalizados">Finalizados</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5"><DashboardEng obras={obras} pends={pends} equipes={equipes} setObras={setObras} /></TabsContent>
        <TabsContent value="ativas" className="mt-5"><ObrasAtivasTab obras={obras} setObras={setObras} equipes={equipes} /></TabsContent>
        <TabsContent value="cronograma" className="mt-5"><CronogramaTab obras={obras} setObras={setObras} pends={pends} equipes={equipes} /></TabsContent>
        <TabsContent value="pendencias" className="mt-5"><PendenciasTab pends={pends} setPends={setPends} equipes={equipes} obras={obras} /></TabsContent>
        <TabsContent value="equipes" className="mt-5"><EquipesTab equipes={equipes} setEquipes={setEquipes} obras={obras} pends={pends} /></TabsContent>
        <TabsContent value="produtividade" className="mt-5"><ProdutividadeTab obras={obras} pends={pends} equipes={equipes} /></TabsContent>
        <TabsContent value="finalizados" className="mt-5"><FinalizadosTab obras={obras} setObras={setObras} /></TabsContent>
      </Tabs>
    </>
  );
}

/* ---------------- DASHBOARD ---------------- */

function DashboardEng({
  obras, pends, equipes, setObras,
}: { obras: Obra[]; pends: typeof pendenciasSeed; equipes: typeof equipesSeed; setObras: (v: Obra[]) => void }) {
  const ativas = obras.filter((o) => o.status !== "Finalizado");
  const exec = obras.filter((o) => o.status === "Executando instalação");
  const aguard = obras.filter((o) => o.status === "Aguardando instalação");
  const projeto = obras.filter((o) => o.status === "Em projeto/aprovação");
  const standby = obras.filter((o) => o.status === "Standby");
  const fin = obras.filter((o) => o.status === "Finalizado");
  const pendsAbertas = pends.filter((p) => p.status === "Aguardando resolução");

  const [openModal, setOpenModal] = useState<null | string>(null);

  const sets: Record<string, Obra[]> = {
    ativas, exec, aguard, projeto, standby, fin,
  };
  const titles: Record<string, string> = {
    ativas: "Obras ativas", exec: "Executando instalação", aguard: "Aguardando instalação",
    projeto: "Em projeto/elaboração", standby: "Standby", fin: "Finalizadas",
  };

  const updateStatus = (id: string, status: string) => {
    setObras(obras.map((o) => o.id === id ? { ...o, status, finalizacao: status === "Finalizado" ? new Date().toISOString().slice(0,10) : null } : o));
    toast.success(`${id} → ${status}`);
  };

  const porStatus = STATUS.map((s) => ({ name: s, qtd: obras.filter((o) => o.status === s).length }));
  const porEquipe = equipes.map((e) => ({
    nome: e.nome,
    obras: obras.filter((o) => o.equipe === e.nome && o.status !== "Finalizado").length,
    modulos: obras.filter((o) => o.equipe === e.nome).reduce((s,o)=>s+o.modulos, 0),
  }));
  const pendPorEquipe = equipes.map((e) => ({ nome: e.nome, qtd: pends.filter((p) => p.equipe === e.nome && p.status === "Aguardando resolução").length }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-4">
        <StatCard label="Obras ativas" value={ativas.length} hint={`${ativas.reduce((s,o)=>s+o.modulos,0)} módulos`} icon={HardHat} tone="primary" onView={() => setOpenModal("ativas")} />
        <StatCard label="Executando" value={exec.length} hint={`${exec.reduce((s,o)=>s+o.modulos,0)} módulos`} icon={Wrench} tone="success" onView={() => setOpenModal("exec")} />
        <StatCard label="Aguardando" value={aguard.length} hint={`${aguard.reduce((s,o)=>s+o.modulos,0)} módulos`} icon={Clock} tone="warning" onView={() => setOpenModal("aguard")} />
        <StatCard label="Em projeto" value={projeto.length} hint={`${projeto.reduce((s,o)=>s+o.modulos,0)} módulos`} icon={Wrench} tone="info" onView={() => setOpenModal("projeto")} />
        <StatCard label="Standby" value={standby.length} hint={`${standby.reduce((s,o)=>s+o.modulos,0)} módulos`} icon={Clock} tone="muted" onView={() => setOpenModal("standby")} />
        <StatCard label="Finalizadas" value={fin.length} hint={`${fin.reduce((s,o)=>s+o.modulos,0)} módulos`} icon={CheckCircle2} tone="success" onView={() => setOpenModal("fin")} />
        <StatCard label="Pendências abertas" value={pendsAbertas.length} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Equipes" value={equipes.length} icon={Users} tone="info" />
      </div>

      <ObrasModal open={openModal !== null} onClose={() => setOpenModal(null)} title={openModal ? titles[openModal] : ""} obras={openModal ? sets[openModal] : []} onUpdateStatus={updateStatus} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Obras por status</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={porStatus} dataKey="qtd" nameKey="name" innerRadius={50} outerRadius={95}>
                {porStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Obras × módulos por equipe</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porEquipe}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="obras" fill="var(--chart-1)" radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="modulos" fill="var(--chart-2)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Pendências por equipe</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pendPorEquipe}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="qtd" fill="var(--chart-5)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Produtividade média por equipe (módulos/dia)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={produtividadeEquipe.map(p => ({ equipe: p.equipe, media: p.mediaDia }))}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="equipe" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="media" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function ObrasModal({
  open, onClose, title, obras, onUpdateStatus,
}: { open: boolean; onClose: () => void; title: string; obras: Obra[]; onUpdateStatus: (id: string, status: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={(v)=>!v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{obras.length} obra(s) · {obras.reduce((s,o)=>s+o.modulos,0)} módulos · {obras.reduce((s,o)=>s+o.potencia,0).toFixed(1)} kWp</DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Obra</TableHead><TableHead>Cliente</TableHead><TableHead>Equipe</TableHead>
            <TableHead className="text-center">Mód.</TableHead><TableHead className="text-right">kWp</TableHead>
            <TableHead>Início</TableHead><TableHead>Previsto</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {obras.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs text-primary">{o.id}</TableCell>
                <TableCell className="font-medium">{o.cliente}</TableCell>
                <TableCell>{o.equipe}</TableCell>
                <TableCell className="text-center">{o.modulos}</TableCell>
                <TableCell className="text-right">{o.potencia.toFixed(1)}</TableCell>
                <TableCell className="text-muted-foreground">{o.inicio}</TableCell>
                <TableCell className="text-muted-foreground">{o.previsto}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => onUpdateStatus(o.id, v)}>
                    <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {obras.length===0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma obra</TableCell></TableRow>}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- OBRAS ATIVAS ---------------- */

function ObrasAtivasTab({
  obras, setObras, equipes,
}: { obras: Obra[]; setObras: (v: Obra[]) => void; equipes: typeof equipesSeed }) {
  const [equipe, setEquipe] = useState("todas");
  const list = obras
    .filter((o) => o.status !== "Finalizado")
    .filter((o) => equipe === "todas" || o.equipe === equipe)
    .sort((a, b) => {
      const r = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
      return r !== 0 ? r : a.ordem - b.ordem;
    });

  const update = (id: string, patch: Partial<Obra>) => {
    const next = obras.map((o) => o.id === id
      ? { ...o, ...patch, finalizacao: patch.status === "Finalizado" ? new Date().toISOString().slice(0,10) : o.finalizacao }
      : o);
    const target = next.find((o) => o.id === id)!;
    setObras(chainSchedule(next, target.equipe, target.status));
  };
  const remove = (id: string) => {
    setObras(obras.filter((o) => o.id !== id));
    toast.success("Obra removida");
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <Select value={equipe} onValueChange={setEquipe}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as equipes</SelectItem>
            {equipes.map((e) => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="ml-auto bg-primary text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Nova obra</Button>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Cliente</TableHead><TableHead>Contrato</TableHead>
            <TableHead className="text-center">Mód.</TableHead><TableHead className="text-right">kWp</TableHead>
            <TableHead>INV</TableHead><TableHead>INV2</TableHead><TableHead>INV3</TableHead>
            <TableHead>Telhado</TableHead><TableHead>Equipe</TableHead>
            <TableHead>Início</TableHead><TableHead>Fim</TableHead>
            <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {list.map((o) => (
              <TableRow key={o.id} className={STATUS_ROW_BG[o.status] || ""}>
                <TableCell className="font-bold text-primary">{o.ordem}</TableCell>
                <TableCell className="font-medium">{o.cliente}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{fmtContrato(o.contrato)}</TableCell>
                <TableCell className="text-center">
                  <Input type="number" defaultValue={o.modulos} className="h-7 w-16 text-center" onBlur={(e)=>update(o.id,{ modulos: Number(e.target.value) || 0, previsto: recalcPrevisto(o.inicio, o.equipe, Number(e.target.value) || 0) })} />
                </TableCell>
                <TableCell className="text-right">
                  <Input type="number" step="0.1" defaultValue={o.potencia} className="h-7 w-20 text-right" onBlur={(e)=>update(o.id,{ potencia: Number(e.target.value) || 0 })} />
                </TableCell>
                <TableCell><Input defaultValue={o.inversor} className="h-7 w-28 text-xs" onBlur={(e)=>update(o.id,{ inversor: e.target.value })} /></TableCell>
                <TableCell><Input defaultValue={o.inv2} placeholder="—" className="h-7 w-24 text-xs" onBlur={(e)=>update(o.id,{ inv2: e.target.value })} /></TableCell>
                <TableCell><Input defaultValue={o.inv3} placeholder="—" className="h-7 w-24 text-xs" onBlur={(e)=>update(o.id,{ inv3: e.target.value })} /></TableCell>
                <TableCell>
                  <Select value={o.telhadoTipo} onValueChange={(v) => update(o.id, { telhadoTipo: v })}>
                    <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{TELHADOS.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={o.equipe} onValueChange={(v) => update(o.id, { equipe: v, previsto: recalcPrevisto(o.inicio, v, o.modulos) })}>
                    <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{equipes.map(e=><SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input type="date" defaultValue={o.inicio} className="h-7 w-36" onBlur={(e)=>update(o.id,{ inicio: e.target.value, previsto: recalcPrevisto(e.target.value, o.equipe, o.modulos) })} /></TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{fmtBR(o.previsto)}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => update(o.id, { status: v })}>
                    <SelectTrigger className="h-7 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Finalizar" onClick={() => update(o.id, { status: "Finalizado" })}><CheckCircle2 className="h-3.5 w-3.5 text-success" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={14} className="py-10 text-center text-muted-foreground">Nenhuma obra ativa</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
        Não editável: <span className="font-semibold">#</span>, <span className="font-semibold">Cliente</span> e <span className="font-semibold">Contrato</span>. Linhas coloridas conforme status.
      </div>
    </Card>
  );
}

function recalcPrevisto(inicio: string, equipe: string, modulos: number): string {
  if (!inicio) return "";
  const dias = diasPrevistos(equipe, modulos);
  const d = new Date(inicio + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0,10);
}

/** Recalcula a cadeia de datas para uma equipe+status: cada obra começa 1 dia após a previsão da anterior. */
function chainSchedule(obras: Obra[], equipe: string, status: string): Obra[] {
  const same = obras
    .filter((o) => o.equipe === equipe && o.status === status)
    .sort((a, b) => a.ordem - b.ordem);
  if (same.length <= 1) return obras;
  const patches = new Map<string, Partial<Obra>>();
  let prevPrev = same[0].previsto;
  for (let i = 1; i < same.length; i++) {
    const cur = same[i];
    const newInicio = prevPrev ? addDaysISO(prevPrev, 1) : cur.inicio;
    const newPrev = recalcPrevisto(newInicio, cur.equipe, cur.modulos);
    if (newInicio !== cur.inicio || newPrev !== cur.previsto) {
      patches.set(cur.id, { inicio: newInicio, previsto: newPrev });
    }
    prevPrev = newPrev;
  }
  if (patches.size === 0) return obras;
  return obras.map((o) => patches.has(o.id) ? { ...o, ...patches.get(o.id)! } : o);
}

/* ---------------- CRONOGRAMA ---------------- */

function CronogramaTab({
  obras, setObras, pends, equipes,
}: { obras: Obra[]; setObras: (v: Obra[]) => void; pends: typeof pendenciasSeed; equipes: typeof equipesSeed }) {
  const move = (id: string, dir: -1 | 1) => {
    const target = obras.find((o) => o.id === id);
    if (!target) return;
    const same = obras
      .filter((o) => o.equipe === target.equipe && o.status === target.status)
      .sort((a,b)=>a.ordem-b.ordem);
    const idx = same.findIndex((o) => o.id === id);
    const swapWith = same[idx + dir];
    if (!swapWith) return;
    const swapped = obras.map((o) => {
      if (o.id === target.id) return { ...o, ordem: swapWith.ordem };
      if (o.id === swapWith.id) return { ...o, ordem: target.ordem };
      return o;
    });
    setObras(chainSchedule(swapped, target.equipe, target.status));
  };

  const editInicio = (id: string, inicio: string) => {
    const target = obras.find((o) => o.id === id);
    if (!target) return;
    const previsto = recalcPrevisto(inicio, target.equipe, target.modulos);
    const next = obras.map((o) => o.id === id ? { ...o, inicio, previsto } : o);
    setObras(chainSchedule(next, target.equipe, target.status));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {equipes.map((eq) => {
        const exec = obras.filter((o) => o.equipe === eq.nome && o.status === "Executando instalação").sort((a,b)=>a.ordem-b.ordem);
        const aguard = obras.filter((o) => o.equipe === eq.nome && o.status === "Aguardando instalação").sort((a,b)=>a.ordem-b.ordem);
        const pendQtd = pends.filter((p) => p.equipe === eq.nome && p.status === "Aguardando resolução").length;
        return (
          <Card key={eq.id} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">{eq.nome}</div>
              {pendQtd > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive"><AlertTriangle className="h-3 w-3" /> {pendQtd} pend.</span>}
            </div>
            {exec.length === 0 && aguard.length === 0 && <div className="rounded border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Sem obras ativas</div>}
            {exec.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 text-[10px] font-semibold uppercase text-success">Executando</div>
                <div className="space-y-2">
                  {exec.map((o, i) => <CronogramaCard key={o.id} o={o} tone="success" first={i===0} last={i===exec.length-1} onMove={move} onEditInicio={editInicio} />)}
                </div>
              </div>
            )}
            {aguard.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase text-warning">Aguardando</div>
                <div className="space-y-2">
                  {aguard.map((o, i) => <CronogramaCard key={o.id} o={o} tone="warning" first={i===0} last={i===aguard.length-1} onMove={move} onEditInicio={editInicio} />)}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function CronogramaCard({ o, tone, first, last, onMove, onEditInicio }: { o: Obra; tone: "success" | "warning"; first: boolean; last: boolean; onMove: (id: string, dir: -1 | 1) => void; onEditInicio: (id: string, inicio: string) => void }) {
  const bg = tone === "success" ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30";
  return (
    <div className={`rounded-lg border ${bg} p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] font-bold">#{o.ordem}</span>
            <div className="font-medium text-sm truncate">{o.cliente}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{o.modulos} mód · {o.potencia.toFixed(1)} kWp · {o.telhadoTipo}</div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">{o.inversor}</div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Input type="date" defaultValue={o.inicio} className="h-6 w-32 text-[11px]" onBlur={(e) => { if (e.target.value && e.target.value !== o.inicio) onEditInicio(o.id, e.target.value); }} />
            <span>→</span>
            <span className="font-medium text-foreground">{fmtBR(o.previsto)}</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground/70">Início: {fmtBR(o.inicio)} · próximo herda +1d</div>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="outline" size="icon" className="h-6 w-6" disabled={first} onClick={() => onMove(o.id, -1)}><ChevronUp className="h-3 w-3" /></Button>
          <Button variant="outline" size="icon" className="h-6 w-6" disabled={last} onClick={() => onMove(o.id, 1)}><ChevronDown className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PENDÊNCIAS ---------------- */

function PendenciasTab({
  pends, setPends, equipes, obras,
}: { pends: typeof pendenciasSeed; setPends: (v: typeof pendenciasSeed) => void; equipes: typeof equipesSeed; obras: Obra[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipe: "", cliente: "", obra: "", problema: "", solucao: "" });

  const resolver = (id: string) => {
    setPends(pends.map((p) => p.id === id ? { ...p, status: "Problema resolvido", resolucao: new Date().toISOString().slice(0,10) } : p));
    toast.success("Pendência resolvida");
  };

  const submit = () => {
    if (!form.equipe || !form.problema) { toast.error("Preencha equipe e problema"); return; }
    setPends([{ id: `PD-${String(pends.length+15).padStart(3,"0")}`, ...form, status: "Aguardando resolução", abertura: new Date().toISOString().slice(0,10), resolucao: null }, ...pends]);
    toast.success("Pendência criada");
    setForm({ equipe: "", cliente: "", obra: "", problema: "", solucao: "" });
    setOpen(false);
  };

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Pendências de obra</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova pendência</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova pendência</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Equipe</Label>
                <Select value={form.equipe} onValueChange={(v)=>setForm({...form, equipe: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{equipes.map(e=><SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Cliente</Label><Input value={form.cliente} onChange={(e)=>setForm({...form, cliente: e.target.value})} /></div>
              <div><Label>Obra</Label>
                <Select value={form.obra} onValueChange={(v)=>setForm({...form, obra: v})}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{obras.map(o=><SelectItem key={o.id} value={o.id}>{o.id} — {o.cliente}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Problema</Label><Textarea rows={3} value={form.problema} onChange={(e)=>setForm({...form, problema: e.target.value})} /></div>
              <div><Label>Solução proposta</Label><Textarea rows={2} value={form.solucao} onChange={(e)=>setForm({...form, solucao: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
              <Button className="bg-primary text-primary-foreground" onClick={submit}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Pendência</TableHead><TableHead>Equipe</TableHead><TableHead>Cliente</TableHead>
          <TableHead>Obra</TableHead><TableHead>Problema</TableHead><TableHead>Solução</TableHead>
          <TableHead>Status</TableHead><TableHead>Abertura</TableHead><TableHead>Resolução</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {pends.map((p) => (
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
              <TableCell className="text-right">
                {p.status === "Aguardando resolução" && (
                  <Button variant="ghost" size="sm" onClick={() => resolver(p.id)}><CheckCircle2 className="mr-1 h-4 w-4 text-success" /> Resolver</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ---------------- EQUIPES ---------------- */

function EquipesTab({
  equipes, setEquipes, obras, pends,
}: { equipes: typeof equipesSeed; setEquipes: (v: typeof equipesSeed) => void; obras: Obra[]; pends: typeof pendenciasSeed }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {equipes.map((e) => {
        const exec = obras.filter((o) => o.equipe === e.nome && o.status === "Executando instalação").length;
        const aguard = obras.filter((o) => o.equipe === e.nome && o.status === "Aguardando instalação").length;
        const totalMod = obras.filter((o) => o.equipe === e.nome).reduce((s,o)=>s+o.modulos, 0);
        const pendAb = pends.filter((p) => p.equipe === e.nome && p.status === "Aguardando resolução").length;
        const prod = produtividadeEquipe.find((p)=>p.equipe===e.nome);
        return (
          <Card key={e.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><Users className="h-5 w-5" /></div>
              <StatusBadge status={e.status} />
            </div>
            <div className="mt-4 text-lg font-semibold">{e.nome}</div>
            <div className="mt-1 text-xs text-muted-foreground">Líder: {e.lider} · {e.membros} membros</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-success/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">Executando</div><div className="font-bold text-success">{exec}</div></div>
              <div className="rounded-md bg-warning/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">Aguardando</div><div className="font-bold text-warning">{aguard}</div></div>
              <div className="rounded-md bg-primary/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">Módulos</div><div className="font-bold text-primary">{totalMod}</div></div>
              <div className="rounded-md bg-info/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">Mód./dia</div><div className="font-bold text-info">{prod?.mediaDia ?? "—"}</div></div>
            </div>
            {pendAb > 0 && (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3 w-3" /> {pendAb} pendência(s)
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- PRODUTIVIDADE ---------------- */

function ProdutividadeTab({ obras, pends, equipes }: { obras: Obra[]; pends: typeof pendenciasSeed; equipes: typeof equipesSeed }) {
  const data = equipes.map((e) => {
    const finalizadas = obras.filter((o) => o.equipe === e.nome && o.status === "Finalizado");
    const ativas = obras.filter((o) => o.equipe === e.nome && o.status !== "Finalizado").length;
    const modInst = finalizadas.reduce((s,o)=>s+o.modulos, 0);
    const prod = produtividadeEquipe.find((p)=>p.equipe===e.nome);
    const pend = pends.filter((p) => p.equipe === e.nome && p.status === "Aguardando resolução").length;
    return { nome: e.nome, finalizadas: finalizadas.length, ativas, modInst, mediaDia: prod?.mediaDia ?? 0, pend };
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Módulos instalados por equipe</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="modInst" fill="var(--chart-1)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Ranking — média módulos/dia</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[...data].sort((a,b)=>b.mediaDia-a.mediaDia)} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis dataKey="nome" type="category" stroke="var(--muted-foreground)" fontSize={11} width={80} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="mediaDia" fill="var(--chart-2)" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Detalhe por equipe</div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Equipe</TableHead>
            <TableHead className="text-center">Finalizadas</TableHead>
            <TableHead className="text-center">Ativas</TableHead>
            <TableHead className="text-center">Módulos instalados</TableHead>
            <TableHead className="text-center">Média mód./dia</TableHead>
            <TableHead className="text-center">Pendências</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.nome}>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell className="text-center font-semibold text-success">{d.finalizadas}</TableCell>
                <TableCell className="text-center">{d.ativas}</TableCell>
                <TableCell className="text-center">{d.modInst}</TableCell>
                <TableCell className="text-center font-bold text-primary">{d.mediaDia}</TableCell>
                <TableCell className="text-center"><span className={d.pend>0?"text-destructive font-semibold":""}>{d.pend}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------------- FINALIZADOS ---------------- */

function FinalizadosTab({ obras, setObras }: { obras: Obra[]; setObras: (v: Obra[]) => void }) {
  const list = obras.filter((o) => o.status === "Finalizado");
  const [detail, setDetail] = useState<Obra | null>(null);

  const retornar = (id: string) => {
    setObras(obras.map((o) => o.id === id ? { ...o, status: "Aguardando instalação", finalizacao: null } : o));
    toast.success("Obra retornou para ativos");
  };

  return (
    <Card>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Obra</TableHead><TableHead>Cliente</TableHead><TableHead>Equipe</TableHead>
          <TableHead className="text-center">Mód.</TableHead><TableHead className="text-right">kWp</TableHead>
          <TableHead>Início</TableHead><TableHead>Finalização</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {list.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-xs text-primary">{o.id}</TableCell>
              <TableCell className="font-medium">{o.cliente}</TableCell>
              <TableCell>{o.equipe}</TableCell>
              <TableCell className="text-center">{o.modulos}</TableCell>
              <TableCell className="text-right">{o.potencia.toFixed(1)}</TableCell>
              <TableCell className="text-muted-foreground">{o.inicio}</TableCell>
              <TableCell className="text-muted-foreground">{o.finalizacao ?? "—"}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetail(o)}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => retornar(o.id)}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Retornar</Button>
              </TableCell>
            </TableRow>
          ))}
          {list.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhuma obra finalizada</TableCell></TableRow>}
        </TableBody>
      </Table>
      <Dialog open={!!detail} onOpenChange={(v)=>!v && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detail?.id} — {detail?.cliente}</DialogTitle><DialogDescription>Detalhes da obra finalizada</DialogDescription></DialogHeader>
          {detail && (
            <div className="grid gap-3 text-sm">
              <Row k="Equipe" v={detail.equipe} />
              <Row k="Módulos" v={`${detail.modulos}`} />
              <Row k="Potência" v={`${detail.potencia.toFixed(1)} kWp`} />
              <Row k="Inversor" v={detail.inversor} />
              <Row k="Telhado" v={detail.telhadoTipo} />
              <Row k="Início" v={detail.inicio} />
              <Row k="Finalização" v={detail.finalizacao ?? "—"} />
              <Row k="Contrato" v={detail.contrato} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
