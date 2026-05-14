import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import {
  Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Plus, Search,
  Boxes, TrendingDown, RefreshCw, Truck, ChevronDown, ChevronRight,
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { estoqueItens, movimentacoesEstoque, fmtBRL, obras as obrasSeed } from "@/lib/mock-data";

export const Route = createFileRoute("/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Meta Sun Gerencial" }] }),
  component: EstoquePage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function EstoquePage() {
  return (
    <>
      <PageHeader title="Estoque" subtitle="Controle de produtos, movimentações e níveis mínimos." />
      <Tabs defaultValue="dashboard">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="entregas">Entregas Realizadas</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5"><DashboardEst /></TabsContent>
        <TabsContent value="itens" className="mt-5"><ItensTab /></TabsContent>
        <TabsContent value="entregas" className="mt-5"><EntregasTab /></TabsContent>
      </Tabs>
    </>
  );
}

function DashboardEst() {
  const totalItens = estoqueItens.length;
  const valorTotal = estoqueItens.reduce((s, i) => s + i.quantidade * i.custo, 0);
  const baixos = estoqueItens.filter((i) => i.status === "Baixo").length;
  const criticos = estoqueItens.filter((i) => i.status === "Crítico").length;
  const entradas = movimentacoesEstoque.filter((m) => m.tipo === "Entrada").length;
  const saidas = movimentacoesEstoque.filter((m) => m.tipo === "Saída").length;

  const porCategoria = Object.entries(
    estoqueItens.reduce<Record<string, number>>((acc, i) => {
      acc[i.categoria] = (acc[i.categoria] ?? 0) + i.quantidade * i.custo;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const topConsumo = estoqueItens.slice(0, 6).map((i) => ({ nome: i.produto.split(" ").slice(0, 2).join(" "), qtd: i.quantidade }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Itens cadastrados" value={totalItens} icon={Package} tone="primary" />
        <StatCard label="Valor em estoque" value={fmtBRL(valorTotal)} icon={Boxes} tone="info" />
        <StatCard label="Itens baixos" value={baixos} icon={TrendingDown} tone="warning" />
        <StatCard label="Itens críticos" value={criticos} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Entradas (mês)" value={entradas} icon={ArrowDownCircle} tone="success" />
        <StatCard label="Saídas (mês)" value={saidas} icon={ArrowUpCircle} tone="info" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-3 text-sm font-semibold">Valor por categoria</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} paddingAngle={2}>
                {porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 bg-[image:var(--gradient-card)]">
          <div className="mb-3 text-sm font-semibold">Quantidade por produto</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topConsumo}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="qtd" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

type ItemEstoque = { id: string; produto: string; categoria: string; unidade: string; quantidade: number; minimo: number };

const UNIDADES = ["UN", "PÇ", "M", "M²", "KG", "L", "PAR", "KIT", "CX"];
const CATEGORIAS_PADRAO = ["MÓDULO", "INVERSOR", "ESTRUTURA", "CABO", "ACESSÓRIO", "PROTEÇÃO", "FERRAMENTA"];

const seedItens: ItemEstoque[] = estoqueItens.map((i) => ({
  id: i.id, produto: i.produto, categoria: i.categoria, unidade: "UN", quantidade: i.quantidade, minimo: i.minimo,
}));

function ItensTab({ onlyAlerts = false }: { onlyAlerts?: boolean }) {
  const [items, setItems] = useState<ItemEstoque[]>(seedItens);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todas");
  const [openNovo, setOpenNovo] = useState(false);
  const [openAtt, setOpenAtt] = useState(false);
  const [novo, setNovo] = useState({ produto: "", categoria: "", unidade: "UN", quantidade: "" });
  const [updates, setUpdates] = useState<Record<string, string>>({});

  const cats = Array.from(new Set([...CATEGORIAS_PADRAO, ...items.map((i) => i.categoria.toUpperCase())]));
  const filterCats = Array.from(new Set(items.map((i) => i.categoria)));
  const list = items
    .filter((i) => !onlyAlerts || i.quantidade <= i.minimo)
    .filter((i) => cat === "todas" || i.categoria === cat)
    .filter((i) => [i.produto, i.id].some((v) => v.toLowerCase().includes(q.toLowerCase())));

  const addItem = () => {
    if (!novo.produto.trim() || !novo.categoria.trim() || !novo.unidade.trim()) {
      toast.error("Preencha nome, categoria e unidade");
      return;
    }
    const id = `IT-${String(items.length + 1).padStart(3, "0")}`;
    setItems([
      { id, produto: novo.produto.toUpperCase(), categoria: novo.categoria.toUpperCase(), unidade: novo.unidade.toUpperCase(), quantidade: Number(novo.quantidade) || 0, minimo: 0 },
      ...items,
    ]);
    setNovo({ produto: "", categoria: "", unidade: "UN", quantidade: "" });
    setOpenNovo(false);
    toast.success("Item cadastrado");
  };

  const openAttList = () => {
    setUpdates({});
    setOpenAtt(true);
  };

  const salvarUpdates = () => {
    const changes = Object.entries(updates).filter(([, v]) => v !== "" && !Number.isNaN(Number(v)));
    if (changes.length === 0) {
      toast.error("Nenhuma quantidade alterada");
      return;
    }
    const map = new Map(changes.map(([k, v]) => [k, Number(v)]));
    setItems(items.map((i) => map.has(i.id) ? { ...i, quantidade: map.get(i.id)! } : i));
    setUpdates({});
    setOpenAtt(false);
    toast.success(`${changes.length} item(ns) atualizado(s)`);
  };

  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar item" className="pl-9 bg-input/60" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {filterCats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={openAttList}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar estoque
        </Button>
        <Button onClick={() => setOpenNovo(true)} className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> Novo item
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Nome do item</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead className="text-right">Quantidade atual</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {list.map((i) => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.produto}</TableCell>
              <TableCell className="text-muted-foreground">{i.categoria}</TableCell>
              <TableCell className="text-right font-medium">{i.quantidade}</TableCell>
            </TableRow>
          ))}
          {list.length === 0 && (
            <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">Nenhum item encontrado</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={openNovo} onOpenChange={setOpenNovo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo item</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>Nome do item</Label>
              <Input value={novo.produto} onChange={(e) => setNovo({ ...novo, produto: e.target.value })} placeholder="Ex.: PAINEL 550W" />
            </div>
            <div className="grid gap-1">
              <Label>Categoria</Label>
              <Select value={novo.categoria} onValueChange={(v) => setNovo({ ...novo, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Unidade de medida</Label>
              <Select value={novo.unidade} onValueChange={(v) => setNovo({ ...novo, unidade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Quantidade inicial</Label>
              <Input type="number" min={0} value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
            <Button onClick={addItem}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAtt} onOpenChange={setOpenAtt}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Atualizar estoque</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead>Nome do item</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Quantidade atual</TableHead>
                <TableHead className="text-right w-40">Quantidade a atualizar</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.produto}</TableCell>
                    <TableCell className="text-muted-foreground">{i.unidade}</TableCell>
                    <TableCell className="text-right">{i.quantidade}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={0} value={updates[i.id] ?? ""} placeholder="—"
                        onChange={(e) => setUpdates({ ...updates, [i.id]: e.target.value })}
                        className="h-8 text-right" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAtt(false)}>Cancelar</Button>
            <Button onClick={salvarUpdates}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function MovTab() {
  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-semibold">Movimentações recentes</div>
        <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> Nova movimentação
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>ID</TableHead><TableHead>Data</TableHead><TableHead>Produto</TableHead>
          <TableHead>Tipo</TableHead><TableHead className="text-right">Qtd</TableHead>
          <TableHead>Obra</TableHead><TableHead>Responsável</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {movimentacoesEstoque.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-mono text-xs text-primary">{m.id}</TableCell>
              <TableCell className="text-muted-foreground">{m.data}</TableCell>
              <TableCell className="font-medium">{m.produto}</TableCell>
              <TableCell><StatusBadge status={m.tipo} /></TableCell>
              <TableCell className="text-right font-medium">{m.quantidade}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{m.obra ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{m.responsavel}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ===================== Entregas Realizadas =====================
const STATUS_PRIO: Record<string, number> = {
  "Executando instalação": 1,
  "Aguardando instalação": 2,
  "Em projeto/aprovação": 3,
  "Standby": 4,
  "Finalizado": 5,
};

const MATERIAIS = [
  { key: "hook", label: "Hook", calc: (m: number) => m * 2 },
  { key: "trilho", label: "Trilho", calc: (m: number) => m },
  { key: "minitrilho", label: "Minitrilho", calc: (m: number) => Math.round(m * 2.2) },
  { key: "solo", label: "Solo", calc: (m: number) => Math.round(m / 4) },
  { key: "intermediario", label: "Intermediário", calc: (m: number) => m * 2 },
  { key: "final", label: "Final", calc: (m: number) => m },
  { key: "cabo", label: "Cabo (m)", calc: (m: number) => Math.round(m * 3.5) },
  { key: "mc4", label: "MC4", calc: (m: number) => Math.ceil(m / 8) },
] as const;

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, mo, d] = iso.split("-");
  return d && mo && y ? `${d}/${mo}/${y}` : iso;
}

function EntregasTab() {
  const [realizado, setRealizado] = useState<Record<string, Record<string, string>>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows = [...obrasSeed].sort((a, b) => {
    const pa = STATUS_PRIO[a.status] ?? 99;
    const pb = STATUS_PRIO[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    if (!a.inicio && !b.inicio) return 0;
    if (!a.inicio) return 1;
    if (!b.inicio) return -1;
    return a.inicio.localeCompare(b.inicio);
  });

  const setReal = (obraId: string, key: string, v: string) =>
    setRealizado((s) => ({ ...s, [obraId]: { ...(s[obraId] ?? {}), [key]: v } }));

  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const totalSugerido = (mods: number) => MATERIAIS.reduce((s, m) => s + m.calc(mods), 0);
  const totalRealizado = (id: string) =>
    MATERIAIS.reduce((s, m) => s + (Number(realizado[id]?.[m.key]) || 0), 0);

  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Truck className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Entregas Realizadas</div>
        <div className="ml-auto text-xs text-muted-foreground">
          Fonte: Engenharia &gt; Obras Ativas · {rows.length} obra(s)
        </div>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <TableHead>Status</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Módulos</TableHead>
            <TableHead className="text-right">kWp</TableHead>
            <TableHead>INV1</TableHead>
            <TableHead>INV2</TableHead>
            <TableHead>INV3</TableHead>
            <TableHead>Telhado</TableHead>
            <TableHead>Equipe</TableHead>
            <TableHead>Previsão inicial</TableHead>
            <TableHead className="text-right">A entregar</TableHead>
            <TableHead className="text-right">Entregue/Realizado</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((o) => {
              const isOpen = !!expanded[o.id];
              const sug = totalSugerido(o.modulos);
              const real = totalRealizado(o.id);
              return (
                <>
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => toggle(o.id)}>
                    <TableCell>
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="font-medium">{o.cliente}</TableCell>
                    <TableCell className="text-right">{o.modulos}</TableCell>
                    <TableCell className="text-right">{o.potencia.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">{o.inversor || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">{o.telhado}</TableCell>
                    <TableCell className="text-muted-foreground">{o.equipe || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDateBR(o.inicio)}</TableCell>
                    <TableCell className="text-right font-medium">{sug}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={real >= sug ? "text-success" : real > 0 ? "text-warning" : "text-muted-foreground"}>
                        {real}
                      </span>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={`${o.id}-det`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell />
                      <TableCell colSpan={12} className="py-3">
                        <div className="rounded-md border border-border bg-background/50 p-3">
                          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                            Materiais — {o.cliente} · {o.modulos} módulos
                          </div>
                          <Table>
                            <TableHeader><TableRow className="hover:bg-transparent">
                              <TableHead>Material</TableHead>
                              <TableHead className="text-right">Sugerido</TableHead>
                              <TableHead className="text-right w-40">Realizado</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {MATERIAIS.map((m) => {
                                const s = m.calc(o.modulos);
                                return (
                                  <TableRow key={m.key}>
                                    <TableCell className="font-medium">{m.label}</TableCell>
                                    <TableCell className="text-right">{s}</TableCell>
                                    <TableCell className="text-right">
                                      <Input
                                        type="number"
                                        min={0}
                                        value={realizado[o.id]?.[m.key] ?? ""}
                                        placeholder={String(s)}
                                        onChange={(e) => setReal(o.id, m.key, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-8 text-right"
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
