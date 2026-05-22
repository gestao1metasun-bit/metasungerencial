// ============================================================================
// PÓS-VENDA — chamados/atendimentos, cadastros (tipos) e gatilhos a partir
// da finalização da obra. Persistência em localStorage (padrão atual do ERP).
// ============================================================================
import { useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";

export type PvStatus =
  | "Aberto"
  | "Em atendimento"
  | "Aguardando cliente"
  | "Aguardando peça"
  | "Resolvido"
  | "Cancelado";

export const PV_STATUS: PvStatus[] = [
  "Aberto", "Em atendimento", "Aguardando cliente", "Aguardando peça", "Resolvido", "Cancelado",
];

export const PV_STATUS_ABERTOS: PvStatus[] = [
  "Aberto", "Em atendimento", "Aguardando cliente", "Aguardando peça",
];

export type PvPrioridade = "Baixa" | "Média" | "Alta" | "Urgente";
export const PV_PRIORIDADES: PvPrioridade[] = ["Baixa", "Média", "Alta", "Urgente"];

export type PvTipo = {
  id: string;
  nome: string;
  descricao?: string;
  /** SLA sugerido em dias úteis (do abertura até resolução). */
  slaDias: number;
  /** Indica se é gerado automaticamente no encerramento da obra. */
  gatilhoEncerramento?: boolean;
  /** Atraso (em dias) após a data de finalização da obra para criar o chamado. */
  diasAposEncerramento?: number;
  ativo: boolean;
};

export type PvInteracao = {
  id: string;
  em: string;        // ISO
  por: string;
  tipo: "Comentário" | "Status" | "Visita" | "Contato cliente" | "Sistema";
  texto: string;
};

export type PvChamado = {
  id: string;
  numero: number;
  obraId: string;
  contratoId?: string;
  cliente: string;
  tipoId: string;
  titulo: string;
  descricao?: string;
  status: PvStatus;
  prioridade: PvPrioridade;
  abertoEm: string;       // ISO
  abertoPor: string;
  responsavel?: string;
  prazoISO?: string;      // ISO date — SLA
  fechadoEm?: string;     // ISO
  resolucao?: string;
  origem: "Manual" | "Encerramento de obra";
  interacoes: PvInteracao[];
};

// ----------------------------------------------------------------------------
// Tipos seed
// ----------------------------------------------------------------------------
const SEED_TIPOS: PvTipo[] = [
  {
    id: "PVT-ACOMP30", nome: "Acompanhamento 30 dias",
    descricao: "Visita ou contato após 30 dias da finalização da obra.",
    slaDias: 7, gatilhoEncerramento: true, diasAposEncerramento: 30, ativo: true,
  },
  { id: "PVT-GAR", nome: "Garantia", descricao: "Acionamento de garantia de equipamento ou instalação.", slaDias: 5, ativo: true },
  { id: "PVT-MAN", nome: "Manutenção preventiva", descricao: "Limpeza e inspeção programada.", slaDias: 15, ativo: true },
  { id: "PVT-VTEC", nome: "Visita técnica", descricao: "Diagnóstico em campo.", slaDias: 3, ativo: true },
  { id: "PVT-REC", nome: "Reclamação", descricao: "Reclamação do cliente.", slaDias: 2, ativo: true },
  { id: "PVT-SUP", nome: "Suporte / Dúvidas", descricao: "Dúvidas sobre operação/monitoramento.", slaDias: 2, ativo: true },
];

// ----------------------------------------------------------------------------
// Persistência
// ----------------------------------------------------------------------------
const K_TIPOS = "ms.posvenda.tipos.v1";
const K_CHAM = "ms.posvenda.chamados.v1";
const K_SEQ = "ms.posvenda.seq.v1";
const K_GAT = "ms.posvenda.gatilhos.v1"; // obras já processadas

function loadJSON<T>(k: string, def: T): T {
  if (typeof window === "undefined") return def;
  try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; }
}
function saveJSON(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

type State = {
  tipos: PvTipo[];
  chamados: PvChamado[];
  seq: number;
  gatilhos: Record<string, string>; // obraId -> chamadoId gerado
};

let state: State = {
  tipos: loadJSON<PvTipo[]>(K_TIPOS, SEED_TIPOS),
  chamados: loadJSON<PvChamado[]>(K_CHAM, []),
  seq: loadJSON<number>(K_SEQ, 0),
  gatilhos: loadJSON<Record<string, string>>(K_GAT, {}),
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function persist() {
  saveJSON(K_TIPOS, state.tipos);
  saveJSON(K_CHAM, state.chamados);
  saveJSON(K_SEQ, state.seq);
  saveJSON(K_GAT, state.gatilhos);
}
function setState(p: Partial<State>) { state = { ...state, ...p }; persist(); emit(); }

const SERVER_STATE: State = { tipos: SEED_TIPOS, chamados: [], seq: 0, gatilhos: {} };

export function usePosVendaState(): State {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state,
    () => SERVER_STATE,
  );
}

// ----------------------------------------------------------------------------
// Utilitários
// ----------------------------------------------------------------------------
function addBusinessDays(base: Date, days: number): Date {
  const d = new Date(base);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

function nextNumero(): number {
  const n = (state.seq || 0) + 1;
  setState({ seq: n });
  return n;
}

function novoId(): string {
  return `PV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

// ----------------------------------------------------------------------------
// Tipos CRUD
// ----------------------------------------------------------------------------
export function upsertTipoPv(t: PvTipo) {
  const exists = state.tipos.some((x) => x.id === t.id);
  const tipos = exists ? state.tipos.map((x) => (x.id === t.id ? t : x)) : [...state.tipos, t];
  setState({ tipos });
}
export function removeTipoPv(id: string) {
  // Não permite excluir se houver chamados vinculados.
  const usado = state.chamados.some((c) => c.tipoId === id);
  if (usado) throw new Error("Tipo possui chamados vinculados. Inative em vez de excluir.");
  setState({ tipos: state.tipos.filter((t) => t.id !== id) });
}
export function novoTipoId() { return `PVT-${Date.now().toString(36).toUpperCase()}`; }

// ----------------------------------------------------------------------------
// Chamados — CRUD + workflow
// ----------------------------------------------------------------------------
export type AbrirChamadoInput = {
  obraId: string;
  contratoId?: string;
  cliente: string;
  tipoId: string;
  titulo: string;
  descricao?: string;
  prioridade?: PvPrioridade;
  responsavel?: string;
  abertoPor: string;
  origem?: "Manual" | "Encerramento de obra";
  prazoISO?: string;
};

export function abrirChamado(input: AbrirChamadoInput): PvChamado {
  const tipo = state.tipos.find((t) => t.id === input.tipoId);
  if (!tipo) throw new Error("Tipo de atendimento inválido.");
  const abertoEm = new Date().toISOString();
  const prazo = input.prazoISO ?? addBusinessDays(new Date(), Math.max(1, tipo.slaDias || 3)).toISOString();
  const ch: PvChamado = {
    id: novoId(),
    numero: nextNumero(),
    obraId: input.obraId,
    contratoId: input.contratoId,
    cliente: input.cliente,
    tipoId: input.tipoId,
    titulo: input.titulo,
    descricao: input.descricao,
    status: "Aberto",
    prioridade: input.prioridade ?? "Média",
    abertoEm,
    abertoPor: input.abertoPor,
    responsavel: input.responsavel,
    prazoISO: prazo,
    origem: input.origem ?? "Manual",
    interacoes: [{
      id: novoId(), em: abertoEm, por: input.abertoPor, tipo: "Sistema",
      texto: `Chamado aberto (${input.origem ?? "Manual"}).`,
    }],
  };
  setState({ chamados: [ch, ...state.chamados] });
  pushAudit({
    entidade: "obra", entidadeId: input.obraId, acao: "POSVENDA_ABERTO",
    usuario: input.abertoPor,
    detalhe: `#${ch.numero} ${tipo.nome} — ${input.cliente}`,
  });
  return ch;
}

