// PropostaList — visualizações Tabela e Kanban agrupadas por LEAD (cliente).
// - Cada lead = todas as propostas de um cliente (chave = clienteDoc ou nome).
// - Valor do lead = última proposta (mais recente).
// - Clicar em qualquer parte do card/linha do lead abre o detalhe.
// - No detalhe: dados do cliente + abas (Dados / Propostas) + botão "Gerar nova proposta".
// - Kanban: arrastar o card move o lead inteiro; reordenar colunas = arrastar header.
// - Botão "Colunas" abre um gerenciador (criar, renomear, ativar/desativar, reordenar).
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Eye, Copy, Trash2, Sparkles, LayoutGrid, Table as TableIcon,
  Lock, Search, FilterX, Columns3, GripVertical, ArrowUp, ArrowDown,
  X, Check, Pencil, FilePlus2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  type PropostaFV, type StatusProposta,
  upsertProposta, removeProposta, proximoNumeroProposta,
  calcPrecificacao, fmtBRL,
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
  if (p.status !== "RASCUNHO") {
    toast.error("Propostas geradas não podem ser excluídas.");
    return;
  }
  if (!confirm(`Excluir proposta ${p.numero}? Esta ação não pode ser desfeita.`)) return;
  removeProposta(p.id);
  toast.success("Proposta excluída.");
}

export function aprovarProposta(p: PropostaFV) {
  if (!confirm(`Aprovar a proposta ${p.numero}? Ela será convertida em contrato e o card ficará bloqueado.`)) return;
  const hoje = new Date().toISOString().slice(0, 10);
  upsertProposta({ ...p, status: "APROVADA", atualizadoEm: hoje });
  toast.success(`Proposta ${p.numero} aprovada — enviada ao comercial.`);
}

