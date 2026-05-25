// ============================================================================
// Títulos Financeiros — núcleo de Contas a Pagar (AP) / Contas a Receber (AR).
// Suporta nascimento automático (a partir de Comercial/Estoque/Engenharia),
// pagamento/recebimento parcial, estorno, vínculo com fechamento mensal,
// e auditoria via pushAudit().
//
// Persistência: localStorage (sem Supabase nesta fase).
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";
import { getNaturezas } from "@/lib/fin-naturezas-store";

export type TituloTipo = "AP" | "AR";

export type TituloOrigem =
  | "compra"        // AP: compra de material/estoque
  | "comissao"      // AP: comissão liberada (manual)
  | "mao_obra"      // AP: equipe de instalação
  | "frete"         // AP: frete utilizado
  | "manutencao"    // AP/AR: pós-venda
  | "contrato"      // AR: parcela de contrato assinado
  | "financiamento" // AR: liberação bancária
  | "manual";       // qualquer um, lançamento manual

export type TituloStatus =
  | "previsto"
  | "comprometido"
  | "parcial"
  | "a_pagar"
  | "a_receber"
  | "pago"
  | "recebido"
  | "cancelado";

export type Movimento = {
  id: string;
  data: string;          // ISO
  valor: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  contaFinanceira?: string;
  meioPagamento?: string;
  observacao?: string;
  usuario?: string;
  estornado?: boolean;
  estornoMotivo?: string;
  estornoEm?: string;
  estornoPor?: string;
};

export type Anexo = {
  id: string;                 // ID do registro em anexos_titulos (UUID) OU id legado local
  nome: string;
  mime: string;
  tamanho: number;
  storagePath?: string;       // novo: caminho no bucket privado Supabase
  dataUrl?: string;           // legado: base64 inline (apenas anexos antigos)
  enviadoEm: string;
  enviadoPor?: string;
};

export type Titulo = {
  id: string;
  tipo: TituloTipo;
  origem: TituloOrigem;
  status: TituloStatus;

  descricao: string;
  valorOriginal: number;
  valorPago: number;
  saldo: number;

  vencimento: string;
  competencia?: string;
  dataEmissao?: string;
  dataLiquidacao?: string;

  // Plano de contas gerencial (Fase 3 — estruturado)
  naturezaId?: string;
  grupoId?: string;
  subgrupoId?: string;
  centroCustoId?: string;
  tipoAplicacaoId?: string;
  meioPagamentoId?: string;

  // Strings legadas (compat com importações e telas antigas)
  natureza: string;
  centroCusto: string;
  contaFinanceira?: string;
  meioPagamento?: string;

  fornecedor?: string;    // AP
  cliente?: string;       // AR
  obraId?: string;
  contratoId?: string;
  parcelaLabel?: string;

  // Identificação de documento (#12 — duplicidade)
  documentoTipo?: "NF" | "Boleto" | "Recibo" | "Contrato" | "Outros";
  documentoNumero?: string;       // número da NF, código de barras boleto, etc.

  // Override controlado de duplicidade (#12)
  duplicidadePermitidaPor?: string;
  duplicidadePermitidaEm?: string;
  duplicidadeMotivo?: string;

  comprovanteUrl?: string;
  observacao?: string;
  anexos?: Anexo[];

  criadoPor?: string;
  criadoEm: string;

  /** Bloqueio para EDIÇÃO/ESTORNO/CANCEL — baseado na competência do título.
   *  NÃO bloqueia registro de baixa, que é validado pela DATA DO PAGAMENTO. */
  bloqueadoFechamento?: boolean;

  // Renegociação (Fase 31)
  renegociacaoId?: string;                            // título-filho: id da renegociação que o gerou
  renegociadoEm?: string;                             // título-pai: quando foi renegociado
  statusRenegociacao?: "ativo" | "renegociado";       // pai marcado como renegociado

  movimentos: Movimento[];
};

