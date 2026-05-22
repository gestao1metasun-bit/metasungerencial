// ============================================================================
// Renegociação de Títulos Financeiros.
// - Mantém o título original (marcado como "renegociado") — nunca apaga.
// - Cria 1..N novos títulos vinculados via renegociacaoId.
// - Calcula juros/multa/desconto a partir de fin-parametros-financeiros.
// - Auditoria via pushAudit.
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";
import {
  getTitulo, criarTitulo,
  marcarTituloRenegociado, setTituloRenegociacaoOrigem,
} from "@/lib/fin-titulos-store";
import { getParametrosFinanceiros } from "@/lib/fin-parametros-financeiros-store";
import { calcularEncargos, nivelAprovacaoDesconto } from "@/lib/fin-calculo-encargos";

export type Renegociacao = {
  id: string;
  tituloOriginalId: string;
  data: string;                          // ISO
  motivo: string;
  observacao?: string;
  usuarioId: string;
  aprovadoPor?: string;
  nivelAprovacao: "auto" | "financeiro" | "diretoria";

  valorOriginal: number;
  saldoNoMomento: number;
  jurosCalculado: number;
  jurosAplicado: number;
  multaCalculada: number;
  multaAplicada: number;
  desconto: number;
  descontoPct: number;
  valorFinal: number;

  tipoSaida: "parcela_unica" | "parcelado";
  parcelasGeradas: string[];             // ids dos novos títulos
};

export type ParcelaPreview = {
  numero: number;
  vencimento: string;
  valor: number;
};

export type SimulacaoRenegociacao = {
  diasAtraso: number;
  saldoOriginal: number;
  jurosSugerido: number;
  multaSugerida: number;

  jurosAplicado: number;
  multaAplicada: number;
  desconto: number;
  descontoPct: number;
  valorFinal: number;

  nivelAprovacao: "auto" | "financeiro" | "diretoria";
  parcelas: ParcelaPreview[];
};

export type RenegociarInput = {
  tituloId: string;
  dataRef?: string;
  jurosAplicado: number;
  multaAplicada: number;
  desconto: number;
  parcelar: boolean;
  numeroParcelas: number;
  primeiroVencimento: string;
  intervaloDias: number;
  motivo: string;
  observacao?: string;
  aprovadoPor?: string;
};

// ----------------------------------------------------------------- persistência
const KEY = "ms.fin.renegociacoes.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Renegociacao[] | null = null;

