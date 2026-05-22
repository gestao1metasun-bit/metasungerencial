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
  qtdAtual: number;        // estoque físico total
  qtdReservada?: number;   // reservado para obras (não disponível p/ outras)
  custoMedio?: number;     // custo médio ponderado (R$/unid)
  atualizadoEm?: string;
  atualizadoPor?: string;
};

export type MovimentoEstoque = {
  id: string;
  em: string;            // ISO
  tipo: "Entrada" | "Saída" | "Ajuste" | "Reserva" | "Liberação" | "Devolução";
  itemId: string;
  itemNome: string;
  qtd: number;           // sempre positivo
  custoUnit: number;     // custo unitário no momento
  custoTotal: number;    // qtd * custoUnit
  refMovId?: string;     // p/ Devolução: referência ao MOV de Saída original
  // Vínculos opcionais
  compraId?: string;     // entrada por compra
  obraId?: string;       // saída para obra (CMV)
  cliente?: string;
  por?: string;
  obs?: string;
};


export type NecessidadeItem = {
  itemId: string;
  qtdNecessaria: number;
  qtdEntregue: number;
  qtdReservada?: number; // reservado p/ esta obra
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
const K_MOV = "ms.estoque.mov.v1";

function loadJSON<T>(k: string, def: T): T {
  if (typeof window === "undefined") return def;
  try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; }
}
function saveJSON(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ }
}

type State = { itens: EstoqueItem[]; necessidades: NecessidadeObra[]; log: EntregaLog[]; movimentos: MovimentoEstoque[] };

let state: State = {
  itens: loadJSON<EstoqueItem[]>(K_ITENS, SEED_ITENS),
  necessidades: loadJSON<NecessidadeObra[]>(K_NEC, []),
  log: loadJSON<EntregaLog[]>(K_LOG, []),
  movimentos: loadJSON<MovimentoEstoque[]>(K_MOV, []),
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function persist() {
  saveJSON(K_ITENS, state.itens);
  saveJSON(K_NEC, state.necessidades);
  saveJSON(K_LOG, state.log);
  saveJSON(K_MOV, state.movimentos);
}
function setState(p: Partial<State>) { state = { ...state, ...p }; persist(); emit(); }

const SERVER_STATE: State = { itens: SEED_ITENS, necessidades: [], log: [], movimentos: [] };
export function useEstoqueState(): State {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state,
    () => SERVER_STATE,
  );
}