/** Aprova uma proposta atualizando os dados de cliente em todas as propostas do lead. */
function aprovarComDadosCliente(
  propostas: PropostaFV[],
  escolhida: PropostaFV,
  dados: Partial<PropostaFV>,
  dataAssinatura: string,
) {
  const hoje = new Date().toISOString().slice(0, 10);
  for (const p of propostas) {
    const isEscolhida = p.id === escolhida.id;
    upsertProposta({
      ...p,
      ...dados,
      status: isEscolhida ? "APROVADA" : p.status,
      dataAssinatura: isEscolhida ? dataAssinatura : p.dataAssinatura,
      atualizadoEm: hoje,
    });
  }
  toast.success(`Proposta ${escolhida.numero} aprovada — enviada ao comercial.`);
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
/** Formata YYYY-MM-DD → DD-MM-YYYY. Aceita ISO completos também. */
function fmtData(iso?: string): string {
  if (!iso) return "—";
  const s = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/* ===================== LEADS ===================== */

type Lead = {
  key: string;
  clienteNome: string;
  clienteDoc?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  clienteEndereco?: string;
  consultor?: string;
  cidade?: string;
  estado?: string;
  propostas: PropostaFV[];
  ultima: PropostaFV;
  primeira: PropostaFV;
  dataPrimeira: string;
  valor: number;
  dias: number;
  bloqueado: boolean;
  status: StatusProposta;
};

function leadKey(p: PropostaFV): string {
  return (p.clienteDoc?.trim() || (p.clienteNome || "").trim().toLowerCase() || p.id);
}

function buildLeads(props: PropostaFV[]): Lead[] {
  const map = new Map<string, PropostaFV[]>();
  for (const p of props) {
    const k = leadKey(p);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  const leads: Lead[] = [];
  for (const [key, arr] of map) {
    const sorted = [...arr].sort((a, b) =>
      (b.atualizadoEm || b.criadoEm || "").localeCompare(a.atualizadoEm || a.criadoEm || "")
    );
    const ultima = sorted[0];
    const primeira = sorted[sorted.length - 1];
    leads.push({
      key,
      clienteNome: ultima.clienteNome || "—",
      clienteDoc: ultima.clienteDoc,
      clienteTelefone: ultima.clienteTelefone,
      clienteEmail: ultima.clienteEmail,
      clienteEndereco: ultima.clienteEndereco,
      consultor: ultima.consultor,
      cidade: ultima.cidade,
      estado: ultima.estado,
      propostas: sorted,
      ultima,
      primeira,
      dataPrimeira: primeira.criadoEm || primeira.atualizadoEm || "",
      valor: calcPrecificacao(ultima).valorFinal || 0,
      dias: diasDesde(ultima.atualizadoEm || ultima.criadoEm),
      bloqueado: arr.some((p) => p.status === "APROVADA"),
      status: ultima.status,
    });
  }
  return leads;
}

function presetFromLead(l: Lead): Partial<PropostaFV> {
  const u = l.ultima;
  return {
    clienteId: u.clienteId,
    clienteNome: u.clienteNome,
    clienteDoc: u.clienteDoc,
    clienteTelefone: u.clienteTelefone,
    clienteEmail: u.clienteEmail,
    clienteEndereco: u.clienteEndereco,
    clienteCep: u.clienteCep,
    clienteRua: u.clienteRua,
    clienteNumero: u.clienteNumero,
    clienteComplemento: u.clienteComplemento,
    clienteBairro: u.clienteBairro,
    clienteCidade: u.clienteCidade,
    clienteUf: u.clienteUf,
    consultor: u.consultor,
  };
}

/* ===================== KANBAN: colunas ===================== */

type KCol = { id: string; titulo: string; ativo?: boolean; locked?: boolean };
const COLS_KEY = "ms.fv.kanban.cols.v3";
const ASSIGN_KEY = "ms.fv.kanban.assign-leads.v1";

// Coluna final fixa (não pode ser excluída, desativada, renomeada nem reordenada).
const COL_CONTRATO_ID = "col-contrato-assinado";
const COL_CONTRATO: KCol = {
  id: COL_CONTRATO_ID,
  titulo: "CONTRATO ASSINADO — COMERCIAL",
  ativo: true,
  locked: true,
};

const DEFAULT_COLS: KCol[] = [
  { id: "col-rascunho", titulo: "Rascunho", ativo: true },
  { id: "col-enviada", titulo: "Enviadas", ativo: true },
  { id: "col-negociacao", titulo: "Em negociação", ativo: true },
  { id: "col-aprovada", titulo: "Aprovadas", ativo: true },
  { id: "col-perdida", titulo: "Perdidas", ativo: true },
  COL_CONTRATO,
];

// Garante que a coluna fixa exista e seja sempre a última do array.
function normalizeCols(cols: KCol[]): KCol[] {
  const semFixa = cols.filter((c) => c.id !== COL_CONTRATO_ID);
  return [...semFixa, { ...COL_CONTRATO }];
}

function colPadraoPorStatus(s: StatusProposta): string {
  switch (s) {
    case "RASCUNHO": return "col-rascunho";
    case "GERADA":
    case "ENVIADA": return "col-enviada";
    case "APROVADA": return COL_CONTRATO_ID;
    case "RECUSADA":
    case "VENCIDA":
    case "CANCELADA": return "col-perdida";
    default: return "col-rascunho";
  }
}

function useKanbanState(leads: Lead[]) {
  const [cols, setColsRaw] = useState<KCol[]>(() => {
    const saved = readLS<KCol[]>(COLS_KEY, []);
    const base = saved.length ? saved.map((c) => ({ ...c, ativo: c.ativo !== false })) : DEFAULT_COLS;
    return normalizeCols(base);
  });
  const setCols: typeof setColsRaw = (updater) => {
    setColsRaw((prev) => {
      const next = typeof updater === "function" ? (updater as (c: KCol[]) => KCol[])(prev) : updater;
      return normalizeCols(next);
    });
  };
  const [assign, setAssign] = useState<Record<string, string>>(() => readLS(ASSIGN_KEY, {} as Record<string, string>));

  useEffect(() => writeLS(COLS_KEY, cols), [cols]);
  useEffect(() => writeLS(ASSIGN_KEY, assign), [assign]);

  // Atribui coluna padrão para leads novos OU para leads cuja coluna foi removida/desativada.
  // Leads aprovados são forçados para a coluna fixa "CONTRATO ASSINADO — COMERCIAL".
  useEffect(() => {
    setAssign((prev) => {
      const next = { ...prev };
      const ativosIds = new Set(cols.filter((c) => c.ativo !== false).map((c) => c.id));
      let mudou = false;
      for (const l of leads) {
        if (l.bloqueado) {
          if (next[l.key] !== COL_CONTRATO_ID) { next[l.key] = COL_CONTRATO_ID; mudou = true; }
          continue;
        }
        if (!next[l.key] || !ativosIds.has(next[l.key]) || next[l.key] === COL_CONTRATO_ID) {
          const padrao = colPadraoPorStatus(l.status);
          next[l.key] = ativosIds.has(padrao) ? padrao : (cols.find((c) => c.ativo !== false && c.id !== COL_CONTRATO_ID)?.id ?? "col-rascunho");
          mudou = true;
        }
      }
      return mudou ? next : prev;
    });
  }, [leads, cols]);

  return { cols, setCols, assign, setAssign };
}

/* ===================== Gerenciador de Colunas ===================== */

function ColunasManager({
  open, onOpenChange, cols, setCols,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cols: KCol[];
  setCols: (fn: (c: KCol[]) => KCol[]) => void;
}) {
  const [novoTitulo, setNovoTitulo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [tituloEdit, setTituloEdit] = useState("");

  const adicionar = () => {
    const t = novoTitulo.trim();
    if (!t) return;
    setCols((c) => [...c, { id: `col-${Date.now()}`, titulo: t, ativo: true }]);
    setNovoTitulo("");
  };
  const renomear = (id: string) => {
    const t = tituloEdit.trim();
    if (!t) return;
    setCols((c) => c.map((x) => (x.id === id ? { ...x, titulo: t } : x)));
    setEditId(null);
  };
  const toggleAtivo = (id: string) => setCols((c) => c.map((x) => (x.id === id ? { ...x, ativo: x.ativo === false } : x)));
  const excluir = (id: string) => {
    if (cols.find((x) => x.id === id)?.locked) return toast.error("Esta coluna é fixa do sistema.");
    if (cols.length <= 1) return toast.error("Mantenha pelo menos uma coluna.");
    if (!confirm("Excluir esta coluna?")) return;
    setCols((c) => c.filter((x) => x.id !== id));
  };
  const mover = (id: string, dir: -1 | 1) => {
    setCols((c) => {
      const i = c.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.length) return c;
      // não pode mover a coluna fixa, nem trocar de posição com ela
      if (c[i].locked || c[j].locked) return c;
      const cp = [...c]; [cp[i], cp[j]] = [cp[j], cp[i]]; return cp;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="h-5 w-5" /> Gerenciar colunas do Kanban
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2 rounded-md border bg-muted/30 p-2">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Nova coluna</label>
              <Input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionar()}
                placeholder="Ex.: Visita técnica"
                className="h-8"
              />
            </div>
            <Button size="sm" onClick={adicionar} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Colunas cadastradas</div>
            {cols.map((c, idx) => (
              <div key={c.id} className={`flex items-center gap-2 rounded-md border p-2 ${c.ativo === false ? "bg-muted/40 opacity-60" : "bg-card"} ${c.locked ? "border-success/50" : ""}`}>
                <GripVertical className={`h-4 w-4 ${c.locked ? "text-success/60" : "text-muted-foreground"}`} />
                {editId === c.id && !c.locked ? (
                  <>
                    <Input
                      autoFocus
                      value={tituloEdit}
                      onChange={(e) => setTituloEdit(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && renomear(c.id)}
                      className="h-7 flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renomear(c.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { if (c.locked) return; setEditId(c.id); setTituloEdit(c.titulo); }}
                    className={`flex-1 truncate text-left text-sm font-medium ${c.locked ? "cursor-default" : ""}`}
                    title={c.locked ? "Coluna fixa do sistema" : "Clique para renomear"}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.locked && <Lock className="h-3 w-3 text-success" />}
                      {c.titulo}
                    </span>
                  </button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(c.id, -1)} disabled={idx === 0 || c.locked || cols[idx - 1]?.locked} title="Subir">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(c.id, 1)} disabled={idx === cols.length - 1 || c.locked || cols[idx + 1]?.locked} title="Descer">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-1">
                  <span className="text-[10px] uppercase text-muted-foreground">Ativa</span>
                  <Switch checked={c.ativo !== false} onCheckedChange={() => toggleAtivo(c.id)} disabled={c.locked} />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluir(c.id)} title="Excluir" disabled={c.locked}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== Lead Detail Dialog ===================== */

function LeadDetail({
  lead, onClose, onVisualizar, onNova, onEditar,
}: {
  lead: Lead | null;
  onClose: () => void;
  onVisualizar: (id: string) => void;
  onNova: (preset?: Partial<PropostaFV>) => void;
  onEditar: (p: PropostaFV) => void;
}) {
  const [aprovarAlvo, setAprovarAlvo] = useState<PropostaFV | null>(null);
  if (!lead) return null;
  const enderecoLinha = [
    lead.clienteEndereco,
    lead.cidade ? `${lead.cidade}${lead.estado ? "/" + lead.estado : ""}` : "",
  ].filter(Boolean).join(" — ");

  return (
    <Dialog open={!!lead} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{lead.clienteNome}</span>
            {lead.bloqueado && (
              <Badge variant="default" className="gap-1"><Lock className="h-3 w-3" /> Aprovado</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="mt-2">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="propostas">Propostas ({lead.propostas.length})</TabsTrigger>
            <TabsTrigger value="aprovar" disabled={lead.bloqueado}>
              {lead.bloqueado ? "Aprovada ✓" : "Aprovar proposta"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" value={lead.clienteNome} />
              <Field label="CPF / CNPJ" value={lead.clienteDoc} />
              <Field label="Telefone" value={lead.clienteTelefone} />
              <Field label="E-mail" value={lead.clienteEmail} />
              <Field label="Endereço" value={enderecoLinha || "—"} className="sm:col-span-2" />
              <Field label="Consultor" value={lead.consultor} />
              <Field label="Valor (última proposta)" value={fmtBRL(lead.valor)} />
            </div>
          </TabsContent>

          <TabsContent value="propostas" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {lead.propostas.length} proposta(s) — última: <strong>{lead.ultima.numero}</strong>
              </div>
              {!lead.bloqueado && (
                <Button size="sm" onClick={() => onNova(presetFromLead(lead))} className="gap-1">
                  <FilePlus2 className="h-4 w-4" /> Gerar nova proposta
                </Button>
              )}
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lead.propostas.map((p) => {
                    const v = calcPrecificacao(p).valorFinal || 0;
                    const ehRascunho = p.status === "RASCUNHO";
                    const podeEditar = ehRascunho && !lead.bloqueado;
                    const podeExcluir = ehRascunho && !lead.bloqueado;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.numero}</TableCell>
                        <TableCell><Badge variant={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                        <TableCell>{fmtData(p.criadoEm || p.atualizadoEm)}</TableCell>
                        <TableCell className="text-right">{fmtBRL(v)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Visualizar" onClick={() => onVisualizar(p.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {podeEditar && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar rascunho" onClick={() => { onEditar(p); onClose(); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {podeExcluir && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Excluir" onClick={() => excluirProposta(p)}>
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
            </div>
          </TabsContent>
          <TabsContent value="aprovar" className="mt-4 space-y-3">
            {lead.bloqueado ? (
              <div className="rounded-md border border-success/40 bg-success/5 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium text-success">
                  <Lock className="h-4 w-4" /> Card bloqueado — proposta aprovada
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Este lead já foi convertido em contrato e enviado ao comercial. Não é possível aprovar outra proposta.
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Selecione <strong>uma</strong> proposta para aprovar. Ela será convertida em contrato,
                  enviada ao comercial e o card ficará bloqueado para novas alterações.
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lead.propostas.map((p) => {
                        const v = calcPrecificacao(p).valorFinal || 0;
                        const podeAprovar = ["RASCUNHO", "GERADA", "ENVIADA"].includes(p.status);
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.numero}</TableCell>
                            <TableCell><Badge variant={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                            <TableCell className="text-right">{fmtBRL(v)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={podeAprovar ? "default" : "outline"}
                                disabled={!podeAprovar}
                                onClick={() => setAprovarAlvo(p)}
                                className="gap-1"
                              >
                                <Check className="h-4 w-4" /> Aprovar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>

      <AprovarDialog
        open={!!aprovarAlvo}
        lead={lead}
        proposta={aprovarAlvo}
        onClose={() => setAprovarAlvo(null)}
        onConfirmed={() => { setAprovarAlvo(null); onClose(); }}
      />
    </Dialog>
  );
}

function Field({ label, value, className }: { label: string; value?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

/* ===== Diálogo: editar dados do cliente + aprovar proposta ===== */
function AprovarDialog({
  open, lead, proposta, onClose, onConfirmed,
}: {
  open: boolean;
  lead: Lead | null;
  proposta: PropostaFV | null;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const upper = (v: string) => v.toUpperCase();
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [dataAssinatura, setDataAssinatura] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (!lead) return;
    const u = lead.ultima;
    setNome(lead.clienteNome || "");
    setDoc(u.clienteDoc || "");
    setTel(u.clienteTelefone || "");
    setEmail(u.clienteEmail || "");
    setCep(u.clienteCep || "");
    setRua(u.clienteRua || "");
    setNumero(u.clienteNumero || "");
    setComplemento(u.clienteComplemento || "");
    setBairro(u.clienteBairro || "");
    setCidade(u.clienteCidade || lead.cidade || "");
    setUf(u.clienteUf || lead.estado || "");
    setDataAssinatura(u.dataAssinatura || new Date().toISOString().slice(0, 10));
  }, [lead?.key, proposta?.id]);

  // ViaCEP — busca endereço ao digitar 8 dígitos
  const buscarCep = async (raw: string) => {
    const d = raw.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      setCepLoading(true);
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j?.erro) { toast.error("CEP não encontrado."); return; }
      setRua((j.logradouro || "").toUpperCase());
      setBairro((j.bairro || "").toUpperCase());
      setCidade((j.localidade || "").toUpperCase());
      setUf((j.uf || "").toUpperCase());
      toast.success("Endereço preenchido pelo CEP.");
    } catch {
      toast.error("Falha ao consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  if (!lead || !proposta) return null;

  const confirmar = () => {
    if (!nome.trim()) { toast.error("Informe o nome completo do cliente."); return; }
    if (!doc.trim()) { toast.error("Informe o CPF/CNPJ do cliente."); return; }
    if (!tel.trim()) { toast.error("Informe o telefone do cliente."); return; }
    if (!dataAssinatura) { toast.error("Informe a data de assinatura."); return; }
    const enderecoLinha = [rua, numero, bairro, cidade && `${cidade}${uf ? "/" + uf : ""}`]
      .filter(Boolean).join(", ");
    aprovarComDadosCliente(lead.propostas, proposta, {
      clienteNome: upper(nome.trim()),
      clienteDoc: doc.trim(),
      clienteTelefone: tel.trim(),
      clienteEmail: email.trim().toLowerCase(),
      clienteCep: cep.trim(),
      clienteRua: upper(rua.trim()),
      clienteNumero: numero.trim(),
      clienteComplemento: upper(complemento.trim()),
      clienteBairro: upper(bairro.trim()),
      clienteCidade: upper(cidade.trim()),
      clienteUf: upper(uf.trim()),
      clienteEndereco: upper(enderecoLinha),
    }, dataAssinatura);
    onConfirmed();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-success" />
            Aprovar proposta {proposta.numero}
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
          Confirme/complete os dados do cliente. Ao aprovar, a proposta vira contrato e
          esses dados serão enviados ao comercial.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Nome completo *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">CPF / CNPJ *</Label>
            <Input value={doc} onChange={(e) => setDoc(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Telefone *</Label>
            <Input value={tel} onChange={(e) => setTel(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">CEP</Label>
            <Input value={cep} onChange={(e) => setCep(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Bairro</Label>
            <Input value={bairro} onChange={(e) => setBairro(e.target.value.toUpperCase())} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Rua</Label>
            <Input value={rua} onChange={(e) => setRua(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">Número</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Complemento</Label>
            <Input value={complemento} onChange={(e) => setComplemento(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">Cidade</Label>
            <Input value={cidade} onChange={(e) => setCidade(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">UF</Label>
            <Input maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} className="gap-1">
            <Check className="h-4 w-4" /> Confirmar e aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== KANBAN VIEW ===================== */

function KanbanView({
  leads, onAbrirLead, onNovaPreset, cols, setCols, assign, setAssign,
}: {
  leads: Lead[];
  onAbrirLead: (l: Lead) => void;
  onNovaPreset: (preset?: Partial<PropostaFV>) => void;
  cols: KCol[];
  setCols: (fn: (c: KCol[]) => KCol[]) => void;
  assign: Record<string, string>;
  setAssign: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [dragLead, setDragLead] = useState<string | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);

  const colsAtivas = cols.filter((c) => c.ativo !== false);

  const porColuna = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    colsAtivas.forEach((c) => (map[c.id] = []));
    leads.forEach((l) => {
      const c = assign[l.key] ?? colPadraoPorStatus(l.status);
      if (!map[c]) map[c] = [];
      map[c].push(l);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colsAtivas.map((c) => c.id).join("|"), leads, assign]);

  const dropEmColuna = (colId: string) => {
    if (dragLead) {
      setAssign((a) => ({ ...a, [dragLead]: colId }));
      setDragLead(null);
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
    <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {colsAtivas.map((c) => {
        const items = porColuna[c.id] || [];
        const total = items.reduce((s, l) => s + l.valor, 0);
        return (
          <div
            key={c.id}
            className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropEmColuna(c.id)}
          >
            <div
              className="cursor-grab border-b bg-card px-3 py-2 active:cursor-grabbing"
              draggable
              onDragStart={() => { setDragCol(c.id); setDragLead(null); }}
              title="Arraste para reordenar a coluna"
            >
              <div className="text-sm font-bold uppercase tracking-wide">{c.titulo}</div>
              <div className="mt-1 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor total</div>
                  <div className="truncate text-base font-bold text-primary">{fmtBRL(total)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Contratos</div>
                  <div className="text-base font-bold tabular-nums">{items.length}</div>
                </div>
              </div>
            </div>
            <div className="flex min-h-[120px] flex-col gap-2 p-2">
              {items.map((l) => (
                <Card
                  key={l.key}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDragLead(l.key);
                    setDragCol(null);
                  }}
                  onClick={() => onAbrirLead(l)}
                  className={`cursor-pointer p-2 transition-colors hover:bg-accent/40 active:cursor-grabbing ${l.bloqueado ? "border-success/40 bg-success/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{l.clienteNome}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {l.consultor || "sem consultor"} · {l.propostas.length} proposta(s)
                      </div>
                    </div>
                    {l.bloqueado && <Lock className="h-3.5 w-3.5 shrink-0 text-success" />}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-sm font-semibold">{fmtBRL(l.valor)}</div>
                    <div className="flex items-center gap-1" title={`${l.dias} dia(s) no status`}>
                      <span className={`inline-block h-2 w-2 rounded-full ${dotColorFor(l.dias)}`} />
                      <span className="text-[11px] text-muted-foreground">{l.dias}d</span>
                    </div>
                  </div>
                </Card>
              ))}
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
  );
}

/* ===================== TABELA VIEW ===================== */

function TabelaView({
  leads, onAbrirLead, onNovaPreset,
}: {
  leads: Lead[];
  onAbrirLead: (l: Lead) => void;
  onNovaPreset: (preset?: Partial<PropostaFV>) => void;
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Consultor</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead className="text-right">Propostas</TableHead>
            <TableHead className="text-right">Valor (última)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12">Dias</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((l) => (
            <TableRow
              key={l.key}
              className="cursor-pointer hover:bg-accent/40"
              onClick={() => onAbrirLead(l)}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {l.clienteNome}
                  {l.bloqueado && <Lock className="h-3.5 w-3.5 text-success" />}
                </div>
              </TableCell>
              <TableCell>{l.consultor || "—"}</TableCell>
              <TableCell>{l.cidade ? `${l.cidade}/${l.estado || ""}` : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{l.propostas.length}</TableCell>
              <TableCell className="text-right">{fmtBRL(l.valor)}</TableCell>
              <TableCell><Badge variant={statusVariant(l.status)}>{l.status}</Badge></TableCell>
              <TableCell>
                <div className="flex items-center gap-1" title={`${l.dias} dia(s)`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${dotColorFor(l.dias)}`} />
                  <span className="text-[11px] text-muted-foreground">{l.dias}d</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {!l.bloqueado && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={(e) => { e.stopPropagation(); onNovaPreset(presetFromLead(l)); }}
                  >
                    <FilePlus2 className="h-3.5 w-3.5" /> Nova proposta
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
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
  onNova: (preset?: Partial<PropostaFV>) => void;
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

  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusProposta | "TODOS">("TODOS");
  const [colsOpen, setColsOpen] = useState(false);
  const [leadAberto, setLeadAberto] = useState<Lead | null>(null);

  // Estado de colunas precisa estar acessível tanto pro Kanban quanto pro botão "Colunas"
  const leadsAll = useMemo(() => buildLeads(propostas), [propostas]);
  const { cols, setCols, assign, setAssign } = useKanbanState(leadsAll);

  const leadsFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return leadsAll.filter((l) => {
      if (filtroStatus !== "TODOS" && !l.propostas.some((p) => p.status === filtroStatus)) return false;
      if (!q) return true;
      return (
        l.clienteNome.toLowerCase().includes(q) ||
        (l.consultor || "").toLowerCase().includes(q) ||
        l.propostas.some((p) => (p.numero || "").toLowerCase().includes(q))
      );
    });
  }, [leadsAll, filtro, filtroStatus]);

  const totais = useMemo(() => {
    const total = propostas.length;
    const aprovadas = propostas.filter((p) => p.status === "APROVADA").length;
    const enviadas = propostas.filter((p) => p.status === "ENVIADA").length;
    const valorTotalAprovado = propostas
      .filter((p) => p.status === "APROVADA")
      .reduce((s, p) => s + (calcPrecificacao(p).valorFinal || 0), 0);
    return { total, aprovadas, enviadas, valorTotalAprovado, leads: leadsAll.length };
  }, [propostas, leadsAll]);

  if (!propostas.length) {
    return (
      <Card className="p-12 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h3 className="text-lg font-semibold">Nenhuma proposta criada ainda</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Crie sua primeira proposta fotovoltaica em poucos minutos.
        </p>
        <Button onClick={() => onNova()} className="mt-4 gap-2">
          <Plus className="h-4 w-4" /> Criar primeira proposta
        </Button>
      </Card>
    );
  }

  // Reabrir lead atualizado quando propostas mudam (após gerar nova etc.)
  useEffect(() => {
    if (!leadAberto) return;
    const atual = leadsAll.find((l) => l.key === leadAberto.key);
    if (atual && atual !== leadAberto) setLeadAberto(atual);
    if (!atual) setLeadAberto(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadsAll]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Leads</div><div className="text-2xl font-semibold">{totais.leads}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Enviadas</div><div className="text-2xl font-semibold">{totais.enviadas}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Aprovadas</div><div className="text-2xl font-semibold text-success">{totais.aprovadas}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Valor aprovado</div><div className="text-2xl font-semibold">{fmtBRL(totais.valorTotalAprovado)}</div></Card>
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-2">
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

        <div className="relative ml-2 min-w-[220px] max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por cliente, consultor ou nº…"
            className="h-8 pl-7"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusProposta | "TODOS")}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          {(["TODOS","RASCUNHO","GERADA","ENVIADA","APROVADA","RECUSADA","VENCIDA","CANCELADA"] as const).map((s) => (
            <option key={s} value={s}>{s === "TODOS" ? "Todos os status" : s}</option>
          ))}
        </select>
        {(filtro || filtroStatus !== "TODOS") && (
          <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => { setFiltro(""); setFiltroStatus("TODOS"); }}>
            <FilterX className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}

        {view === "kanban" && (
          <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={() => setColsOpen(true)}>
            <Columns3 className="h-4 w-4" /> Colunas
          </Button>
        )}
      </Card>

      {view === "tabela"
        ? <TabelaView leads={leadsFiltrados} onAbrirLead={setLeadAberto} onNovaPreset={onNova} />
        : <KanbanView leads={leadsFiltrados} onAbrirLead={setLeadAberto} onNovaPreset={onNova} cols={cols} setCols={setCols} assign={assign} setAssign={setAssign} />}

      <ColunasManager open={colsOpen} onOpenChange={setColsOpen} cols={cols} setCols={setCols} />

      <LeadDetail
        lead={leadAberto}
        onClose={() => setLeadAberto(null)}
        onVisualizar={(id) => { onVisualizar(id); setLeadAberto(null); }}
        onNova={(preset) => { onNova(preset); setLeadAberto(null); }}
        onEditar={(p) => onEditar(p)}
      />
    </div>
  );
}
