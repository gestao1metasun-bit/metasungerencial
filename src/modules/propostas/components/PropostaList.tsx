// PropostaList — duas visualizações: TABELA e KANBAN.
// Kanban: colunas configuráveis (criar, renomear, excluir, reordenar) e
// arrastar propostas entre colunas (HTML5 DnD). Estado persistido em
// localStorage independente do store de propostas.
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Pencil, Eye, Copy, Trash2, Sparkles, LayoutGrid, Table as TableIcon,
  ChevronLeft, ChevronRight, X, Check, Lock, Search, FilterX,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  type PropostaFV, type StatusProposta,
  upsertProposta, removeProposta, proximoNumeroProposta,
  calcDimensionamento, calcPrecificacao, calcResultado, fmtBRL, fmtNum,
} from "@/modules/propostas/store";

export function statusVariant(s: StatusProposta): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "APROVADA": return "default";
    case "GERADA":
    case "ENVIADA": return "secondary";
    case "RECUSADA":
    case "VENCIDA":
    case "CANCELADA": return "destructive";
    default: return "outline";
  }
}

function readLS<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}
function writeLS(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }

function usePropostasSync(): PropostaFV[] {
  return readLS<PropostaFV[]>("ms.fv.propostas.v1", []);
}

export function duplicarProposta(p: PropostaFV) {
  const lista = usePropostasSync();
  const numero = proximoNumeroProposta(lista);
  const copia: PropostaFV = {
    ...p,
    id: `PRID-${Date.now()}`,
    numero,
    status: "RASCUNHO",
    criadoEm: new Date().toISOString().slice(0, 10),
    atualizadoEm: new Date().toISOString().slice(0, 10),
    contratoGeradoId: undefined,
  };
  upsertProposta(copia);
  toast.success(`Proposta duplicada como ${numero}`);
}

export function excluirProposta(p: PropostaFV) {
  if (!confirm(`Excluir proposta ${p.numero}? Esta ação não pode ser desfeita.`)) return;
  removeProposta(p.id);
  toast.success("Proposta excluída.");
}

function diasDesde(iso?: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}
function dotColorFor(dias: number): string {
  if (dias <= 3) return "bg-success";
  if (dias <= 7) return "bg-info";
  if (dias <= 15) return "bg-warning";
  return "bg-destructive";
}

/* ===================== KANBAN ===================== */

type KCol = { id: string; titulo: string };
const COLS_KEY = "ms.fv.kanban.cols.v1";
const ASSIGN_KEY = "ms.fv.kanban.assign.v1";

const DEFAULT_COLS: KCol[] = [
  { id: "col-rascunho", titulo: "Rascunho" },
  { id: "col-enviada", titulo: "Enviadas" },
  { id: "col-negociacao", titulo: "Em negociação" },
  { id: "col-aprovada", titulo: "Aprovadas" },
  { id: "col-perdida", titulo: "Perdidas" },
];

function colPadraoPorStatus(s: StatusProposta): string {
  switch (s) {
    case "RASCUNHO": return "col-rascunho";
    case "GERADA":
    case "ENVIADA": return "col-enviada";
    case "APROVADA": return "col-aprovada";
    case "RECUSADA":
    case "VENCIDA":
    case "CANCELADA": return "col-perdida";
    default: return "col-rascunho";
  }
}

function useKanbanState(propostas: PropostaFV[]) {
  const [cols, setCols] = useState<KCol[]>(() => {
    const saved = readLS<KCol[]>(COLS_KEY, []);
    return saved.length ? saved : DEFAULT_COLS;
  });
  const [assign, setAssign] = useState<Record<string, string>>(() => readLS(ASSIGN_KEY, {} as Record<string, string>));

  useEffect(() => writeLS(COLS_KEY, cols), [cols]);
  useEffect(() => writeLS(ASSIGN_KEY, assign), [assign]);

  // Garante alocação padrão para propostas novas / colunas removidas
  useEffect(() => {
    setAssign((prev) => {
      const next = { ...prev };
      const validIds = new Set(cols.map((c) => c.id));
      let mudou = false;
      for (const p of propostas) {
        if (!next[p.id] || !validIds.has(next[p.id])) {
          const padrao = colPadraoPorStatus(p.status);
          next[p.id] = validIds.has(padrao) ? padrao : cols[0]?.id ?? "col-rascunho";
          mudou = true;
        }
      }
      return mudou ? next : prev;
    });
  }, [propostas, cols]);

  return { cols, setCols, assign, setAssign };
}

