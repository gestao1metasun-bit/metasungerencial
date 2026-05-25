// ============================================================================
// Adiantamentos (conta-corrente cliente/fornecedor)
// - Cliente paga antes (sinal/entrada) → adiantamento AR-credit (saldo a abater
//   em títulos AR futuros desse cliente).
// - Empresa paga fornecedor antes (sinal/compra programada) → adiantamento AP
//   (saldo a abater em títulos AP futuros desse fornecedor).
// Cada abatimento é imutável; histórico completo preservado.
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";
import { registrarBaixa, getTitulo } from "@/lib/fin-titulos-store";

export type AdiantamentoTipo = "cliente" | "fornecedor";

export type Abatimento = {
  id: string;
  data: string;        // YYYY-MM-DD
  valor: number;
  tituloId: string;
  movimentoId?: string;
  observacao?: string;
  usuario?: string;
};

export type Adiantamento = {
  id: string;
  tipo: AdiantamentoTipo;
  contraparteId?: string;
  contraparteNome: string;
  data: string;                  // data do recebimento/pagamento
  valorOriginal: number;
  saldoDisponivel: number;
  contaFinanceira?: string;
  meioPagamento?: string;
  contratoId?: string;
  origem?: "manual" | "contrato" | "compra";
  observacao?: string;
  abatimentos: Abatimento[];
  status: "ativo" | "consumido" | "estornado";
  criadoEm: string;
  criadoPor?: string;
  estornadoEm?: string;
  estornoMotivo?: string;
};

const KEY = "ms.fin.adiantamentos.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Adiantamento[] | null = null;