export function useMovimentos(): MovimentoEstoque[] {
  return useEstoqueState().movimentos;
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

/**
 * Registra entrega para uma obra (acumulado).
 * Faz baixa física + CMV pelo delta (qtdNova - qtdAnterior) consumindo
 * reservas existentes da obra. Se delta < 0, registra Devolução.
 */
export function marcarEntrega(
  obraId: string,
  itemId: string,
  qtdEntregue: number,
  completa: boolean,
  usuario = "Estoque",
): { ok: boolean; erro?: string } {
  const nec = state.necessidades.find((n) => n.obraId === obraId);
  const necItem = nec?.itens.find((i) => i.itemId === itemId);
  if (!nec || !necItem) return { ok: false, erro: "Obra/item não encontrado." };
  const item = state.itens.find((x) => x.id === itemId);
  if (!item) return { ok: false, erro: "Item de estoque não encontrado." };

  const prev = necItem.qtdEntregue || 0;
  const qtdCap = Math.max(0, Math.min(qtdEntregue, necItem.qtdNecessaria));
  const delta = qtdCap - prev;

  if (delta > 0) {
    // Verifica disponibilidade considerando reservas de OUTRAS obras.
    const reservaPropria = necItem.qtdReservada || 0;
    const reservaOutras = (item.qtdReservada || 0) - reservaPropria;
    const disponivel = (item.qtdAtual || 0) - Math.max(0, reservaOutras);
    if (disponivel < delta) return { ok: false, erro: `Estoque disponível insuficiente para ${item.nome} (disp=${disponivel}, falta=${delta}).` };
    const r = registrarSaidaObra(obraId, nec.cliente, [{ itemId, qtd: delta }], usuario);
    if (!r.ok) return { ok: false, erro: `Falha na baixa: ${r.faltantes.join(", ")}` };
    // consome reserva da própria obra
    const consumirRes = Math.min(reservaPropria, delta);
    if (consumirRes > 0) liberarReserva(obraId, itemId, consumirRes, usuario, true);
  } else if (delta < 0) {
    const r = registrarDevolucaoObra(obraId, itemId, -delta, usuario);
    if (!r.ok) return { ok: false, erro: r.erro };
  }

  // Atualiza necessidade + log
  const isCompleta = completa || qtdCap >= necItem.qtdNecessaria;
  const itemNome = item.nome;
  const necessidades = state.necessidades.map((n) => {
    if (n.obraId !== obraId) return n;
    return {
      ...n,
      itens: n.itens.map((i) =>
        i.itemId !== itemId ? i : { ...i, qtdEntregue: qtdCap, entregaCompleta: isCompleta },
      ),
      atualizadaEm: new Date().toISOString(),
    };
  });
  const log: EntregaLog = {
    id: `LOG-${Date.now().toString(36).toUpperCase()}`,
    obraId, cliente: nec.cliente, itemId, itemNome, qtd: qtdCap, completa: isCompleta,
    em: new Date().toISOString(), por: usuario,
  };
  setState({ necessidades, log: [log, ...state.log].slice(0, 500) });
  pushAudit({ entidade: "obra", entidadeId: obraId, acao: "estoque_entrega", usuario, detalhe: `${itemId}: qtd=${qtdCap}${isCompleta ? " (completo)" : ""}` });
  return { ok: true };
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

// ============================================================================
// Movimentos de Estoque — Entradas por Compra e Saídas para Obra (CMV)
// ============================================================================

function novoMovId(): string {
  return `MOV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

/** Entrada por compra: atualiza qtd e custo médio ponderado. */
export function registrarEntradaCompra(
  compraId: string,
  linhas: Array<{ itemId: string; qtd: number; custoUnit: number }>,
  usuario = "Estoque",
) {
  const itens = [...state.itens];
  const novosMov: MovimentoEstoque[] = [];
  const now = new Date().toISOString();
  for (const l of linhas) {
    const idx = itens.findIndex((i) => i.id === l.itemId);
    if (idx < 0) continue;
    const atual = itens[idx];
    const qAnt = atual.qtdAtual || 0;
    const cmAnt = atual.custoMedio ?? 0;
    const qNova = qAnt + l.qtd;
    // Custo médio ponderado
    const cmNovo = qNova > 0 ? (qAnt * cmAnt + l.qtd * l.custoUnit) / qNova : l.custoUnit;
    itens[idx] = { ...atual, qtdAtual: qNova, custoMedio: cmNovo, atualizadoEm: now, atualizadoPor: usuario };
    novosMov.push({
      id: novoMovId(), em: now, tipo: "Entrada",
      itemId: atual.id, itemNome: atual.nome, qtd: l.qtd,
      custoUnit: l.custoUnit, custoTotal: l.qtd * l.custoUnit,
      compraId, por: usuario,
    });
  }
  setState({ itens, movimentos: [...novosMov, ...state.movimentos].slice(0, 2000) });
  pushAudit({ entidade: "obra", entidadeId: compraId, acao: "estoque_entrada", usuario, detalhe: `${linhas.length} item(ns)` });
}

/** Saída para uma obra — registra CMV ao custo médio vigente. */
export function registrarSaidaObra(
  obraId: string,
  cliente: string,
  linhas: Array<{ itemId: string; qtd: number; obs?: string }>,
  usuario = "Estoque",
): { ok: boolean; cmvTotal: number; faltantes: string[] } {
  const itens = [...state.itens];
  const novosMov: MovimentoEstoque[] = [];
  const faltantes: string[] = [];
  const now = new Date().toISOString();
  let cmvTotal = 0;
  for (const l of linhas) {
    const idx = itens.findIndex((i) => i.id === l.itemId);
    if (idx < 0) { faltantes.push(l.itemId); continue; }
    const atual = itens[idx];
    if ((atual.qtdAtual || 0) < l.qtd) { faltantes.push(atual.nome); continue; }
    const cm = atual.custoMedio ?? 0;
    itens[idx] = { ...atual, qtdAtual: atual.qtdAtual - l.qtd, atualizadoEm: now, atualizadoPor: usuario };
    const total = l.qtd * cm;
    cmvTotal += total;
    novosMov.push({
      id: novoMovId(), em: now, tipo: "Saída",
      itemId: atual.id, itemNome: atual.nome, qtd: l.qtd,
      custoUnit: cm, custoTotal: total,
      obraId, cliente, por: usuario, obs: l.obs,
    });
  }
  if (novosMov.length === 0) return { ok: false, cmvTotal: 0, faltantes };
  setState({ itens, movimentos: [...novosMov, ...state.movimentos].slice(0, 2000) });
  pushAudit({ entidade: "obra", entidadeId: obraId, acao: "estoque_saida", usuario, detalhe: `CMV=${cmvTotal.toFixed(2)} (${novosMov.length} itens)` });
  return { ok: true, cmvTotal, faltantes };
}

// ----- Relatórios de CMV ---------------------------------------------------
export type CmvObra = {
  obraId: string;
  cliente: string;
  cmvTotal: number;
  itens: number;
  ultimaSaida: string;
};

export function cmvPorObra(): CmvObra[] {
  const map = new Map<string, CmvObra>();
  for (const m of state.movimentos) {
    if (m.tipo !== "Saída" || !m.obraId) continue;
    const cur = map.get(m.obraId) ?? {
      obraId: m.obraId, cliente: m.cliente ?? "", cmvTotal: 0, itens: 0, ultimaSaida: m.em,
    };
    cur.cmvTotal += m.custoTotal;
    cur.itens += 1;
    if (m.em > cur.ultimaSaida) cur.ultimaSaida = m.em;
    if (!cur.cliente && m.cliente) cur.cliente = m.cliente;
    map.set(m.obraId, cur);
  }
  return [...map.values()].sort((a, b) => b.cmvTotal - a.cmvTotal);
}

export function cmvDaObra(obraId: string): number {
  return state.movimentos
    .filter((m) => m.tipo === "Saída" && m.obraId === obraId)
    .reduce((s, m) => s + m.custoTotal, 0);
}

export function valorEstoqueTotal(): number {
  return state.itens.reduce((s, i) => s + (i.qtdAtual || 0) * (i.custoMedio ?? 0), 0);
}

// ============================================================================
// RESERVAS — bloqueio de estoque para uma obra (sem baixa física).
// ============================================================================

export function disponivelParaReserva(itemId: string, obraId?: string): number {
  const item = state.itens.find((x) => x.id === itemId);
  if (!item) return 0;
  const totalReservado = item.qtdReservada || 0;
  const propria = obraId
    ? (state.necessidades.find((n) => n.obraId === obraId)?.itens.find((i) => i.itemId === itemId)?.qtdReservada || 0)
    : 0;
  const outras = Math.max(0, totalReservado - propria);
  return Math.max(0, (item.qtdAtual || 0) - outras - propria);
}

export function reservarMaterial(
  obraId: string,
  itemId: string,
  qtd: number,
  usuario = "Estoque",
): { ok: boolean; erro?: string } {
  if (qtd <= 0) return { ok: false, erro: "Quantidade inválida." };
  const disp = disponivelParaReserva(itemId, obraId);
  if (disp < qtd) return { ok: false, erro: `Sem estoque disponível (disp=${disp}).` };

  const item = state.itens.find((x) => x.id === itemId)!;
  const itens = state.itens.map((i) =>
    i.id === itemId ? { ...i, qtdReservada: (i.qtdReservada || 0) + qtd } : i,
  );
  const necessidades = state.necessidades.map((n) =>
    n.obraId !== obraId ? n : {
      ...n,
      itens: n.itens.map((it) =>
        it.itemId !== itemId ? it : { ...it, qtdReservada: (it.qtdReservada || 0) + qtd },
      ),
      atualizadaEm: new Date().toISOString(),
    },
  );
  const mov: MovimentoEstoque = {
    id: novoMovId(), em: new Date().toISOString(), tipo: "Reserva",
    itemId, itemNome: item.nome, qtd, custoUnit: item.custoMedio ?? 0,
    custoTotal: qtd * (item.custoMedio ?? 0), obraId, por: usuario,
  };
  setState({ itens, necessidades, movimentos: [mov, ...state.movimentos].slice(0, 2000) });
  pushAudit({ entidade: "obra", entidadeId: obraId, acao: "estoque_reserva", usuario, detalhe: `${itemId}: ${qtd}` });
  return { ok: true };
}

export function liberarReserva(
  obraId: string,
  itemId: string,
  qtd: number,
  usuario = "Estoque",
  silencioso = false,
): { ok: boolean; erro?: string } {
  if (qtd <= 0) return { ok: false, erro: "Quantidade inválida." };
  const nec = state.necessidades.find((n) => n.obraId === obraId);
  const necIt = nec?.itens.find((i) => i.itemId === itemId);
  const reservada = necIt?.qtdReservada || 0;
  if (reservada < qtd) return { ok: false, erro: `Reserva insuficiente (res=${reservada}).` };

  const item = state.itens.find((x) => x.id === itemId)!;
  const itens = state.itens.map((i) =>
    i.id === itemId ? { ...i, qtdReservada: Math.max(0, (i.qtdReservada || 0) - qtd) } : i,
  );
  const necessidades = state.necessidades.map((n) =>
    n.obraId !== obraId ? n : {
      ...n,
      itens: n.itens.map((it) =>
        it.itemId !== itemId ? it : { ...it, qtdReservada: Math.max(0, (it.qtdReservada || 0) - qtd) },
      ),
      atualizadaEm: new Date().toISOString(),
    },
  );
  const movs: MovimentoEstoque[] = silencioso ? [] : [{
    id: novoMovId(), em: new Date().toISOString(), tipo: "Liberação",
    itemId, itemNome: item.nome, qtd, custoUnit: 0, custoTotal: 0, obraId, por: usuario,
  }];
  setState({ itens, necessidades, movimentos: [...movs, ...state.movimentos].slice(0, 2000) });
  if (!silencioso) pushAudit({ entidade: "obra", entidadeId: obraId, acao: "estoque_liberacao", usuario, detalhe: `${itemId}: ${qtd}` });
  return { ok: true };
}

// ============================================================================
// DEVOLUÇÃO — retorno de material de obra ao estoque.
// Usa o custo das saídas dessa obra/item (FIFO sobre Saídas) preservando o CM.
// ============================================================================
export function registrarDevolucaoObra(
  obraId: string,
  itemId: string,
  qtd: number,
  usuario = "Estoque",
  obs?: string,
): { ok: boolean; erro?: string; valor?: number } {
  if (qtd <= 0) return { ok: false, erro: "Quantidade inválida." };
  const item = state.itens.find((x) => x.id === itemId);
  if (!item) return { ok: false, erro: "Item não encontrado." };

  const saidas = state.movimentos
    .filter((m) => m.tipo === "Saída" && m.obraId === obraId && m.itemId === itemId)
    .slice().sort((a, b) => a.em.localeCompare(b.em));
  const devolvidos = new Map<string, number>();
  for (const d of state.movimentos.filter((m) => m.tipo === "Devolução" && m.obraId === obraId && m.itemId === itemId && m.refMovId)) {
    devolvidos.set(d.refMovId!, (devolvidos.get(d.refMovId!) || 0) + d.qtd);
  }
  let restante = qtd;
  let custoTotalDev = 0;
  const movs: MovimentoEstoque[] = [];
  const now = new Date().toISOString();
  for (const s of saidas) {
    if (restante <= 0) break;
    const disp = s.qtd - (devolvidos.get(s.id) || 0);
    if (disp <= 0) continue;
    const usar = Math.min(disp, restante);
    movs.push({
      id: novoMovId(), em: now, tipo: "Devolução",
      itemId: item.id, itemNome: item.nome, qtd: usar,
      custoUnit: s.custoUnit, custoTotal: usar * s.custoUnit,
      obraId, cliente: s.cliente, por: usuario, obs, refMovId: s.id,
    });
    custoTotalDev += usar * s.custoUnit;
    restante -= usar;
  }
  if (restante > 0) return { ok: false, erro: `Sem saídas suficientes para devolver (faltam ${restante}).` };

  const qAnt = item.qtdAtual || 0;
  const cmAnt = item.custoMedio ?? 0;
  const qNovo = qAnt + qtd;
  const cmDev = custoTotalDev / qtd;
  const cmNovo = qNovo > 0 ? (qAnt * cmAnt + qtd * cmDev) / qNovo : cmDev;
  const itens = state.itens.map((i) =>
    i.id === itemId ? { ...i, qtdAtual: qNovo, custoMedio: cmNovo, atualizadoEm: now, atualizadoPor: usuario } : i,
  );
  const necessidades = state.necessidades.map((n) =>
    n.obraId !== obraId ? n : {
      ...n,
      itens: n.itens.map((it) =>
        it.itemId !== itemId ? it : {
          ...it,
          qtdEntregue: Math.max(0, (it.qtdEntregue || 0) - qtd),
          entregaCompleta: false,
        },
      ),
      atualizadaEm: now,
    },
  );

  setState({ itens, necessidades, movimentos: [...movs, ...state.movimentos].slice(0, 2000) });
  pushAudit({ entidade: "obra", entidadeId: obraId, acao: "estoque_devolucao", usuario, detalhe: `${itemId}: ${qtd} (R$ ${custoTotalDev.toFixed(2)})` });
  return { ok: true, valor: custoTotalDev };
}

