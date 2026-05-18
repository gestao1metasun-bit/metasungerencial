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
  calcPrecificacao, calcDimensionamento, fmtBRL,
  aprovarPropostaDoLead,
  formatDoc, isDocValido, formatCEP, buscarCEPViaCEP, atualizarCadastroCliente,
} from "@/modules/propostas/store";
import {
  useContratos, type ContratoFull, criarContratoPendenteDeProposta,
} from "@/lib/contratos-store";

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
  // Cadeia de dependência (Entrega 3): bloqueia exclusão se houver contrato vinculado.
  try {
    // import dinâmico para não quebrar SSR/circular
    const { propostaTemContratoVinculado } = require("@/lib/contratos-store");
    const c = propostaTemContratoVinculado(p.id);
    if (c) {
      toast.error(`Proposta possui contrato vinculado (${c.id}). Cancele o contrato antes.`);
      return;
    }
  } catch {}
  if (!confirm(`Excluir proposta ${p.numero}? Esta ação não pode ser desfeita.`)) return;
  removeProposta(p.id);
  toast.success("Proposta excluída.");
}

/** Aprova efetivamente uma proposta após validação de cadastro:
 *  muda status para APROVADA, marca outras versões do mesmo lead como obsoletas
 *  e cria um Contrato em status "Pendente" no Comercial → Cadastrar Contrato. */
export function aprovarProposta(p: PropostaFV) {
  const usuario = p.criadoPor || "Operador";
  aprovarPropostaDoLead(p.id, usuario, "Aprovada em Orçamentos");
  const clienteFull = (p.clienteDoc || p.clienteTelefone || p.clienteCidade) ? {
    nome: p.clienteNome,
    doc: p.clienteDoc ?? "",
    telefone: p.clienteTelefone ?? "",
    email: p.clienteEmail ?? "",
    cep: p.clienteCep ?? "",
    rua: p.clienteRua ?? "",
    numero: p.clienteNumero ?? "",
    bairro: p.clienteBairro ?? "",
    complemento: p.clienteComplemento ?? "",
    cidade: p.clienteCidade ?? p.cidade ?? "",
    uf: p.clienteUf ?? p.estado ?? "",
  } : undefined;
  const valor = (p.valorFinalManual ?? 0) > 0 ? (p.valorFinalManual as number) : (p.valorKit ?? 0);
  const inv1 = p.inversores?.[0]?.inversorId ?? p.inversorMarca ?? "";
  const res = criarContratoPendenteDeProposta({
    propostaId: p.id,
    propostaNumero: p.numero,
    leadId: p.leadId,
    leadNumero: p.leadNumero,
    cliente: p.clienteNome,
    clienteId: p.clienteId,
    clienteFull,
    vendedor: p.consultor ?? p.criadoPor ?? "",
    valor,
    kwp: p.modulosQtd * (p.moduloPotenciaWp / 1000),
    modulos: p.modulosQtd,
    potencia: p.moduloPotenciaWp,
    inv1,
    parametro: String(p.parametroPorKwp ?? ""),
    obs: p.obsInternas,
    usuario,
  });
  toast.success(
    res.jaExistia
      ? `Proposta ${p.numero} aprovada — contrato ${res.contratoId} já existia (Pendente).`
      : `Proposta ${p.numero} aprovada — contrato ${res.contratoId} criado como Pendente no Comercial.`,
  );
}

/* ============= Diálogo de Aprovação (sem endereço) ============= */
/** Form de aprovação enxuto: confirma PF/PJ, nome, CPF/CNPJ e telefone.
 *  O endereço completo é cadastrado depois, no Comercial → Contratos. */