function read(): Adiantamento[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Adiantamento[]) : [];
  } catch { cache = []; }
  return cache!;
}
function write(next: Adiantamento[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT: Adiantamento[] = [];
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useAdiantamentos(): Adiantamento[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}
export function getAdiantamentos(): Adiantamento[] { return read(); }
export function getAdiantamento(id: string): Adiantamento | undefined {
  return read().find((a) => a.id === id);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const isoNow = () => new Date().toISOString();
const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// ---------------------------------------------------------------- saldos
export function getSaldoContraparte(tipo: AdiantamentoTipo, contraparteNome: string): number {
  return read()
    .filter((a) => a.tipo === tipo && a.contraparteNome === contraparteNome && a.status === "ativo")
    .reduce((s, a) => s + a.saldoDisponivel, 0);
}

export function listarAdiantamentosDisponiveis(tipo: AdiantamentoTipo, contraparteNome: string) {
  return read().filter(
    (a) => a.tipo === tipo && a.contraparteNome === contraparteNome && a.status === "ativo" && a.saldoDisponivel > 0.001,
  );
}

// ---------------------------------------------------------------- CRUD
export type RegistrarAdiantamentoInput = {
  tipo: AdiantamentoTipo;
  contraparteId?: string;
  contraparteNome: string;
  data?: string;
  valor: number;
  contaFinanceira?: string;
  meioPagamento?: string;
  contratoId?: string;
  origem?: Adiantamento["origem"];
  observacao?: string;
};

export function registrarAdiantamento(input: RegistrarAdiantamentoInput, usuario = "Sistema"): Adiantamento {
  if (input.valor <= 0) throw new Error("Valor do adiantamento deve ser positivo.");
  if (!input.contraparteNome?.trim()) throw new Error("Contraparte obrigatória.");
  const a: Adiantamento = {
    id: newId(input.tipo === "cliente" ? "ADC" : "ADF"),
    tipo: input.tipo,
    contraparteId: input.contraparteId,
    contraparteNome: input.contraparteNome.trim(),
    data: input.data ?? new Date().toISOString().slice(0, 10),
    valorOriginal: round2(input.valor),
    saldoDisponivel: round2(input.valor),
    contaFinanceira: input.contaFinanceira,
    meioPagamento: input.meioPagamento,
    contratoId: input.contratoId,
    origem: input.origem ?? "manual",
    observacao: input.observacao,
    abatimentos: [],
    status: "ativo",
    criadoEm: isoNow(),
    criadoPor: usuario,
  };
  write([a, ...read()]);
  pushAudit({
    entidade: "contrato",
    entidadeId: a.contratoId ?? a.id,
    acao: input.tipo === "cliente" ? "FIN_ADIANTAMENTO_CLIENTE" : "FIN_ADIANTAMENTO_FORNECEDOR",
    usuario,
    detalhe: `R$ ${a.valorOriginal.toFixed(2)} — ${a.contraparteNome}${a.contratoId ? ` (contrato ${a.contratoId})` : ""}`,
  });
  return a;
}

// ---------------------------------------------------------------- abatimento
export type AbaterInput = {
  adiantamentoId: string;
  tituloId: string;
  valor: number;
  data?: string;
  observacao?: string;
};

/** Abate parte/todo o saldo do adiantamento contra um título compatível.
 *  Gera um movimento de baixa no título (meioPagamento="Adiantamento") e
 *  diminui o saldo do adiantamento. Tudo auditado. */
export function abaterAdiantamento(input: AbaterInput, usuario = "Sistema"): Abatimento {
  if (input.valor <= 0) throw new Error("Valor do abatimento deve ser positivo.");
  const cur = read();
  const idx = cur.findIndex((a) => a.id === input.adiantamentoId);
  if (idx < 0) throw new Error("Adiantamento não encontrado.");
  const adi = cur[idx];
  if (adi.status !== "ativo") throw new Error("Adiantamento não está ativo.");
  if (input.valor > adi.saldoDisponivel + 0.001) {
    throw new Error(`Valor excede saldo disponível (R$ ${adi.saldoDisponivel.toFixed(2)}).`);
  }

  const titulo = getTitulo(input.tituloId);
  if (!titulo) throw new Error("Título não encontrado.");
  if (titulo.status === "cancelado") throw new Error("Título cancelado.");

  // Coerência: AR só abate adiantamento de cliente; AP só de fornecedor.
  if (titulo.tipo === "AR" && adi.tipo !== "cliente") {
    throw new Error("Adiantamento de fornecedor não pode abater um título a receber.");
  }
  if (titulo.tipo === "AP" && adi.tipo !== "fornecedor") {
    throw new Error("Adiantamento de cliente não pode abater um título a pagar.");
  }

  const valor = round2(Math.min(input.valor, titulo.saldo));
  if (valor <= 0) throw new Error("Título já está quitado.");

  const data = input.data ?? new Date().toISOString().slice(0, 10);
  const mov = registrarBaixa(
    titulo.id,
    {
      valor,
      data,
      contaFinanceira: adi.contaFinanceira,
      meioPagamento: "Adiantamento",
      observacao: `Abatimento adiantamento ${adi.id}${input.observacao ? ` — ${input.observacao}` : ""}`,
    },
    usuario,
  );

  const ab: Abatimento = {
    id: newId("AB"),
    data,
    valor,
    tituloId: titulo.id,
    movimentoId: mov.id,
    observacao: input.observacao,
    usuario,
  };
  const novoSaldo = round2(adi.saldoDisponivel - valor);
  const next: Adiantamento = {
    ...adi,
    abatimentos: [...adi.abatimentos, ab],
    saldoDisponivel: novoSaldo,
    status: novoSaldo <= 0.001 ? "consumido" : "ativo",
  };
  const arr = [...cur]; arr[idx] = next; write(arr);

  pushAudit({
    entidade: "contrato",
    entidadeId: titulo.contratoId ?? titulo.id,
    acao: "FIN_ADIANTAMENTO_ABATIDO",
    usuario,
    detalhe: `R$ ${valor.toFixed(2)} do adiantamento ${adi.id} → título ${titulo.id}`,
  });
  return ab;
}

// ---------------------------------------------------------------- estorno
export function estornarAdiantamento(id: string, motivo: string, usuario = "Sistema") {
  if (!motivo || motivo.trim().length < 5) throw new Error("Motivo obrigatório (mín. 5 caracteres).");
  const cur = read();
  const idx = cur.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("Adiantamento não encontrado.");
  const adi = cur[idx];
  if (adi.abatimentos.length > 0) {
    throw new Error("Estorno bloqueado: adiantamento já possui abatimentos. Estorne primeiro as baixas.");
  }
  const next: Adiantamento = {
    ...adi,
    status: "estornado",
    saldoDisponivel: 0,
    estornadoEm: isoNow(),
    estornoMotivo: motivo,
  };
  const arr = [...cur]; arr[idx] = next; write(arr);
  pushAudit({
    entidade: "contrato",
    entidadeId: adi.contratoId ?? adi.id,
    acao: "FIN_ADIANTAMENTO_ESTORNADO",
    usuario,
    detalhe: `${adi.id} — ${motivo}`,
  });
}
