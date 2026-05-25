// ============================================================================
// Rescisão contratual (cancelamento de contrato com multa e devolução).
// - Soma o que já foi recebido do cliente (baixas em títulos AR do contrato +
//   adiantamentos vinculados).
// - Aplica multa rescisória (% sobre valor recebido OU valor fixo).
// - Cancela todos os títulos AR em aberto do contrato.
// - Cria um título AP de devolução ao cliente pelo líquido (recebido - multa).
// - Marca o contrato como Cancelado e registra histórico completo.
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";
import {
  getTitulos, cancelarTitulo, criarTitulo,
} from "@/lib/fin-titulos-store";
import { getAdiantamentos, estornarAdiantamento } from "@/lib/fin-adiantamentos-store";

export type RescisaoItem = {
  tituloId: string;
  saldoCancelado: number;
};

export type Rescisao = {
  id: string;
  contratoId: string;
  clienteNome: string;
  data: string;                          // YYYY-MM-DD
  motivo: string;
  responsavel?: string;

  valorRecebido: number;                 // soma das baixas válidas + adiantamentos ativos
  multaTipo: "percentual" | "fixo";
  multaValor: number;                    // % ou R$
  multaCalculada: number;
  devolucaoLiquida: number;              // recebido - multa
  contaDevolucao?: string;
  vencimentoDevolucao?: string;          // padrão: data + 30d

  titulosCancelados: RescisaoItem[];
  adiantamentosEstornados: string[];     // ids estornados
  tituloDevolucaoId?: string;            // AP criado p/ devolução

  observacao?: string;
  criadoEm: string;
};

const KEY = "ms.fin.rescisoes.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Rescisao[] | null = null;

