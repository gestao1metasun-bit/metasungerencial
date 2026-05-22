// ============================================================================
// Conciliação Bancária — extrato importado x títulos AP/AR.
// Cada linha do extrato é um "ExtratoLancamento" com valor assinado
// (negativo = saída, positivo = entrada). Pode estar: pendente, conciliado
// (com tituloId+movimentoId) ou ignorado.
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";
import { registrarBaixa, getTitulo } from "@/lib/fin-titulos-store";

export type ExtratoStatus = "pendente" | "conciliado" | "ignorado";

export type ExtratoLancamento = {
  id: string;
  contaFinanceira: string; // id da conta (CF-xxx)
  data: string;            // YYYY-MM-DD
  descricao: string;
  valor: number;           // assinado: + entrada, - saída
  documento?: string;
  status: ExtratoStatus;
  tituloId?: string;
  movimentoId?: string;
  observacao?: string;
  importadoEm: string;     // ISO
};

const KEY = "ms.fin.conciliacao.v1";
type L = () => void;
const listeners = new Set<L>();
let cache: ExtratoLancamento[] | null = null;

function read(): ExtratoLancamento[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : [];
  } catch { cache = []; }
  return cache!;
}
function write(next: ExtratoLancamento[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

const SERVER: ExtratoLancamento[] = [];
export function useExtrato(): ExtratoLancamento[] {
  const list = useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    read, () => SERVER,
  );
  useEffect(() => { read(); }, []);
  return list;
}
export function getExtrato() { return read(); }

const newId = () => `EX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function adicionarLancamentoExtrato(
  args: Omit<ExtratoLancamento, "id" | "status" | "importadoEm">,
  usuario = "Conciliação",
) {
  const e: ExtratoLancamento = {
    ...args,
    id: newId(),
    valor: round2(args.valor),
    status: "pendente",
    importadoEm: new Date().toISOString(),
  };
  write([e, ...read()]);
  pushAudit({
    entidade: "contrato", entidadeId: e.id, acao: "FIN_TITULO_CRIADO", usuario,
    detalhe: `Extrato bancário · ${e.descricao} · R$ ${e.valor.toFixed(2)}`,
  });
  return e;
}

/**
 * Importa um CSV simples — separador ; ou , — com colunas:
 *   data;descricao;valor[;documento]
 * `data` aceita YYYY-MM-DD ou DD/MM/YYYY.
 * `valor` aceita "1.234,56", "-50.00", "(120,00)" etc.
 * Retorna a quantidade de linhas adicionadas.
 */
export function importarExtratoCSV(contaFinanceira: string, csv: string): number {
  const linhas = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let inseridos = 0;
  for (const raw of linhas) {
    const sep = raw.includes(";") ? ";" : ",";
    const cols = raw.split(sep).map((c) => c.trim());
    if (cols.length < 3) continue;
    if (/^data/i.test(cols[0])) continue; // header
    const data = parseData(cols[0]);
    const descricao = cols[1];
    const valor = parseValor(cols[2]);
    const documento = cols[3];
    if (!data || !descricao || !Number.isFinite(valor)) continue;
    adicionarLancamentoExtrato({ contaFinanceira, data, descricao, valor, documento });
    inseridos++;
  }
  return inseridos;
}

function parseData(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}
function parseValor(s: string): number {
  let v = s.replace(/\s/g, "");
  const neg = /^\(.*\)$/.test(v);
  if (neg) v = v.slice(1, -1);
  // pt-BR "1.234,56" -> "1234.56"
  if (v.includes(",") && (v.lastIndexOf(",") > v.lastIndexOf("."))) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else {
    v = v.replace(/,/g, "");
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return neg ? -Math.abs(n) : n;
}

/**
 * Sugere títulos candidatos: mesmo "lado" do valor (AR p/ entrada, AP p/ saída),
 * status aberto, valor próximo (saldo dentro de ±5% ou ±R$5), vencimento próximo
 * (até 30 dias do lançamento). Score = inverso da diferença valor+data.
 */
export function sugerirCandidatos(
  extrato: ExtratoLancamento,
  titulos: Array<{
    id: string; tipo: "AP" | "AR"; status: string; saldo: number; valorOriginal: number;
    descricao: string; cliente?: string; fornecedor?: string; vencimento: string;
  }>,
) {
  const targetTipo = extrato.valor >= 0 ? "AR" : "AP";
  const target = Math.abs(extrato.valor);
  const extDate = new Date(extrato.data + "T00:00:00").getTime();
  return titulos
    .filter((t) => t.tipo === targetTipo)
    .filter((t) => !["pago", "recebido", "cancelado"].includes(t.status))
    .filter((t) => t.saldo > 0)
    .map((t) => {
      const dif = Math.abs(t.saldo - target);
      const tol = Math.max(5, t.valorOriginal * 0.05);
      const dDate = Math.abs(extDate - new Date(t.vencimento + "T00:00:00").getTime()) / 86400000;
      const exato = dif <= 0.01;
      const score = (exato ? 1000 : 0) + Math.max(0, 100 - dif) + Math.max(0, 30 - dDate);
      return { t, dif, dDate, exato, score, tol };
    })
    .filter((c) => c.dif <= c.tol || c.exato)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

/**
 * Concilia uma linha do extrato com um título: registra a baixa correspondente
 * e marca o extrato como conciliado.
 */
export function conciliar(
  extratoId: string, tituloId: string, usuario = "Conciliação", observacao?: string,
) {
  const cur = read();
  const idx = cur.findIndex((e) => e.id === extratoId);
  if (idx < 0) throw new Error("Lançamento de extrato não encontrado.");
  const e = cur[idx];
  if (e.status !== "pendente") throw new Error("Lançamento já conciliado/ignorado.");
  const t = getTitulo(tituloId);
  if (!t) throw new Error("Título não encontrado.");
  const valorBaixa = Math.min(Math.abs(e.valor), t.saldo);
  const mov = registrarBaixa(tituloId, {
    valor: valorBaixa, data: e.data,
    contaFinanceira: e.contaFinanceira,
    observacao: observacao ?? `Conciliação bancária · ${e.descricao}`,
  }, usuario);
  const arr = [...cur];
  arr[idx] = { ...e, status: "conciliado", tituloId, movimentoId: mov.id, observacao };
  write(arr);
  pushAudit({
    entidade: "contrato", entidadeId: tituloId, acao: "FIN_TITULO_EDITADO",
    usuario, detalhe: `Conciliado ao extrato ${e.id}`,
  });
}

export function ignorarExtrato(extratoId: string, motivo: string, usuario = "Conciliação") {
  const cur = read();
  const idx = cur.findIndex((e) => e.id === extratoId);
  if (idx < 0) return;
  const arr = [...cur];
  arr[idx] = { ...arr[idx], status: "ignorado", observacao: motivo };
  write(arr);
  pushAudit({
    entidade: "contrato", entidadeId: arr[idx].id, acao: "FIN_TITULO_EDITADO",
    usuario, motivo, detalhe: "Extrato ignorado na conciliação",
  });
}

export function desfazerConciliacao(extratoId: string, usuario = "Conciliação") {
  const cur = read();
  const idx = cur.findIndex((e) => e.id === extratoId);
  if (idx < 0) return;
  const arr = [...cur];
  // Não estornamos o movimento automaticamente: o usuário deve estornar
  // manualmente em "Histórico" do título caso queira reverter a baixa.
  arr[idx] = { ...arr[idx], status: "pendente", tituloId: undefined, movimentoId: undefined };
  write(arr);
  pushAudit({
    entidade: "contrato", entidadeId: arr[idx].id, acao: "FIN_TITULO_EDITADO",
    usuario, detalhe: "Conciliação desfeita (estornar baixa se necessário)",
  });
}

export function removerExtrato(extratoId: string) {
  write(read().filter((e) => e.id !== extratoId));
}