export function atualizarChamado(id: string, patch: Partial<PvChamado>, usuario: string) {
  const cur = state.chamados.find((c) => c.id === id);
  if (!cur) return;
  const next: PvChamado = { ...cur, ...patch };
  setState({ chamados: state.chamados.map((c) => (c.id === id ? next : c)) });
  pushAudit({
    entidade: "obra", entidadeId: cur.obraId, acao: "POSVENDA_ATUALIZADO",
    usuario, detalhe: `#${cur.numero}`,
  });
}

export function alterarStatusChamado(id: string, status: PvStatus, usuario: string, nota?: string) {
  const cur = state.chamados.find((c) => c.id === id);
  if (!cur) return;
  const em = new Date().toISOString();
  const interacao: PvInteracao = {
    id: novoId(), em, por: usuario, tipo: "Status",
    texto: `Status: ${cur.status} → ${status}${nota ? ` — ${nota}` : ""}`,
  };
  const finalizou = (status === "Resolvido" || status === "Cancelado");
  const patch: Partial<PvChamado> = {
    status,
    fechadoEm: finalizou ? em : undefined,
    resolucao: status === "Resolvido" ? (nota ?? cur.resolucao) : cur.resolucao,
    interacoes: [...cur.interacoes, interacao],
  };
  setState({ chamados: state.chamados.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  pushAudit({
    entidade: "obra", entidadeId: cur.obraId, acao: "POSVENDA_STATUS",
    usuario, valorAnterior: cur.status, valorNovo: status,
    detalhe: `#${cur.numero}${nota ? ` — ${nota}` : ""}`,
  });
}

export function adicionarInteracao(
  id: string,
  por: string,
  tipo: PvInteracao["tipo"],
  texto: string,
) {
  const cur = state.chamados.find((c) => c.id === id);
  if (!cur) return;
  const inte: PvInteracao = { id: novoId(), em: new Date().toISOString(), por, tipo, texto };
  setState({
    chamados: state.chamados.map((c) =>
      c.id === id ? { ...c, interacoes: [...c.interacoes, inte] } : c),
  });
}

export function removerChamado(id: string, usuario: string) {
  const cur = state.chamados.find((c) => c.id === id);
  if (!cur) return;
  setState({ chamados: state.chamados.filter((c) => c.id !== id) });
  pushAudit({
    entidade: "obra", entidadeId: cur.obraId, acao: "POSVENDA_REMOVIDO",
    usuario, detalhe: `#${cur.numero}`,
  });
}

// ----------------------------------------------------------------------------
// Gatilho a partir do encerramento da obra
// ----------------------------------------------------------------------------
export type EncerramentoObra = {
  obraId: string;
  contratoId?: string;
  cliente: string;
  dataFinalizacaoISO: string; // ISO ou yyyy-mm-dd
};

/**
 * Garante a criação de chamados a partir do encerramento da obra.
 * - Cria 1 chamado por tipo com `gatilhoEncerramento=true` (idempotente por obra).
 * - O prazo do chamado é dataFinalizacao + diasAposEncerramento (ou imediato).
 * Retorna ids dos chamados criados/já existentes para a obra.
 */
export function garantirAtendimentosPorEncerramento(
  e: EncerramentoObra,
  usuario = "Sistema",
): string[] {
  if (state.gatilhos[e.obraId]) return [state.gatilhos[e.obraId]];

  const tiposGatilho = state.tipos.filter((t) => t.ativo && t.gatilhoEncerramento);
  if (tiposGatilho.length === 0) {
    // marca como processado mesmo sem tipos para evitar nova tentativa
    setState({ gatilhos: { ...state.gatilhos, [e.obraId]: "(sem tipo gatilho)" } });
    return [];
  }
  const baseFinal = new Date(e.dataFinalizacaoISO);
  const criados: string[] = [];
  for (const tipo of tiposGatilho) {
    const ja = state.chamados.find(
      (c) => c.obraId === e.obraId && c.tipoId === tipo.id && c.origem === "Encerramento de obra",
    );
    if (ja) { criados.push(ja.id); continue; }

    const dias = tipo.diasAposEncerramento ?? 0;
    const prazo = new Date(baseFinal); prazo.setDate(prazo.getDate() + dias);
    const ch = abrirChamado({
      obraId: e.obraId,
      contratoId: e.contratoId,
      cliente: e.cliente,
      tipoId: tipo.id,
      titulo: `${tipo.nome} — ${e.cliente}`,
      descricao: `Gerado automaticamente pelo encerramento da obra (${baseFinal.toLocaleDateString("pt-BR")}).`,
      prioridade: "Média",
      abertoPor: usuario,
      origem: "Encerramento de obra",
      prazoISO: prazo.toISOString(),
    });
    criados.push(ch.id);
  }
  // marca obra como processada (usa o primeiro id como referência)
  setState({ gatilhos: { ...state.gatilhos, [e.obraId]: criados[0] ?? "(criados)" } });
  return criados;
}

// ----------------------------------------------------------------------------
// Helpers / derivados
// ----------------------------------------------------------------------------
export function chamadosAtrasados(): PvChamado[] {
  const now = Date.now();
  return state.chamados.filter(
    (c) => PV_STATUS_ABERTOS.includes(c.status) && c.prazoISO && new Date(c.prazoISO).getTime() < now,
  );
}

export function contagemPorStatus(): Record<PvStatus, number> {
  const out: Record<PvStatus, number> = {
    "Aberto": 0, "Em atendimento": 0, "Aguardando cliente": 0,
    "Aguardando peça": 0, "Resolvido": 0, "Cancelado": 0,
  };
  for (const c of state.chamados) out[c.status]++;
  return out;
}

export function findTipo(id: string): PvTipo | undefined {
  return state.tipos.find((t) => t.id === id);
}
