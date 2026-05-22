// ============================================================================
// ESTOQUE — store operacional
// Não há baixa automática. Estoque atual é informado manualmente.
// Necessidades por obra são derivadas (sugeridas) das obras do Cronograma.
// Compra = max(0, Σ(necessidade - entregue das obras SELECIONADAS) - estoqueAtual).
// ============================================================================
import { useSyncExternalStore } from "react";
import { pushAudit } from "./audit-store";
import type { ObraSnapshot } from "./obras-snapshot-store";

export type Unidade = "un" | "m" | "kg" | "pç" | "kit";
export type Categoria = "Módulo" | "Inversor" | "Cabo" | "Disjuntor" | "Estrutura" | "Conector" | "Outro";

export type EstoqueItem = {
  id: string;
  nome: string;
  categoria: Categoria;
  unidade: Unidade;
  qtdAtual: number;        // informada manualmente
  atualizadoEm?: string;   // ISO
  atualizadoPor?: string;
};

export type NecessidadeItem = {
  itemId: string;
  qtdNecessaria: number;
  qtdEntregue: number;
  entregaCompleta: boolean;
  obs?: string;
};

export type NecessidadeObra = {
  obraId: string;
  contratoId: string;
  cliente: string;
  selecionadaCompra: boolean;
  arquivada?: boolean; // obras finalizadas/retornadas ao Comercial
  itens: NecessidadeItem[];
  atualizadaEm?: string;
};

export type EntregaLog = {
  id: string;
  obraId: string;
  cliente: string;
  itemId: string;
  itemNome: string;
  qtd: number;
  completa: boolean;
  em: string;
  por: string;
};

// --------- Catálogo seed -----------------------------------------------------
const SEED_ITENS: EstoqueItem[] = [
  { id: "MOD-550",   nome: "Módulo FV 550W",           categoria: "Módulo",    unidade: "un", qtdAtual: 0 },
  { id: "INV-PAD",   nome: "Inversor (padrão)",        categoria: "Inversor",  unidade: "un", qtdAtual: 0 },
  { id: "CAB-6MM",   nome: "Cabo solar 6mm²",          categoria: "Cabo",      unidade: "m",  qtdAtual: 0 },
  { id: "DJ-CC",     nome: "Disjuntor CC",             categoria: "Disjuntor", unidade: "un", qtdAtual: 0 },
  { id: "EST-CER",   nome: "Estrutura telhado cerâmico", categoria: "Estrutura", unidade: "un", qtdAtual: 0 },
  { id: "EST-MET",   nome: "Estrutura telhado metálico", categoria: "Estrutura", unidade: "un", qtdAtual: 0 },
  { id: "EST-FIB",   nome: "Estrutura telhado fibrocimento", categoria: "Estrutura", unidade: "un", qtdAtual: 0 },
  { id: "MC4",       nome: "Conector MC4 (par)",       categoria: "Conector",  unidade: "pç", qtdAtual: 0 },
];

// --------- Persistência ------------------------------------------------------
const K_ITENS = "ms.estoque.itens.v1";
const K_NEC = "ms.estoque.necessidades.v1";
const K_LOG = "ms.estoque.log.v1";

function loadJSON<T>(k: string, def: T): T {
  if (typeof window === "undefined") return def;
  try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; }
}
function saveJSON(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ }
}

type State = { itens: EstoqueItem[]; necessidades: NecessidadeObra[]; log: EntregaLog[] };

let state: State = {
  itens: loadJSON<EstoqueItem[]>(K_ITENS, SEED_ITENS),
  necessidades: loadJSON<NecessidadeObra[]>(K_NEC, []),
  log: loadJSON<EntregaLog[]>(K_LOG, []),
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function persist() {
  saveJSON(K_ITENS, state.itens);
  saveJSON(K_NEC, state.necessidades);
  saveJSON(K_LOG, state.log);
}
function setState(p: Partial<State>) { state = { ...state, ...p }; persist(); emit(); }

const SERVER_STATE: State = { itens: SEED_ITENS, necessidades: [], log: [] };
export function useEstoqueState(): State {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state,
    () => SERVER_STATE,
  );
}