export function AprovarPropostaDialog({
  proposta, open, onOpenChange, onAprovado,
}: {
  proposta: PropostaFV | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAprovado?: () => void;
}) {
  const p = proposta;
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">(p?.tipoPessoa ?? "PF");
  const [nome, setNome] = useState(p?.clienteNome ?? "");
  const [doc, setDoc] = useState(formatDoc(p?.clienteDoc ?? "", p?.tipoPessoa ?? "PF"));
  const [telefone, setTelefone] = useState(p?.clienteTelefone ?? "");
  const [email, setEmail] = useState(p?.clienteEmail ?? "");
  const [salvando, setSalvando] = useState(false);

  // Reset state when proposta changes
  useEffect(() => {
    if (!p) return;
    setTipoPessoa(p.tipoPessoa ?? "PF");
    setNome(p.clienteNome ?? "");
    setDoc(formatDoc(p.clienteDoc ?? "", p.tipoPessoa ?? "PF"));
    setTelefone(p.clienteTelefone ?? "");
    setEmail(p.clienteEmail ?? "");
  }, [p?.id]);

  if (!p) return null;
  const upper = (v: string) => v.toUpperCase();

  function aprovar() {
    if (!nome.trim()) { toast.error("Informe o nome do cliente."); return; }
    if (!isDocValido(doc, tipoPessoa)) {
      toast.error(tipoPessoa === "PF" ? "CPF inválido (11 dígitos)." : "CNPJ inválido (14 dígitos)."); return;
    }
    setSalvando(true);
    try {
      // Atualiza identificação no lead (sem endereço — será cadastrado no Comercial).
      atualizarCadastroCliente({
        leadId: p!.leadId,
        propostaId: p!.id,
        tipoPessoa,
        clienteNome: nome,
        clienteDoc: doc,
        clienteTelefone: telefone,
        clienteEmail: email,
        origem: `Aprovação da proposta ${p!.numero}`,
        usuario: p!.criadoPor || "Operador",
      });
      const atualizada: PropostaFV = {
        ...p!, tipoPessoa, clienteNome: upper(nome), clienteDoc: doc,
        clienteTelefone: telefone, clienteEmail: email,
      };
      aprovarProposta(atualizada);
      onOpenChange(false);
      onAprovado?.();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Aprovar proposta {p.numero}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Confirme a identificação do cliente. O endereço completo será cadastrado no Comercial → Contratos antes da emissão do contrato redigido.
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" variant={tipoPessoa === "PF" ? "default" : "outline"}
              onClick={() => { setTipoPessoa("PF"); setDoc(formatDoc(doc, "PF")); }}>Pessoa Física</Button>
            <Button type="button" size="sm" variant={tipoPessoa === "PJ" ? "default" : "outline"}
              onClick={() => { setTipoPessoa("PJ"); setDoc(formatDoc(doc, "PJ")); }}>Pessoa Jurídica</Button>
          </div>
          <div>
            <Label className="text-xs">{tipoPessoa === "PF" ? "Nome completo" : "Razão social"} *</Label>
            <Input className="mt-1.5" value={nome} onChange={(e) => setNome(upper(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">{tipoPessoa === "PF" ? "CPF" : "CNPJ"} *</Label>
            <Input className="mt-1.5" value={doc} onChange={(e) => setDoc(formatDoc(e.target.value, tipoPessoa))}
              placeholder={tipoPessoa === "PF" ? "000.000.000-00" : "00.000.000/0000-00"} inputMode="numeric" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input className="mt-1.5" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={aprovar} disabled={salvando} className="gap-1">
            <Check className="h-4 w-4" />
            {salvando ? "Aprovando..." : "Aprovar e enviar para Comercial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  emAberto: number;
  aprovadas: number;
  assinados: number;
};

function leadKey(p: PropostaFV): string {
  // Identidade estável do lead: prefere leadId (não muda se o nome for editado),
  // depois CPF/CNPJ, depois nome (para registros legados sem leadId).
  return (p.leadId?.trim() || p.clienteDoc?.trim() || (p.clienteNome || "").trim().toLowerCase() || p.id);
}

const STATUS_FINAIS: StatusProposta[] = ["APROVADA", "RECUSADA", "VENCIDA", "CANCELADA"];

function buildLeads(props: PropostaFV[], contratos: ContratoFull[]): Lead[] {
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
    const propIds = new Set(arr.map((p) => p.id));
    const contratosLead = contratos.filter(
      (c) => (c.propostaId && propIds.has(c.propostaId)) ||
             (c.cliente && c.cliente.toUpperCase() === (ultima.clienteNome || "").toUpperCase())
    );
    const assinados = contratosLead.filter((c) => !!c.contratoAssinadoArquivo && !c.cancelado).length;
    const aprovadas = arr.filter((p) => p.status === "APROVADA").length;
    const emAberto = arr.filter((p) => !STATUS_FINAIS.includes(p.status)).length;
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
      bloqueado: aprovadas > 0 || assinados > 0,
      status: ultima.status,
      emAberto,
      aprovadas,
      assinados,
    });
  }
  return leads;
}

function presetFromLead(l: Lead): Partial<PropostaFV> {
  const u = l.ultima;
  return {
    // leadId garante que a nova proposta caia no MESMO card do lead, mesmo
    // que o nome do cliente seja editado no LeadModal antes de gerar.
    leadId: u.leadId || l.key,
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
    origemCaptacao: u.origemCaptacao,
    possuiFinanciamento: u.possuiFinanciamento,
    financiamentoBanco: u.financiamentoBanco,
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
  titulo: "ASSINADOS",
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
    case "APROVADA": return "col-aprovada";
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
  const [aprovando, setAprovando] = useState<PropostaFV | null>(null);
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
              <Badge variant="default" className="gap-1"><Lock className="h-3 w-3" /> Assinado</Badge>
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
            <DadosEditaveis lead={lead} />
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
                  Este lead já foi enviado ao Comercial. Não é possível aprovar outra proposta.
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Selecione <strong>uma</strong> proposta para aprovar. Ela será
                  enviada ao <strong>Comercial</strong> e o card ficará bloqueado.
                  A geração do contrato (e indicação de financiamento) acontece no Comercial.
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
                                onClick={() => setAprovando(p)}
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
      <AprovarPropostaDialog
        proposta={aprovando}
        open={!!aprovando}
        onOpenChange={(o) => { if (!o) setAprovando(null); }}
        onAprovado={() => { setAprovando(null); onClose(); }}
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

/** Aba "Dados" do lead — campos travados com X para liberar edição.
 *  Ao salvar, propaga as alterações para TODAS as propostas do lead e
 *  garante que cada uma fique com um leadId estável (lead.key), evitando
 *  que mudanças de nome/doc desvinculem o card. */
function DadosEditaveis({ lead }: { lead: Lead }) {
  const upper = (v: string) => v.toUpperCase();
  const [nome, setNome] = useState(lead.clienteNome || "");
  const [doc, setDoc] = useState(lead.clienteDoc || "");
  const [tel, setTel] = useState(lead.clienteTelefone || "");
  const [email, setEmail] = useState(lead.clienteEmail || "");
  const [endereco, setEndereco] = useState(lead.clienteEndereco || "");
  const [consultor, setConsultor] = useState(lead.consultor || "");
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});

  // Reseta estado local sempre que abrir outro lead
  useEffect(() => {
    setNome(lead.clienteNome || "");
    setDoc(lead.clienteDoc || "");
    setTel(lead.clienteTelefone || "");
    setEmail(lead.clienteEmail || "");
    setEndereco(lead.clienteEndereco || "");
    setConsultor(lead.consultor || "");
    setUnlocked({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.key]);

  const isLocked = (f: string, v: string) => !unlocked[f] && !!v;
  const unlock = (f: string) => setUnlocked((u) => ({ ...u, [f]: true }));
  const dirty =
    nome !== (lead.clienteNome || "") ||
    doc !== (lead.clienteDoc || "") ||
    tel !== (lead.clienteTelefone || "") ||
    email !== (lead.clienteEmail || "") ||
    endereco !== (lead.clienteEndereco || "") ||
    consultor !== (lead.consultor || "");

  const salvar = () => {
    if (!nome.trim()) { toast.error("Nome obrigatório."); return; }
    const hoje = new Date().toISOString().slice(0, 10);
    for (const p of lead.propostas) {
      upsertProposta({
        ...p,
        // garante leadId estável em todas as propostas do lead
        leadId: p.leadId || lead.key,
        clienteNome: upper(nome.trim()),
        clienteDoc: doc.trim(),
        clienteTelefone: tel.trim(),
        clienteEmail: email.trim().toLowerCase(),
        clienteEndereco: upper(endereco.trim()),
        consultor: upper(consultor.trim()),
        atualizadoEm: hoje,
      });
    }
    setUnlocked({});
    toast.success("Dados do lead atualizados.");
  };

  const LockX = ({ field }: { field: string }) => (
    <button
      type="button"
      onClick={() => unlock(field)}
      title="Liberar edição"
      className="absolute right-2 top-7 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );

  const EditableField = ({
    label, field, value, onChange, className, transform,
  }: {
    label: string;
    field: string;
    value: string;
    onChange: (v: string) => void;
    className?: string;
    transform?: (v: string) => string;
  }) => {
    const locked = isLocked(field, value);
    return (
      <div className={`relative ${className || ""}`}>
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(transform ? transform(e.target.value) : e.target.value)}
          disabled={locked}
          className={`mt-1 ${locked ? "pr-8 bg-muted/50" : ""}`}
        />
        {locked && <LockX field={field} />}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <EditableField label="Nome" field="nome" value={nome} onChange={setNome} transform={upper} />
        <EditableField label="CPF / CNPJ" field="doc" value={doc} onChange={setDoc} />
        <EditableField label="Telefone" field="tel" value={tel} onChange={setTel} />
        <EditableField label="E-mail" field="email" value={email} onChange={setEmail} />
        <EditableField label="Endereço" field="endereco" value={endereco} onChange={setEndereco} transform={upper} className="sm:col-span-2" />
        <EditableField label="Consultor" field="consultor" value={consultor} onChange={setConsultor} transform={upper} />
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor (última proposta)</div>
          <div className="mt-1 text-sm font-medium">{fmtBRL(lead.valor)}</div>
        </div>
      </div>
      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={salvar} className="gap-1">
            <Check className="h-4 w-4" /> Salvar alterações
          </Button>
        </div>
      )}
    </div>
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
// Cabeçalho arrastável (reordenar) + alça de redimensionar à direita.
// Persistência de ordem e larguras em localStorage.

type TabelaColKey = "cliente" | "consultor" | "cidade" | "criado" | "propostas" | "aberto" | "aprovadas" | "assinados" | "valor" | "status" | "dias";
type TabelaColDef = { key: TabelaColKey; label: string; align?: "right" | "center"; defaultWidth: number };

const TABELA_COLS: TabelaColDef[] = [
  { key: "criado",    label: "Criado em",      defaultWidth: 120 },
  { key: "cliente",   label: "Cliente",        defaultWidth: 240 },
  { key: "consultor", label: "Consultor",      defaultWidth: 160 },
  { key: "cidade",    label: "Cidade",         defaultWidth: 160 },
  { key: "propostas", label: "Propostas",      align: "right", defaultWidth: 110 },
  { key: "aberto",    label: "Em aberto",      align: "right", defaultWidth: 110 },
  { key: "aprovadas", label: "Aprovadas",      align: "right", defaultWidth: 110 },
  { key: "assinados", label: "Assinados",      align: "right", defaultWidth: 110 },
  { key: "valor",     label: "Valor (última)", align: "right", defaultWidth: 150 },
  { key: "status",    label: "Status",         defaultWidth: 130 },
  { key: "dias",      label: "Dias",           defaultWidth: 80 },
];
const TABELA_ORDER_KEY = "ms.fv.propostas.tabela.order";
const TABELA_WIDTH_KEY = "ms.fv.propostas.tabela.widths";
const TABELA_HIDDEN_KEY = "ms.fv.propostas.tabela.hidden";
const TABELA_DEFAULT_ORDER: TabelaColKey[] = TABELA_COLS.map((c) => c.key);

function TabelaView({
  leads, onAbrirLead, mgrOpen, setMgrOpen, cols, assign,
}: {
  leads: Lead[];
  onAbrirLead: (l: Lead) => void;
  onNovaPreset: (preset?: Partial<PropostaFV>) => void;
  mgrOpen: boolean;
  setMgrOpen: (v: boolean) => void;
  cols: KCol[];
  assign: Record<string, string>;
}) {
  const colsByKey = useMemo(
    () => Object.fromEntries(TABELA_COLS.map((c) => [c.key, c])) as Record<TabelaColKey, TabelaColDef>,
    [],
  );

  const [order, setOrder] = useState<TabelaColKey[]>(TABELA_DEFAULT_ORDER);
  const [widths, setWidths] = useState<Record<TabelaColKey, number>>(
    () => Object.fromEntries(TABELA_COLS.map((c) => [c.key, c.defaultWidth])) as Record<TabelaColKey, number>,
  );
  const [hidden, setHidden] = useState<Set<TabelaColKey>>(new Set());
  

  useEffect(() => {
    try {
      const rawO = localStorage.getItem(TABELA_ORDER_KEY);
      if (rawO) {
        const arr = JSON.parse(rawO) as TabelaColKey[];
        const valid = arr.filter((k) => TABELA_DEFAULT_ORDER.includes(k));
        const missing = TABELA_DEFAULT_ORDER.filter((k) => !valid.includes(k));
        setOrder([...valid, ...missing]);
      }
      const rawW = localStorage.getItem(TABELA_WIDTH_KEY);
      if (rawW) {
        const w = JSON.parse(rawW) as Partial<Record<TabelaColKey, number>>;
        setWidths((prev) => ({ ...prev, ...w }));
      }
      const rawH = localStorage.getItem(TABELA_HIDDEN_KEY);
      if (rawH) {
        const arr = JSON.parse(rawH) as TabelaColKey[];
        setHidden(new Set(arr.filter((k) => TABELA_DEFAULT_ORDER.includes(k))));
      }
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem(TABELA_ORDER_KEY, JSON.stringify(order)); } catch {} }, [order]);
  useEffect(() => { try { localStorage.setItem(TABELA_WIDTH_KEY, JSON.stringify(widths)); } catch {} }, [widths]);
  useEffect(() => { try { localStorage.setItem(TABELA_HIDDEN_KEY, JSON.stringify([...hidden])); } catch {} }, [hidden]);

  const visibleOrder = useMemo(() => order.filter((k) => !hidden.has(k)), [order, hidden]);
  const toggleHidden = (k: TabelaColKey) => setHidden((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const moveBy = (k: TabelaColKey, delta: -1 | 1) => setOrder((prev) => {
    const i = prev.indexOf(k); const j = i + delta;
    if (i < 0 || j < 0 || j >= prev.length) return prev;
    const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  const [dragKey, setDragKey] = useState<TabelaColKey | null>(null);
  const move = (from: TabelaColKey, to: TabelaColKey) => {
    if (from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(to);
      if (fi < 0 || ti < 0) return prev;
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      return next;
    });
  };

  const startResize = (key: TabelaColKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = widths[key] ?? colsByKey[key].defaultWidth;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(60, startW + (ev.clientX - startX));
      setWidths((prev) => ({ ...prev, [key]: w }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const alignClass = (a?: "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "";

  const renderCell = (l: Lead, key: TabelaColKey) => {
    switch (key) {
      case "cliente":
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{l.clienteNome}</span>
            {l.bloqueado && <Lock className="h-3.5 w-3.5 shrink-0 text-success" />}
          </div>
        );
      case "consultor": return <span className="block truncate">{l.consultor || "—"}</span>;
      case "cidade":    return <span className="block truncate">{l.cidade ? `${l.cidade}/${l.estado || ""}` : "—"}</span>;
      case "criado":    return <span className="tabular-nums">{fmtData(l.dataPrimeira)}</span>;
      case "propostas": return <span className="tabular-nums">{l.propostas.length}</span>;
      case "aberto":    return <span className="tabular-nums">{l.emAberto}</span>;
      case "aprovadas": return <span className={`tabular-nums ${l.aprovadas > 0 ? "font-semibold text-success" : ""}`}>{l.aprovadas}</span>;
      case "assinados": return <span className={`tabular-nums ${l.assinados > 0 ? "font-semibold text-primary" : ""}`}>{l.assinados}</span>;
      case "valor":     return <span className="tabular-nums">{fmtBRL(l.valor)}</span>;
      case "status": {
        // Espelha o status mostrado no Kanban: se o lead foi atribuído a uma
        // coluna do Kanban, usa o título dela; caso contrário, fallback para
        // a coluna padrão calculada a partir do status da última proposta.
        const colId = l.bloqueado
          ? COL_CONTRATO_ID
          : (assign[l.key] || colPadraoPorStatus(l.status));
        const col = cols.find((c) => c.id === colId);
        const titulo = (col?.titulo || l.status).toUpperCase();
        const variant: "default" | "secondary" | "destructive" | "outline" =
          colId === COL_CONTRATO_ID ? "default"
          : colId === "col-aprovada" ? "default"
          : colId === "col-perdida" ? "destructive"
          : colId === "col-rascunho" ? "outline"
          : "secondary";
        return <Badge variant={variant}>{titulo}</Badge>;
      }
      case "dias":
        return (
          <div className="flex items-center gap-1" title={`${l.dias} dia(s)`}>
            <span className={`inline-block h-2 w-2 rounded-full ${dotColorFor(l.dias)}`} />
            <span className="text-[11px] text-muted-foreground">{l.dias}d</span>
          </div>
        );
    }
  };

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
            <TableHeader>
              <TableRow>
                {visibleOrder.map((key) => {
                  const col = colsByKey[key]; if (!col) return null;
                  const w = widths[key] ?? col.defaultWidth;
                  return (
                    <TableHead
                      key={key}
                      style={{ width: w, minWidth: 60 }}
                      draggable
                      onDragStart={() => setDragKey(key)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragKey) move(dragKey, key); setDragKey(null); }}
                      onDragEnd={() => setDragKey(null)}
                      className={`relative cursor-move select-none whitespace-nowrap ${alignClass(col.align)} ${dragKey === key ? "opacity-40" : ""}`}
                      title="Arraste para reordenar"
                    >
                      <span className="inline-flex items-center gap-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground/60" />
                        {col.label}
                      </span>
                      <span
                        onMouseDown={(e) => startResize(key, e)}
                        onClick={(e) => e.stopPropagation()}
                        onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/40 transition-colors"
                        title="Arraste para redimensionar"
                      />
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow
                  key={l.key}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => onAbrirLead(l)}
                >
                  {visibleOrder.map((key) => {
                    const col = colsByKey[key]; if (!col) return null;
                    const w = widths[key] ?? col.defaultWidth;
                    return (
                      <TableCell
                        key={key}
                        style={{ width: w, maxWidth: w }}
                        className={`whitespace-nowrap overflow-hidden text-ellipsis ${alignClass(col.align)}`}
                      >
                        {renderCell(l, key)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={mgrOpen} onOpenChange={setMgrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Colunas da Tabela</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground mb-2">
              Mostre/oculte colunas e organize a sequência. Você também pode arrastar o cabeçalho da tabela e redimensionar pela borda.
            </div>
            {order.map((k, i) => {
              const col = colsByKey[k];
              const visible = !hidden.has(k);
              return (
                <div key={k} className="flex items-center gap-2 rounded-md border p-2">
                  <span className="flex-1 text-sm">{col.label}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => moveBy(k, -1)} title="Subir">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === order.length - 1} onClick={() => moveBy(k, 1)} title="Descer">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Switch checked={visible} onCheckedChange={() => toggleHidden(k)} />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOrder(TABELA_DEFAULT_ORDER); setHidden(new Set()); setWidths(Object.fromEntries(TABELA_COLS.map((c) => [c.key, c.defaultWidth])) as Record<TabelaColKey, number>); }}>
              Restaurar padrão
            </Button>
            <Button onClick={() => setMgrOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  const [colsTabelaOpen, setColsTabelaOpen] = useState(false);
  const [leadAberto, setLeadAberto] = useState<Lead | null>(null);

  // Estado de colunas precisa estar acessível tanto pro Kanban quanto pro botão "Colunas"
  const contratosAll = useContratos();
  const leadsAll = useMemo(() => buildLeads(propostas, contratosAll), [propostas, contratosAll]);
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
        <div className="relative min-w-[220px] max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="FILTRAR POR CLIENTE, CONSULTOR OU Nº…"
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

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
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

          {view === "tabela" ? (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setColsTabelaOpen(true)}>
              <Columns3 className="h-4 w-4" /> Colunas da Tabela
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setColsOpen(true)}>
              <Columns3 className="h-4 w-4" /> Colunas do Kanban
            </Button>
          )}
        </div>
      </Card>

      {view === "tabela"
        ? <TabelaView leads={leadsFiltrados} onAbrirLead={setLeadAberto} onNovaPreset={onNova} mgrOpen={colsTabelaOpen} setMgrOpen={setColsTabelaOpen} cols={cols} assign={assign} />
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