function read(): Rescisao[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Rescisao[]) : [];
  } catch { cache = []; }
  return cache!;
}
function write(next: Rescisao[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT: Rescisao[] = [];
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useRescisoes(): Rescisao[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}
export function getRescisoes(): Rescisao[] { return read(); }

const round2 = (n: number) => Math.round(n * 100) / 100;
const isoNow = () => new Date().toISOString();
const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// ---------------------------------------------------------------- simulação
export type SimulacaoRescisao = {
  contratoId: string;
  clienteNome: string;
  valorRecebido: number;
  multaCalculada: number;
  devolucaoLiquida: number;
  titulosEmAberto: { id: string; descricao: string; saldo: number; vencimento: string }[];
  adiantamentosAtivos: { id: string; valor: number; saldo: number }[];
};

export type SimularInput = {
  contratoId: string;
  multaTipo: "percentual" | "fixo";
  multaValor: number;
};

export function simularRescisao(input: SimularInput): SimulacaoRescisao {
  const titulos = getTitulos().filter((t) => t.contratoId === input.contratoId);
  if (titulos.length === 0) throw new Error("Nenhum título encontrado para este contrato.");

  const cliente = titulos.find((t) => !!t.cliente)?.cliente ?? "—";

  // Recebido = soma de movimentos válidos em títulos AR
  const recebidoBaixas = titulos
    .filter((t) => t.tipo === "AR")
    .reduce(
      (s, t) => s + t.movimentos.filter((m) => !m.estornado).reduce((ss, m) => ss + m.valor, 0),
      0,
    );

  // + adiantamentos ativos vinculados ao contrato
  const adis = getAdiantamentos().filter(
    (a) => a.contratoId === input.contratoId && a.tipo === "cliente" && a.status === "ativo",
  );
  const recebidoAdiantamentos = adis.reduce((s, a) => s + a.saldoDisponivel, 0);
  const valorRecebido = round2(recebidoBaixas + recebidoAdiantamentos);

  const multa =
    input.multaTipo === "percentual"
      ? round2((valorRecebido * (input.multaValor ?? 0)) / 100)
      : round2(input.multaValor ?? 0);

  const devolucao = round2(Math.max(0, valorRecebido - multa));

  const emAberto = titulos
    .filter((t) => t.tipo === "AR" && t.status !== "cancelado" && t.saldo > 0.001)
    .map((t) => ({ id: t.id, descricao: t.descricao, saldo: t.saldo, vencimento: t.vencimento }));

  return {
    contratoId: input.contratoId,
    clienteNome: cliente,
    valorRecebido,
    multaCalculada: multa,
    devolucaoLiquida: devolucao,
    titulosEmAberto: emAberto,
    adiantamentosAtivos: adis.map((a) => ({ id: a.id, valor: a.valorOriginal, saldo: a.saldoDisponivel })),
  };
}

// ---------------------------------------------------------------- confirmação
export type ConfirmarRescisaoInput = SimularInput & {
  motivo: string;
  responsavel?: string;
  contaDevolucao?: string;
  vencimentoDevolucao?: string;
  observacao?: string;
};

export function confirmarRescisao(input: ConfirmarRescisaoInput, usuario = "Sistema"): Rescisao {
  if (!input.motivo || input.motivo.trim().length < 5) {
    throw new Error("Motivo obrigatório (mínimo 5 caracteres).");
  }
  const sim = simularRescisao(input);

  // 1) Cancela títulos AR em aberto
  const cancelados: RescisaoItem[] = [];
  for (const t of sim.titulosEmAberto) {
    try {
      cancelarTitulo(t.id, `Rescisão contrato ${input.contratoId}: ${input.motivo}`, usuario);
      cancelados.push({ tituloId: t.id, saldoCancelado: t.saldo });
    } catch (e) {
      // Continua mesmo que um deles esteja bloqueado por fechamento; auditoria registra.
      pushAudit({
        entidade: "contrato",
        entidadeId: input.contratoId,
        acao: "FIN_RESCISAO_AVISO",
        usuario,
        detalhe: `Não foi possível cancelar título ${t.id}: ${(e as Error).message}`,
      });
    }
  }

  // 2) Estorna adiantamentos ativos do contrato (valor entra na devolução)
  const estornados: string[] = [];
  for (const a of sim.adiantamentosAtivos) {
    try {
      estornarAdiantamento(a.id, `Rescisão contrato ${input.contratoId}`, usuario);
      estornados.push(a.id);
    } catch {
      // se já tem abatimento, mantém — o valor já virou baixa em AR
    }
  }

  // 3) Cria título AP de devolução (apenas se houver líquido a devolver)
  let tituloDevolucaoId: string | undefined;
  if (sim.devolucaoLiquida > 0.001) {
    const venc = input.vencimentoDevolucao
      ?? (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();
    const novo = criarTitulo(
      {
        tipo: "AP",
        origem: "manual",
        descricao: `Devolução por rescisão — contrato ${input.contratoId}`,
        valorOriginal: sim.devolucaoLiquida,
        vencimento: venc,
        competencia: venc.slice(0, 7),
        natureza: "Devolução",
        centroCusto: "Comercial",
        contaFinanceira: input.contaDevolucao,
        fornecedor: sim.clienteNome,                  // cliente vira fornecedor da devolução
        contratoId: input.contratoId,
        observacao: `Multa rescisória aplicada: R$ ${sim.multaCalculada.toFixed(2)} (${input.multaTipo === "percentual" ? input.multaValor + "%" : "fixo"}). ${input.observacao ?? ""}`.trim(),
        dataEmissao: new Date().toISOString().slice(0, 10),
      },
      { usuario },
    );
    tituloDevolucaoId = novo.id;
  }

  const resc: Rescisao = {
    id: newId("RSC"),
    contratoId: input.contratoId,
    clienteNome: sim.clienteNome,
    data: new Date().toISOString().slice(0, 10),
    motivo: input.motivo,
    responsavel: input.responsavel,
    valorRecebido: sim.valorRecebido,
    multaTipo: input.multaTipo,
    multaValor: input.multaValor,
    multaCalculada: sim.multaCalculada,
    devolucaoLiquida: sim.devolucaoLiquida,
    contaDevolucao: input.contaDevolucao,
    vencimentoDevolucao: input.vencimentoDevolucao,
    titulosCancelados: cancelados,
    adiantamentosEstornados: estornados,
    tituloDevolucaoId,
    observacao: input.observacao,
    criadoEm: isoNow(),
  };
  write([resc, ...read()]);

  pushAudit({
    entidade: "contrato",
    entidadeId: input.contratoId,
    acao: "FIN_RESCISAO_CONTRATO",
    usuario,
    detalhe: `Multa R$ ${sim.multaCalculada.toFixed(2)} · Devolução R$ ${sim.devolucaoLiquida.toFixed(2)} · ${cancelados.length} título(s) cancelado(s) — ${input.motivo}`,
  });

  return resc;
}