function read(): Renegociacao[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Renegociacao[]) : [];
  } catch { cache = []; }
  return cache!;
}
function write(next: Renegociacao[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT: Renegociacao[] = [];
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useRenegociacoes(): Renegociacao[] {
  const v = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return v;
}
export function getRenegociacoes(): Renegociacao[] { return read(); }
export function getRenegociacoesPorTitulo(tituloId: string) {
  return read().filter((r) => r.tituloOriginalId === tituloId);
}

// ----------------------------------------------------------------- helpers
const round2 = (n: number) => Math.round(n * 100) / 100;
const newId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function distribuirParcelas(total: number, n: number): number[] {
  if (n <= 1) return [round2(total)];
  const base = Math.floor((total * 100) / n) / 100;
  const arr = Array(n).fill(base);
  const soma = round2(base * n);
  const resto = round2(total - soma);
  if (resto !== 0) arr[arr.length - 1] = round2(arr[arr.length - 1] + resto);
  return arr;
}

// ----------------------------------------------------------------- simulação
export function simularRenegociacao(input: {
  tituloId: string;
  dataRef?: string;
  jurosAplicado?: number;
  multaAplicada?: number;
  desconto?: number;
  parcelar?: boolean;
  numeroParcelas?: number;
  primeiroVencimento?: string;
  intervaloDias?: number;
}): SimulacaoRenegociacao {
  const titulo = getTitulo(input.tituloId);
  if (!titulo) throw new Error("Título não encontrado.");
  const params = getParametrosFinanceiros();
  const dataRef = input.dataRef ?? new Date().toISOString().slice(0, 10);
  const enc = calcularEncargos(titulo, dataRef, params);

  const jurosAplicado = round2(Math.max(0, input.jurosAplicado ?? enc.jurosSugerido));
  const multaAplicada = round2(Math.max(0, input.multaAplicada ?? enc.multaSugerida));
  const desconto = Math.max(0, round2(input.desconto ?? 0));

  const valorBruto = round2(enc.saldoOriginal + jurosAplicado + multaAplicada);
  const valorFinal = Math.max(0, round2(valorBruto - desconto));
  const descontoPct = valorBruto > 0 ? round2((desconto / valorBruto) * 100) : 0;
  const nivel = nivelAprovacaoDesconto(descontoPct, params);

  const n = input.parcelar ? Math.max(1, input.numeroParcelas ?? 1) : 1;
  const intervalo = input.intervaloDias ?? 30;
  const venc0 = input.primeiroVencimento ?? addDays(dataRef, intervalo);
  const valores = distribuirParcelas(valorFinal, n);
  const parcelas: ParcelaPreview[] = valores.map((v, i) => ({
    numero: i + 1,
    vencimento: i === 0 ? venc0 : addDays(venc0, i * intervalo),
    valor: v,
  }));

  return {
    diasAtraso: enc.diasAtraso,
    saldoOriginal: enc.saldoOriginal,
    jurosSugerido: enc.jurosSugerido,
    multaSugerida: enc.multaSugerida,
    jurosAplicado,
    multaAplicada,
    desconto,
    descontoPct,
    valorFinal,
    nivelAprovacao: nivel,
    parcelas,
  };
}

// ----------------------------------------------------------------- confirmação
export function confirmarRenegociacao(input: RenegociarInput, usuario = "Sistema"): Renegociacao {
  if (!input.motivo || input.motivo.trim().length < 5) {
    throw new Error("Motivo obrigatório (mínimo 5 caracteres).");
  }
  const titulo = getTitulo(input.tituloId);
  if (!titulo) throw new Error("Título não encontrado.");
  if (titulo.bloqueadoFechamento) throw new Error("Título bloqueado por fechamento mensal.");
  if (titulo.status === "cancelado") throw new Error("Título cancelado.");
  if (titulo.status === "pago" || titulo.status === "recebido") {
    throw new Error("Título já quitado — não é renegociável.");
  }
  if (titulo.statusRenegociacao === "renegociado") {
    throw new Error("Título já foi renegociado.");
  }

  const sim = simularRenegociacao({
    tituloId: input.tituloId,
    dataRef: input.dataRef,
    jurosAplicado: input.jurosAplicado,
    multaAplicada: input.multaAplicada,
    desconto: input.desconto,
    parcelar: input.parcelar,
    numeroParcelas: input.numeroParcelas,
    primeiroVencimento: input.primeiroVencimento,
    intervaloDias: input.intervaloDias,
  });

  if (sim.nivelAprovacao === "diretoria" && !input.aprovadoPor?.trim()) {
    throw new Error("Desconto exige aprovação da diretoria — informe o aprovador.");
  }

  const renegId = newId("RNG");
  const novosIds: string[] = [];

  sim.parcelas.forEach((p, i) => {
    const novo = criarTitulo({
      tipo: titulo.tipo,
      origem: titulo.origem,
      descricao: `Reneg. ${titulo.descricao}${sim.parcelas.length > 1 ? ` (${i + 1}/${sim.parcelas.length})` : ""}`,
      valorOriginal: p.valor,
      vencimento: p.vencimento,
      competencia: p.vencimento.slice(0, 7),
      natureza: titulo.natureza,
      centroCusto: titulo.centroCusto,
      naturezaId: titulo.naturezaId,
      grupoId: titulo.grupoId,
      subgrupoId: titulo.subgrupoId,
      centroCustoId: titulo.centroCustoId,
      tipoAplicacaoId: titulo.tipoAplicacaoId,
      meioPagamentoId: titulo.meioPagamentoId,
      contaFinanceira: titulo.contaFinanceira,
      meioPagamento: titulo.meioPagamento,
      fornecedor: titulo.fornecedor,
      cliente: titulo.cliente,
      obraId: titulo.obraId,
      contratoId: titulo.contratoId,
      parcelaLabel: sim.parcelas.length > 1 ? `${i + 1}/${sim.parcelas.length} (reneg.)` : "Renegociação",
      observacao: `Renegociação ${renegId}${input.observacao ? ` · ${input.observacao}` : ""}`,
    }, usuario);
    setTituloRenegociacaoOrigem(novo.id, renegId);
    novosIds.push(novo.id);
  });

  marcarTituloRenegociado(titulo.id, renegId, usuario);

  const reneg: Renegociacao = {
    id: renegId,
    tituloOriginalId: titulo.id,
    data: new Date().toISOString(),
    motivo: input.motivo.trim(),
    observacao: input.observacao,
    usuarioId: usuario,
    aprovadoPor: input.aprovadoPor,
    nivelAprovacao: sim.nivelAprovacao,

    valorOriginal: titulo.valorOriginal,
    saldoNoMomento: sim.saldoOriginal,
    jurosCalculado: sim.jurosSugerido,
    jurosAplicado: sim.jurosAplicado,
    multaCalculada: sim.multaSugerida,
    multaAplicada: sim.multaAplicada,
    desconto: sim.desconto,
    descontoPct: sim.descontoPct,
    valorFinal: sim.valorFinal,
    tipoSaida: sim.parcelas.length > 1 ? "parcelado" : "parcela_unica",
    parcelasGeradas: novosIds,
  };

  write([reneg, ...read()]);

  pushAudit({
    entidade: "contrato",
    entidadeId: titulo.contratoId ?? titulo.id,
    acao: "FIN_RENEGOCIACAO",
    usuario,
    motivo: reneg.motivo,
    detalhe: `Reneg ${renegId} · saldo R$ ${sim.saldoOriginal.toFixed(2)} → R$ ${sim.valorFinal.toFixed(2)} em ${sim.parcelas.length}x · desconto ${sim.descontoPct}% (${sim.nivelAprovacao})`,
  });

  return reneg;
}