// --------- Catálogo (CRUD básico) -------------------------------------------
export function setEstoqueAtual(itemId: string, qtd: number, usuario = "Estoque") {
  const itens = state.itens.map((i) =>
    i.id === itemId ? { ...i, qtdAtual: Math.max(0, qtd), atualizadoEm: new Date().toISOString(), atualizadoPor: usuario } : i,
  );
  setState({ itens });
  pushAudit({ entidade: "obra", entidadeId: itemId, acao: "estoque_qtd", usuario, detalhe: `qtd=${qtd}` });
}

export function upsertEstoqueItem(item: EstoqueItem) {
  const exists = state.itens.some((i) => i.id === item.id);
  const itens = exists
    ? state.itens.map((i) => (i.id === item.id ? { ...i, ...item } : i))
    : [...state.itens, item];
  setState({ itens });
}

export function removeEstoqueItem(id: string) {
  setState({ itens: state.itens.filter((i) => i.id !== id) });
}

// --------- Sugestão técnica baseada na obra ---------------------------------
// Regra simples — pode ser refinada por categoria/telhado.
export function sugerirItensDaObra(o: ObraSnapshot): NecessidadeItem[] {
  const modulos = Math.max(0, Math.round(o.modulos || 0));
  const estruturaId =
    (o.telhadoTipo || "").toLowerCase().includes("metal") ? "EST-MET" :
    (o.telhadoTipo || "").toLowerCase().includes("fibro") ? "EST-FIB" :
    "EST-CER";

  const itens: NecessidadeItem[] = [
    { itemId: "MOD-550", qtdNecessaria: modulos, qtdEntregue: 0, entregaCompleta: false },
    { itemId: estruturaId, qtdNecessaria: modulos, qtdEntregue: 0, entregaCompleta: false },
    { itemId: "CAB-6MM", qtdNecessaria: Math.round(modulos * 3.5), qtdEntregue: 0, entregaCompleta: false },
    { itemId: "MC4", qtdNecessaria: Math.max(2, Math.ceil(modulos / 8)), qtdEntregue: 0, entregaCompleta: false },
    { itemId: "DJ-CC", qtdNecessaria: 1, qtdEntregue: 0, entregaCompleta: false },
    { itemId: "INV-PAD", qtdNecessaria: [o.inversor, o.inv2, o.inv3].filter(Boolean).length || 1, qtdEntregue: 0, entregaCompleta: false },
  ];
  return itens.filter((x) => x.qtdNecessaria > 0);
}

// --------- Necessidades por obra --------------------------------------------
export function garantirNecessidadeObra(o: ObraSnapshot) {
  const exists = state.necessidades.find((n) => n.obraId === o.id);
  if (exists) {
    if (exists.arquivada) {
      // Desarquiva ao reentrar no cronograma
      setState({
        necessidades: state.necessidades.map((n) =>
          n.obraId === o.id ? { ...n, arquivada: false } : n,
        ),
      });
    }
    return;
  }
  const nova: NecessidadeObra = {
    obraId: o.id,
    contratoId: o.contrato,
    cliente: o.cliente,
    selecionadaCompra: false,
    itens: sugerirItensDaObra(o),
    atualizadaEm: new Date().toISOString(),
  };
  setState({ necessidades: [...state.necessidades, nova] });
}

export function recalcularNecessidade(o: ObraSnapshot) {
  const idx = state.necessidades.findIndex((n) => n.obraId === o.id);
  if (idx < 0) return;
  const atual = state.necessidades[idx];
  const sugeridos = sugerirItensDaObra(o);
  // Merge preservando qtdEntregue por item
  const merged: NecessidadeItem[] = sugeridos.map((s) => {
    const existente = atual.itens.find((i) => i.itemId === s.itemId);
    const entregue = existente?.qtdEntregue ?? 0;
    const completa = entregue >= s.qtdNecessaria && s.qtdNecessaria > 0;
    return {
      itemId: s.itemId,
      qtdNecessaria: s.qtdNecessaria,
      qtdEntregue: Math.min(entregue, s.qtdNecessaria),
      entregaCompleta: completa,
      obs: existente?.obs,
    };
  });
  // Mantém itens "extras" que não estão na sugestão atual (ex.: adicionados manualmente)
  const extras = atual.itens.filter((i) => !sugeridos.find((s) => s.itemId === i.itemId));
  const next: NecessidadeObra = {
    ...atual,
    cliente: o.cliente,
    contratoId: o.contrato,
    itens: [...merged, ...extras],
    atualizadaEm: new Date().toISOString(),
  };
  const necessidades = [...state.necessidades];
  necessidades[idx] = next;
  setState({ necessidades });
}