function KanbanView({
  propostas, onEditar, onVisualizar,
}: {
  propostas: PropostaFV[];
  onEditar: (p: PropostaFV) => void;
  onVisualizar: (id: string) => void;
}) {
  const { cols, setCols, assign, setAssign } = useKanbanState(propostas);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editandoCol, setEditandoCol] = useState<string | null>(null);
  const [tituloEdit, setTituloEdit] = useState("");
  const [dragProp, setDragProp] = useState<string | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusProposta | "TODOS">("TODOS");

  const propostasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return propostas.filter((p) => {
      if (filtroStatus !== "TODOS" && p.status !== filtroStatus) return false;
      if (!q) return true;
      return (
        (p.clienteNome || "").toLowerCase().includes(q) ||
        (p.consultor || "").toLowerCase().includes(q) ||
        (p.numero || "").toLowerCase().includes(q)
      );
    });
  }, [propostas, filtro, filtroStatus]);

  const porColuna = useMemo(() => {
    const map: Record<string, PropostaFV[]> = {};
    cols.forEach((c) => (map[c.id] = []));
    propostasFiltradas.forEach((p) => {
      const c = assign[p.id] ?? colPadraoPorStatus(p.status);
      if (!map[c]) map[c] = [];
      map[c].push(p);
    });
    return map;
  }, [cols, propostasFiltradas, assign]);

  const adicionarCol = () => {
    const t = novoTitulo.trim();
    if (!t) return;
    setCols((c) => [...c, { id: `col-${Date.now()}`, titulo: t }]);
    setNovoTitulo("");
    setPopoverOpen(false);
  };
  const excluirCol = (id: string) => {
    if (cols.length <= 1) return toast.error("Mantenha pelo menos uma coluna.");
    if (!confirm("Excluir esta coluna? Propostas voltam para a primeira.")) return;
    setCols((c) => c.filter((x) => x.id !== id));
  };
  const renomear = (id: string) => {
    const t = tituloEdit.trim();
    if (!t) return;
    setCols((c) => c.map((x) => (x.id === id ? { ...x, titulo: t } : x)));
    setEditandoCol(null);
  };
  const moverCol = (id: string, dir: -1 | 1) => {
    setCols((c) => {
      const i = c.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.length) return c;
      const cp = [...c]; [cp[i], cp[j]] = [cp[j], cp[i]]; return cp;
    });
  };
  const dropEmColuna = (colId: string) => {
    if (dragProp) {
      setAssign((a) => ({ ...a, [dragProp]: colId }));
      setDragProp(null);
    } else if (dragCol && dragCol !== colId) {
      setCols((c) => {
        const from = c.findIndex((x) => x.id === dragCol);
        const to = c.findIndex((x) => x.id === colId);
        if (from < 0 || to < 0) return c;
        const cp = [...c]; const [m] = cp.splice(from, 1); cp.splice(to, 0, m); return cp;
      });
      setDragCol(null);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Input
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionarCol()}
          placeholder="Nome da nova coluna…"
          className="h-8 max-w-xs"
        />
        <Button size="sm" onClick={adicionarCol} className="gap-1">
          <Plus className="h-4 w-4" /> Nova coluna
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          Arraste cards entre colunas. Arraste o título para reordenar colunas.
        </span>
      </Card>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {cols.map((c, idx) => {
          const items = porColuna[c.id] || [];
          const total = items.reduce((s, p) => s + (calcPrecificacao(p).valorFinal || 0), 0);
          return (
            <div
              key={c.id}
              className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dropEmColuna(c.id)}
            >
              <div
                className="flex items-center gap-1 border-b bg-card p-2"
                draggable
                onDragStart={() => { setDragCol(c.id); setDragProp(null); }}
              >
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moverCol(c.id, -1)} disabled={idx === 0}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {editandoCol === c.id ? (
                  <>
                    <Input
                      autoFocus
                      value={tituloEdit}
                      onChange={(e) => setTituloEdit(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && renomear(c.id)}
                      className="h-7"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => renomear(c.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditandoCol(c.id); setTituloEdit(c.titulo); }}
                    className="flex-1 cursor-text truncate px-1 text-left text-sm font-semibold"
                    title="Clique para renomear · arraste para reordenar"
                  >
                    {c.titulo}
                  </button>
                )}
                <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moverCol(c.id, 1)} disabled={idx === cols.length - 1}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => excluirCol(c.id)} title="Excluir coluna">
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <div className="border-b bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
                {fmtBRL(total)}
              </div>
              <div className="flex min-h-[120px] flex-col gap-2 p-2">
                {items.map((p) => {
                  const valor = calcPrecificacao(p).valorFinal || 0;
                  const dias = diasDesde(p.atualizadoEm || p.criadoEm);
                  const bloq = p.status === "APROVADA";
                  return (
                    <Card
                      key={p.id}
                      draggable
                      onDragStart={() => { setDragProp(p.id); setDragCol(null); }}
                      className={`cursor-grab p-2 active:cursor-grabbing ${bloq ? "border-success/40 bg-success/5" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{p.clienteNome || "—"}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {p.numero} · {p.consultor || "sem consultor"}
                          </div>
                        </div>
                        {bloq && <Lock className="h-3.5 w-3.5 shrink-0 text-success" />}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-sm font-semibold">{fmtBRL(valor)}</div>
                        <div className="flex items-center gap-1" title={`${dias} dia(s) no status`}>
                          <span className={`inline-block h-2 w-2 rounded-full ${dotColorFor(dias)}`} />
                          <span className="text-[11px] text-muted-foreground">{dias}d</span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <Badge variant={statusVariant(p.status)} className="text-[10px]">{p.status}</Badge>
                        <div className="flex">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onVisualizar(p.id)} title="Visualizar">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {!bloq && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditar(p)} title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {!items.length && (
                  <div className="rounded border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                    Solte aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== TABELA ===================== */

function TabelaView({
  propostas, onEditar, onVisualizar,
}: {
  propostas: PropostaFV[];
  onEditar: (p: PropostaFV) => void;
  onVisualizar: (id: string) => void;
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Consultor</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead className="text-right">kWp</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Margem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {propostas.map((p) => {
            const dim = calcDimensionamento(p);
            const pre = calcPrecificacao(p);
            const res = calcResultado(p);
            const bloq = p.status === "APROVADA";
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.numero}</TableCell>
                <TableCell>{p.clienteNome || "—"}</TableCell>
                <TableCell>{p.consultor || "—"}</TableCell>
                <TableCell>{p.cidade ? `${p.cidade}/${p.estado}` : "—"}</TableCell>
                <TableCell className="text-right">{fmtNum(dim.potenciaFinalKwp, 2)}</TableCell>
                <TableCell className="text-right">{fmtBRL(pre.valorFinal)}</TableCell>
                <TableCell className={`text-right ${res.margemPct < 0 ? "text-destructive" : res.margemPct < 10 ? "text-warning" : ""}`}>
                  {fmtNum(res.margemPct, 1)}%
                </TableCell>
                <TableCell><Badge variant={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                <TableCell>{p.validade}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" title="Visualizar" onClick={() => onVisualizar(p.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!bloq && (
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => onEditar(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicarProposta(p)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!bloq && (
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => excluirProposta(p)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ===================== ROOT ===================== */

const VIEW_KEY = "ms.fv.propostas.view";
type ViewMode = "tabela" | "kanban";

export function PropostaList({
  propostas, onEditar, onVisualizar, onNova,
}: {
  propostas: PropostaFV[];
  onEditar: (p: PropostaFV) => void;
  onVisualizar: (id: string) => void;
  onNova: () => void;
}) {
  // Auto-vence propostas passadas da validade
  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    propostas.forEach((p) => {
      if (p.status === "ENVIADA" && p.validade && p.validade < hoje) {
        upsertProposta({ ...p, status: "VENCIDA", atualizadoEm: hoje });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propostas.length]);

  const [view, setView] = useState<ViewMode>(() => (readLS<ViewMode>(VIEW_KEY, "tabela")));
  useEffect(() => writeLS(VIEW_KEY, view), [view]);

  const totais = useMemo(() => {
    const total = propostas.length;
    const aprovadas = propostas.filter((p) => p.status === "APROVADA").length;
    const enviadas = propostas.filter((p) => p.status === "ENVIADA").length;
    const valorTotalAprovado = propostas
      .filter((p) => p.status === "APROVADA")
      .reduce((s, p) => s + (calcPrecificacao(p).valorFinal || 0), 0);
    return { total, aprovadas, enviadas, valorTotalAprovado };
  }, [propostas]);

  if (!propostas.length) {
    return (
      <Card className="p-12 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h3 className="text-lg font-semibold">Nenhuma proposta criada ainda</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Crie sua primeira proposta fotovoltaica em poucos minutos.
        </p>
        <Button onClick={onNova} className="mt-4 gap-2">
          <Plus className="h-4 w-4" /> Criar primeira proposta
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-semibold">{totais.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Enviadas</div><div className="text-2xl font-semibold">{totais.enviadas}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Aprovadas</div><div className="text-2xl font-semibold text-success">{totais.aprovadas}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Valor aprovado</div><div className="text-2xl font-semibold">{fmtBRL(totais.valorTotalAprovado)}</div></Card>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={view === "tabela" ? "default" : "outline"}
          onClick={() => setView("tabela")}
          className="gap-1"
        >
          <TableIcon className="h-4 w-4" /> Tabela
        </Button>
        <Button
          size="sm"
          variant={view === "kanban" ? "default" : "outline"}
          onClick={() => setView("kanban")}
          className="gap-1"
        >
          <LayoutGrid className="h-4 w-4" /> Kanban
        </Button>
      </div>

      {view === "tabela"
        ? <TabelaView propostas={propostas} onEditar={onEditar} onVisualizar={onVisualizar} />
        : <KanbanView propostas={propostas} onEditar={onEditar} onVisualizar={onVisualizar} />}
    </div>
  );
}