const KEY = "ms.fin.titulos.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Titulo[] | null = null;

function read(): Titulo[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Titulo[]) : [];
  } catch { cache = []; }
  return cache!;
}

function write(next: Titulo[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT: Titulo[] = [];
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useTitulos(): Titulo[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}

export function getTitulos(): Titulo[] { return read(); }
export function getTitulo(id: string): Titulo | undefined { return read().find((t) => t.id === id); }

// --------------------------------------------------------------------- helpers
const round2 = (n: number) => Math.round(n * 100) / 100;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function statusInicialPara(tipo: TituloTipo, origem: TituloOrigem): TituloStatus {
  if (origem === "contrato") return "previsto";
  if (origem === "financiamento") return "comprometido";
  return tipo === "AP" ? "a_pagar" : "a_receber";
}

function recomputarStatus(t: Titulo): TituloStatus {
  if (t.status === "cancelado") return "cancelado";
  if (t.valorPago <= 0) {
    // mantém status corrente se for previsto/comprometido
    if (t.status === "previsto" || t.status === "comprometido") return t.status;
    return t.tipo === "AP" ? "a_pagar" : "a_receber";
  }
  if (t.valorPago + 0.001 >= t.valorOriginal) {
    return t.tipo === "AP" ? "pago" : "recebido";
  }
  return "parcial";
}

// ---------------------------------------------------------------------- CRUD
export type CriarTituloInput = Omit<
  Titulo,
  "id" | "valorPago" | "saldo" | "status" | "criadoEm" | "movimentos"
> & {
  id?: string;
  status?: TituloStatus;
  criadoEm?: string;
  movimentos?: Movimento[];
};

export type CriarTituloOptions = {
  usuario?: string;
  /** Permite criar mesmo se houver duplicata candidata. Auditado. */
  permitirDuplicidade?: boolean;
  /** Motivo obrigatório quando permitirDuplicidade=true. */
  motivoDuplicidade?: string;
  /** Pula validação de centro de custo (uso interno: gatilhos automáticos). */
  pularValidacaoCentroCusto?: boolean;
};

export function criarTitulo(
  input: CriarTituloInput,
  usuarioOrOptions: string | CriarTituloOptions = "Sistema",
): Titulo {
  const opts: CriarTituloOptions =
    typeof usuarioOrOptions === "string" ? { usuario: usuarioOrOptions } : usuarioOrOptions;
  const usuario = opts.usuario ?? "Sistema";

  // ---- #18: centro de custo obrigatório por natureza
  if (!opts.pularValidacaoCentroCusto && input.naturezaId) {
    const nat = getNaturezas().find((n) => n.id === input.naturezaId);
    if (nat?.centroCustoObrigatorio && !input.centroCustoId && !input.centroCusto) {
      throw new Error(`Natureza "${nat.nome}" exige centro de custo.`);
    }
  }

  // ---- #12: detecção de duplicidade
  if (!opts.permitirDuplicidade) {
    const dups = detectarDuplicidade(input);
    if (dups.length > 0) {
      const ids = dups.slice(0, 3).map((d) => d.id).join(", ");
      throw new Error(
        `Possível duplicidade detectada (${dups.length}): ${ids}. ` +
        `Confirme a operação reenviando com permitirDuplicidade=true e motivoDuplicidade.`,
      );
    }
  } else if (!opts.motivoDuplicidade) {
    throw new Error("Override de duplicidade exige motivo.");
  }

  const id = input.id ?? newId(input.tipo === "AP" ? "AP" : "AR");
  const t: Titulo = {
    ...input,
    id,
    valorPago: 0,
    saldo: round2(input.valorOriginal),
    status: input.status ?? statusInicialPara(input.tipo, input.origem),
    criadoEm: input.criadoEm ?? isoNow(),
    criadoPor: input.criadoPor ?? usuario,
    movimentos: input.movimentos ?? [],
    duplicidadePermitidaPor: opts.permitirDuplicidade ? usuario : undefined,
    duplicidadePermitidaEm: opts.permitirDuplicidade ? isoNow() : undefined,
    duplicidadeMotivo: opts.permitirDuplicidade ? opts.motivoDuplicidade : undefined,
  };
  // dedupe por id
  const cur = read().filter((x) => x.id !== t.id);
  write([t, ...cur]);
  pushAudit({
    entidade: "contrato",
    entidadeId: t.contratoId ?? t.id,
    acao: opts.permitirDuplicidade ? "FIN_TITULO_CRIADO_DUPLICIDADE" : "FIN_TITULO_CRIADO",
    usuario,
    motivo: opts.motivoDuplicidade,
    detalhe: `${t.tipo} ${t.origem} · ${t.descricao} · R$ ${t.valorOriginal.toFixed(2)}`,
  });
  return t;
}

/** #12 — Detecta títulos potencialmente duplicados ao input.
 *  Critérios (qualquer um disparar): mesmo documentoTipo+documentoNumero não vazios;
 *  OU mesmo (tipo + contraparte + valor + vencimento ±3 dias). Ignora cancelados. */
export function detectarDuplicidade(input: Partial<Titulo>): Titulo[] {
  const all = read().filter((t) => t.status !== "cancelado" && t.id !== input.id);
  const out: Titulo[] = [];
  const contraparte = (t: Pick<Titulo, "fornecedor" | "cliente" | "tipo">) =>
    (t.tipo === "AP" ? t.fornecedor : t.cliente)?.trim().toLowerCase() ?? "";
  const inContraparte = contraparte(input as Titulo);
  const inDocNum = input.documentoNumero?.trim();
  const inDocTipo = input.documentoTipo;
  const inVenc = input.vencimento ? new Date(input.vencimento + "T00:00:00").getTime() : null;
  const inVal = input.valorOriginal != null ? round2(input.valorOriginal) : null;

  for (const t of all) {
    // 1) mesmo documento
    if (inDocNum && inDocTipo && t.documentoNumero?.trim() === inDocNum && t.documentoTipo === inDocTipo) {
      out.push(t);
      continue;
    }
    // 2) mesma contraparte + valor + vencimento próximo
    if (
      inContraparte &&
      contraparte(t) === inContraparte &&
      t.tipo === input.tipo &&
      inVal != null && round2(t.valorOriginal) === inVal &&
      inVenc != null
    ) {
      const tVenc = new Date(t.vencimento + "T00:00:00").getTime();
      const diffDias = Math.abs(tVenc - inVenc) / 86_400_000;
      if (diffDias <= 3) out.push(t);
    }
  }
  return out;
}

export function atualizarTitulo(id: string, patch: Partial<Titulo>, usuario = "Sistema", motivo?: string) {
  const cur = read();
  const idx = cur.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const before = cur[idx];
  if (before.bloqueadoFechamento) throw new Error("Título bloqueado por fechamento mensal.");
  if (before.status === "pago" || before.status === "recebido") {
    throw new Error("Título quitado — estorne antes de editar.");
  }
  const next: Titulo = { ...before, ...patch };
  next.valorOriginal = round2(next.valorOriginal);
  next.saldo = round2(next.valorOriginal - next.valorPago);
  next.status = recomputarStatus(next);
  const arr = [...cur]; arr[idx] = next; write(arr);

  // auditoria por campo
  (["valorOriginal", "vencimento", "natureza", "centroCusto", "observacao"] as const).forEach((k) => {
    if (before[k] !== next[k]) {
      pushAudit({
        entidade: "contrato",
        entidadeId: next.contratoId ?? next.id,
        acao: "FIN_TITULO_EDITADO",
        usuario, motivo, campo: k,
        valorAnterior: String(before[k] ?? ""),
        valorNovo: String(next[k] ?? ""),
      });
    }
  });
}

export function cancelarTitulo(id: string, motivo: string, usuario = "Sistema") {
  const cur = read();
  const idx = cur.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const before = cur[idx];
  if (before.valorPago > 0) throw new Error("Título já possui movimentos — estorne-os antes de cancelar.");
  const next: Titulo = { ...before, status: "cancelado", observacao: motivo };
  const arr = [...cur]; arr[idx] = next; write(arr);
  pushAudit({
    entidade: "contrato",
    entidadeId: next.contratoId ?? next.id,
    acao: "FIN_TITULO_CANCELADO",
    usuario, motivo,
  });
}

// ---------------------------------------------------------------- movimentos
export type BaixaInput = {
  valor: number;
  data?: string;          // YYYY-MM-DD; default hoje
  juros?: number;
  multa?: number;
  desconto?: number;
  contaFinanceira?: string;
  meioPagamento?: string;
  observacao?: string;
};

export function registrarBaixa(id: string, mov: BaixaInput, usuario = "Sistema"): Movimento {
  const cur = read();
  const idx = cur.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Título não encontrado.");
  const before = cur[idx];
  if (before.status === "cancelado") throw new Error("Título cancelado.");
  const dataPag = mov.data ?? new Date().toISOString().slice(0, 10);

  // ---- Fase A: o que bloqueia a baixa é o MÊS DO PAGAMENTO estar fechado,
  // não a competência do título. Conta vencida em abril e paga em maio é OK
  // enquanto maio estiver aberto.
  // Import dinâmico para evitar ciclo com fin-fechamento-store.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fech = require("@/lib/fin-fechamento-store") as typeof import("@/lib/fin-fechamento-store");
  const mesPag = dataPag.slice(0, 7);
  if (fech.isMesFechado(mesPag, mov.contaFinanceira ?? before.contaFinanceira)) {
    throw new Error(`Mês de pagamento (${mesPag}) está fechado. Reabra o período ou ajuste a data.`);
  }

  const valor = round2(mov.valor + (mov.juros ?? 0) + (mov.multa ?? 0) - (mov.desconto ?? 0));
  if (valor <= 0) throw new Error("Valor da baixa deve ser positivo.");
  if (before.valorPago + valor > before.valorOriginal + 0.01) {
    throw new Error(`Baixa excede o saldo (R$ ${before.saldo.toFixed(2)}).`);
  }

  const m: Movimento = {
    id: newId("MV"),
    data: mov.data ?? new Date().toISOString().slice(0, 10),
    valor,
    juros: mov.juros,
    multa: mov.multa,
    desconto: mov.desconto,
    contaFinanceira: mov.contaFinanceira ?? before.contaFinanceira,
    meioPagamento: mov.meioPagamento ?? before.meioPagamento,
    observacao: mov.observacao,
    usuario,
  };

  const movs = [...before.movimentos, m];
  const novoPago = round2(movs.filter((x) => !x.estornado).reduce((s, x) => s + x.valor, 0));
  const next: Titulo = {
    ...before,
    movimentos: movs,
    valorPago: novoPago,
    saldo: round2(before.valorOriginal - novoPago),
    contaFinanceira: m.contaFinanceira ?? before.contaFinanceira,
    meioPagamento: m.meioPagamento ?? before.meioPagamento,
    dataLiquidacao: novoPago + 0.001 >= before.valorOriginal ? m.data : before.dataLiquidacao,
  };
  next.status = recomputarStatus(next);
  const arr = [...cur]; arr[idx] = next; write(arr);

  pushAudit({
    entidade: "contrato",
    entidadeId: next.contratoId ?? next.id,
    acao: before.tipo === "AP" ? "FIN_PAGAMENTO" : "FIN_RECEBIMENTO",
    usuario,
    detalhe: `R$ ${valor.toFixed(2)} em ${m.data}${m.meioPagamento ? ` via ${m.meioPagamento}` : ""}`,
  });

  return m;
}

export function estornarMovimento(tituloId: string, movId: string, motivo: string, usuario = "Sistema") {
  const cur = read();
  const idx = cur.findIndex((t) => t.id === tituloId);
  if (idx < 0) return;
  const before = cur[idx];
  if (before.bloqueadoFechamento) throw new Error("Título bloqueado por fechamento mensal.");
  const movs = before.movimentos.map((m) =>
    m.id === movId && !m.estornado
      ? { ...m, estornado: true, estornoMotivo: motivo, estornoEm: isoNow(), estornoPor: usuario }
      : m,
  );
  const novoPago = round2(movs.filter((x) => !x.estornado).reduce((s, x) => s + x.valor, 0));
  const next: Titulo = {
    ...before,
    movimentos: movs,
    valorPago: novoPago,
    saldo: round2(before.valorOriginal - novoPago),
    dataLiquidacao: novoPago + 0.001 >= before.valorOriginal ? before.dataLiquidacao : undefined,
  };
  next.status = recomputarStatus(next);
  const arr = [...cur]; arr[idx] = next; write(arr);
  pushAudit({
    entidade: "contrato",
    entidadeId: next.contratoId ?? next.id,
    acao: "FIN_ESTORNO",
    usuario, motivo,
    detalhe: `Movimento ${movId} estornado`,
  });
}

// ---------------------------------------------------------------- anexos
export function adicionarAnexo(
  tituloId: string,
  anexo: Partial<Anexo> & Pick<Anexo, "nome" | "mime" | "tamanho">,
  usuario = "Sistema",
): Anexo {
  const cur = read();
  const idx = cur.findIndex((t) => t.id === tituloId);
  if (idx < 0) throw new Error("Título não encontrado.");
  const before = cur[idx];
  if (before.bloqueadoFechamento) throw new Error("Título bloqueado por fechamento mensal.");
  const a: Anexo = {
    id: anexo.id ?? newId("ANX"),
    nome: anexo.nome,
    mime: anexo.mime,
    tamanho: anexo.tamanho,
    storagePath: anexo.storagePath,
    dataUrl: anexo.dataUrl, // só presente em anexos legados
    enviadoEm: anexo.enviadoEm ?? isoNow(),
    enviadoPor: anexo.enviadoPor ?? usuario,
  };
  const arr = [...cur];
  arr[idx] = { ...before, anexos: [...(before.anexos ?? []), a] };
  write(arr);
  pushAudit({
    entidade: "contrato",
    entidadeId: before.contratoId ?? before.id,
    acao: "FIN_ANEXO_ADICIONADO",
    usuario,
    detalhe: `${a.nome} (${Math.round(a.tamanho / 1024)} KB)`,
  });
  return a;
}

export function removerAnexo(tituloId: string, anexoId: string, usuario = "Sistema") {
  const cur = read();
  const idx = cur.findIndex((t) => t.id === tituloId);
  if (idx < 0) return;
  const before = cur[idx];
  if (before.bloqueadoFechamento) throw new Error("Título bloqueado por fechamento mensal.");
  const removido = (before.anexos ?? []).find((x) => x.id === anexoId);
  const arr = [...cur];
  arr[idx] = { ...before, anexos: (before.anexos ?? []).filter((x) => x.id !== anexoId) };
  write(arr);
  pushAudit({
    entidade: "contrato",
    entidadeId: before.contratoId ?? before.id,
    acao: "FIN_ANEXO_REMOVIDO",
    usuario,
    detalhe: removido?.nome ?? anexoId,
  });
}

// ---------------------------------------------------- bloqueio por fechamento
/** Recalcula a flag bloqueadoFechamento de cada título consultando o store de fechamentos.
 *  Import dinâmico para evitar ciclo com fin-fechamento-store. */
export async function recalcularBloqueiosFechamento() {
  const { isMesFechado } = await import("@/lib/fin-fechamento-store");
  const cur = read();
  const arr = cur.map((t) => {
    const comp = t.competencia ?? t.vencimento.slice(0, 7);
    const fechado = isMesFechado(comp, t.contaFinanceira);
    return t.bloqueadoFechamento === fechado ? t : { ...t, bloqueadoFechamento: fechado };
  });
  write(arr);
}

/** @deprecated mantido para compat — usa apenas o mês, ignora conta. */
export function aplicarBloqueioFechamento(mesYYYYMM: string, bloquear: boolean) {
  const cur = read();
  const arr = cur.map((t) => {
    const comp = t.competencia ?? t.vencimento.slice(0, 7);
    return comp === mesYYYYMM ? { ...t, bloqueadoFechamento: bloquear } : t;
  });
  write(arr);
}

// ---------------------------------------------------------- helpers de origem

/** AP automática de compra de material. */
export function gerarAPdeCompra(args: {
  descricao: string; valor: number; vencimento: string;
  fornecedor?: string; obraId?: string; natureza?: string; centroCusto?: string;
  meioPagamento?: string;
}, usuario = "Estoque") {
  return criarTitulo({
    tipo: "AP", origem: "compra",
    descricao: args.descricao,
    valorOriginal: args.valor,
    vencimento: args.vencimento,
    competencia: args.vencimento.slice(0, 7),
    natureza: args.natureza ?? "Material",
    centroCusto: args.centroCusto ?? "Engenharia/Operação",
    fornecedor: args.fornecedor,
    obraId: args.obraId,
    meioPagamento: args.meioPagamento,
  }, usuario);
}

/** AP de comissão LIBERADA (manual — nunca automática a partir do contrato).
 *  Idempotente quando `id` é informado. */
export function gerarAPdeComissao(args: {
  contratoId: string; cliente: string; valor: number; vencimento: string;
  beneficiario: string; parcelaLabel?: string; id?: string;
}, usuario = "Comercial") {
  if (args.id) {
    const existente = read().find((t) => t.id === args.id);
    if (existente) return existente;
  }
  return criarTitulo({
    id: args.id,
    tipo: "AP", origem: "comissao",
    descricao: `Comissão ${args.beneficiario} · contrato ${args.contratoId} · ${args.cliente}`,
    valorOriginal: args.valor,
    vencimento: args.vencimento,
    competencia: args.vencimento.slice(0, 7),
    natureza: "Comissões",
    centroCusto: "Comercial",
    contratoId: args.contratoId,
    fornecedor: args.beneficiario,
    parcelaLabel: args.parcelaLabel,
  }, usuario);
}

/** AR automática de contrato (uma parcela). */
export function gerarARdeContratoParcela(args: {
  contratoId: string; cliente: string; valor: number; vencimento: string;
  parcelaLabel?: string; obraId?: string; meioPagamento?: string;
}, usuario = "Comercial") {
  return criarTitulo({
    tipo: "AR", origem: "contrato",
    descricao: `Parcela ${args.parcelaLabel ?? ""} · ${args.cliente} · contrato ${args.contratoId}`.trim(),
    valorOriginal: args.valor,
    vencimento: args.vencimento,
    competencia: args.vencimento.slice(0, 7),
    natureza: "Recebimento de cliente",
    centroCusto: "Comercial",
    cliente: args.cliente,
    contratoId: args.contratoId,
    obraId: args.obraId,
    parcelaLabel: args.parcelaLabel,
    meioPagamento: args.meioPagamento,
    status: "previsto",
  }, usuario);
}

/** AR de financiamento (liberação bancária). */
export function gerarARdeFinanciamento(args: {
  contratoId: string; cliente: string; valor: number; vencimento: string;
  banco?: string;
}, usuario = "Financiamentos") {
  return criarTitulo({
    tipo: "AR", origem: "financiamento",
    descricao: `Liberação ${args.banco ?? "banco"} · ${args.cliente} · contrato ${args.contratoId}`,
    valorOriginal: args.valor,
    vencimento: args.vencimento,
    competencia: args.vencimento.slice(0, 7),
    natureza: "Liberação financiamento",
    centroCusto: "Comercial",
    cliente: args.cliente,
    contratoId: args.contratoId,
    status: "comprometido",
  }, usuario);
}

/** Importa lançamentos legados (Previsto/A realizar) como títulos AR. */
export function importarPrevisoesDoLegado(lancs: Array<{
  id: string; data: string; descricao: string; tipo: "Entrada" | "Saída"; valor: number;
  camada: string; natureza: string; centroCusto: string;
  obra?: string; contrato?: string; cliente?: string; formaPagamento?: string; parcelaLabel?: string;
  competencia?: string;
}>) {
  const existentes = new Set(read().map((t) => t.id));
  const novos: Titulo[] = [];
  for (const l of lancs) {
    if (!(l.camada === "Previsto" || l.camada === "A realizar" || l.camada === "Confirmado")) continue;
    const id = `IMP-${l.id}`;
    if (existentes.has(id)) continue;
    const tipo: TituloTipo = l.tipo === "Entrada" ? "AR" : "AP";
    novos.push({
      id, tipo,
      origem: l.contrato ? "contrato" : "manual",
      status: l.camada === "Confirmado"
        ? (tipo === "AP" ? "a_pagar" : "a_receber")
        : (tipo === "AP" ? "previsto" : "previsto"),
      descricao: l.descricao,
      valorOriginal: round2(l.valor),
      valorPago: 0,
      saldo: round2(l.valor),
      vencimento: l.data,
      competencia: l.competencia ?? l.data.slice(0, 7),
      dataEmissao: l.data,
      natureza: l.natureza,
      centroCusto: l.centroCusto,
      cliente: l.cliente,
      contratoId: l.contrato,
      obraId: l.obra,
      parcelaLabel: l.parcelaLabel,
      meioPagamento: l.formaPagamento,
      criadoEm: isoNow(),
      criadoPor: "Importação",
      movimentos: [],
    });
  }
  if (novos.length) write([...novos, ...read()]);
  return novos.length;
}

// ===========================================================================
// Gatilhos automáticos (Fase C)
// ===========================================================================

type PagamentoLinhaLite = {
  id: string;
  tipo: string;
  momento?: string;
  valor: number;
  parcelas?: number;
  banco?: string;
  primeiroVencDias?: number;
  intervaloDias?: number;
};

type ContratoLite = {
  id: string;
  cliente: string;
  dataAssinatura?: string;
  pagamentoDetalhes?: { formas?: PagamentoLinhaLite[] };
  projetos?: Array<{ id: string }>;
};

function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(baseISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Gera (idempotentemente) os AR de um contrato assinado a partir da
 * composição `pagamentoDetalhes.formas`. Ignora linhas "Financiamento"
 * (essas viram AR apenas quando o financiamento for LIBERADO).
 * IDs determinísticos: `AR-CT-{contratoId}-{linhaId}-p{n}`.
 */
export function gerarARsDoContratoAssinado(contrato: ContratoLite, usuario = "Comercial"): number {
  const formas = contrato.pagamentoDetalhes?.formas ?? [];
  if (formas.length === 0) return 0;
  const base = contrato.dataAssinatura || new Date().toISOString().slice(0, 10);
  const obraId = contrato.projetos?.[0]?.id;
  const existentes = new Set(read().map((t) => t.id));
  let criados = 0;

  for (const linha of formas) {
    if (linha.tipo === "Financiamento") continue;
    const parcelas = Math.max(1, Number(linha.parcelas) || 1);
    const valorParc = round2((Number(linha.valor) || 0) / parcelas);
    if (valorParc <= 0) continue;
    const primeiro = Number(linha.primeiroVencDias ?? 0);
    const intervalo = Number(linha.intervaloDias ?? 30);

    for (let n = 1; n <= parcelas; n++) {
      const id = `AR-CT-${contrato.id}-${linha.id}-p${n}`;
      if (existentes.has(id)) continue;
      const dias = primeiro + (n - 1) * intervalo;
      const venc = addDaysISO(base, dias);
      criarTitulo({
        id, tipo: "AR", origem: "contrato",
        descricao: `${linha.tipo} ${parcelas > 1 ? `${n}/${parcelas}` : ""} · ${contrato.cliente} · contrato ${contrato.id}`.replace(/\s+/g, " ").trim(),
        valorOriginal: valorParc,
        vencimento: venc,
        competencia: venc.slice(0, 7),
        natureza: "Recebimento de cliente",
        centroCusto: "Comercial",
        cliente: contrato.cliente,
        contratoId: contrato.id,
        obraId,
        parcelaLabel: parcelas > 1 ? `${n}/${parcelas}` : undefined,
        meioPagamento: linha.tipo,
        status: "previsto",
      }, usuario);
      criados++;
    }
  }
  return criados;
}

/**
 * Gera (idempotentemente) um AR único quando o financiamento é LIBERADO.
 * ID determinístico: `AR-FIN-{contratoId}`.
 * Reusa `vencimento` = data informada (ou hoje).
 */
export function gerarARdeLiberacaoFinanciamento(args: {
  contratoId: string; cliente: string; valor: number;
  dataLiberacao?: string; banco?: string;
}, usuario = "Financiamentos"): Titulo | null {
  if (!(args.valor > 0)) return null;
  const id = `AR-FIN-${args.contratoId}`;
  const ja = read().find((t) => t.id === id);
  if (ja) return ja;
  const venc = args.dataLiberacao || new Date().toISOString().slice(0, 10);
  return criarTitulo({
    id, tipo: "AR", origem: "financiamento",
    descricao: `Liberação ${args.banco ?? "banco"} · ${args.cliente} · contrato ${args.contratoId}`,
    valorOriginal: round2(args.valor),
    vencimento: venc,
    competencia: venc.slice(0, 7),
    natureza: "Liberação financiamento",
    centroCusto: "Comercial",
    cliente: args.cliente,
    contratoId: args.contratoId,
    meioPagamento: "Financiamento",
    status: "a_receber",
  }, usuario);
}

// ===========================================================================
// Renegociação — helpers de baixo nível usados por fin-renegociacao-store
// ===========================================================================

/** Marca o título-pai como renegociado: zera saldo, define status especial.
 *  Preserva movimentos e valorPago — mantém histórico completo. */
export function marcarTituloRenegociado(tituloId: string, renegociacaoId: string, usuario = "Sistema") {
  const cur = read();
  const idx = cur.findIndex((t) => t.id === tituloId);
  if (idx < 0) throw new Error("Título não encontrado.");
  const before = cur[idx];
  if (before.bloqueadoFechamento) throw new Error("Título bloqueado por fechamento mensal.");
  const next: Titulo = {
    ...before,
    status: "cancelado",
    saldo: 0,
    renegociadoEm: isoNow(),
    statusRenegociacao: "renegociado",
    observacao: `${before.observacao ? before.observacao + " · " : ""}Renegociado em ${new Date().toLocaleDateString("pt-BR")} — ${renegociacaoId}`,
  };
  const arr = [...cur]; arr[idx] = next; write(arr);
  pushAudit({
    entidade: "contrato",
    entidadeId: next.contratoId ?? next.id,
    acao: "FIN_TITULO_RENEGOCIADO",
    usuario,
    detalhe: `Renegociação ${renegociacaoId}`,
  });
}

/** Marca um título-filho como originado por uma renegociação. */
export function setTituloRenegociacaoOrigem(tituloId: string, renegociacaoId: string) {
  const cur = read();
  const idx = cur.findIndex((t) => t.id === tituloId);
  if (idx < 0) return;
  const arr = [...cur];
  arr[idx] = { ...arr[idx], renegociacaoId };
  write(arr);
}