export function arquivarNecessidade(obraId: string) {
  setState({
    necessidades: state.necessidades.map((n) =>
      n.obraId === obraId ? { ...n, arquivada: true, selecionadaCompra: false } : n,
    ),
  });
}

export function setSelecionadaCompra(obraId: string, v: boolean) {
  setState({
    necessidades: state.necessidades.map((n) =>
      n.obraId === obraId ? { ...n, selecionadaCompra: v } : n,
    ),
  });
}

export function marcarEntrega(
  obraId: string,
  itemId: string,
  qtdEntregue: number,
  completa: boolean,
  usuario = "Estoque",
) {
  let itemNome = itemId;
  let cliente = "";
  const necessidades = state.necessidades.map((n) => {
    if (n.obraId !== obraId) return n;
    cliente = n.cliente;
    return {
      ...n,
      itens: n.itens.map((i) => {
        if (i.itemId !== itemId) return i;
        const qtdCap = Math.max(0, Math.min(qtdEntregue, i.qtdNecessaria));
        const isCompleta = completa || qtdCap >= i.qtdNecessaria;
        itemNome = state.itens.find((x) => x.id === itemId)?.nome || itemId;
        return { ...i, qtdEntregue: qtdCap, entregaCompleta: isCompleta };
      }),
      atualizadaEm: new Date().toISOString(),
    };
  });
  const log: EntregaLog = {
    id: `LOG-${Date.now().toString(36).toUpperCase()}`,
    obraId, cliente, itemId, itemNome, qtd: qtdEntregue, completa,
    em: new Date().toISOString(), por: usuario,
  };
  setState({ necessidades, log: [log, ...state.log].slice(0, 500) });
  pushAudit({ entidade: "obra", entidadeId: obraId, acao: "estoque_entrega", usuario, detalhe: `${itemId}: qtd=${qtdEntregue}${completa ? " (completo)" : ""}` });
}

// --------- Cálculo derivados ------------------------------------------------
export function isMaterialEntregueTotal(n: NecessidadeObra): boolean {
  if (n.itens.length === 0) return false;
  return n.itens.every((i) => i.entregaCompleta || i.qtdEntregue >= i.qtdNecessaria);
}

export type LinhaCompra = {
  itemId: string;
  necessidadeTotal: number;
  jaEntregue: number;
  estoqueAtual: number;
  aComprar: number;
};

export function calcularNecessidadeCompra(state_: State = state): LinhaCompra[] {
  const obrasSel = state_.necessidades.filter((n) => n.selecionadaCompra && !n.arquivada && !isMaterialEntregueTotal(n));
  const acc = new Map<string, { nec: number; ent: number }>();
  for (const n of obrasSel) {
    for (const i of n.itens) {
      const cur = acc.get(i.itemId) ?? { nec: 0, ent: 0 };
      cur.nec += i.qtdNecessaria;
      cur.ent += Math.min(i.qtdEntregue, i.qtdNecessaria);
      acc.set(i.itemId, cur);
    }
  }
  const linhas: LinhaCompra[] = [];
  acc.forEach((v, itemId) => {
    const est = state_.itens.find((x) => x.id === itemId)?.qtdAtual ?? 0;
    const aComprar = Math.max(0, v.nec - v.ent - est);
    linhas.push({ itemId, necessidadeTotal: v.nec, jaEntregue: v.ent, estoqueAtual: est, aComprar });
  });
  return linhas.sort((a, b) => b.aComprar - a.aComprar);
}

export function findItem(itens: EstoqueItem[], id: string): EstoqueItem | undefined {
  return itens.find((x) => x.id === id);
}
