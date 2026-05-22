// Fechamento contábil — por conta bancária + mês, com fechamento global derivado.
// Reabertura: apenas perfis com a capability "financeiro.fechar_mes" (admin master).
import { useEffect, useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";
import { recalcularBloqueiosFechamento } from "@/lib/fin-titulos-store";

export type FechamentoMes = {
  /** YYYY-MM */
  mes: string;
  /** id da conta financeira; ausente/"" = fechamento GLOBAL do mês (todas as contas). */
  contaId?: string;
  /** Saldo final conciliado da conta no encerramento (apenas para fechamento por conta). */
  saldoFinal?: number;
  fechadoEm: string;
  fechadoPor: string;
  reabertoEm?: string;
  reabertoPor?: string;
  observacao?: string;
};

const KEY = "ms.fin.fechamentos.v2";
const LEGACY_KEY = "ms.fin.fechamentos.v1";

type L = () => void;
const listeners = new Set<L>();
let cache: FechamentoMes[] | null = null;

function read(): FechamentoMes[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
    const legacy = localStorage.getItem(LEGACY_KEY);
    cache = legacy ? JSON.parse(legacy) : [];
    if (legacy) localStorage.setItem(KEY, JSON.stringify(cache));
  } catch { cache = []; }
  return cache!;
}
function write(next: FechamentoMes[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

export function useFechamentos(): FechamentoMes[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, read, () => []);
}

/** Ativo = sem reabertura registrada. */
function ativos(): FechamentoMes[] {
  return read().filter((x) => !x.reabertoEm);
}

/** Fechamento por conta+mês está ativo? (true se houver global do mês OU específico da conta). */
export function isMesFechado(mes: string, contaId?: string): boolean {
  const a = ativos();
  if (a.some((x) => x.mes === mes && (!x.contaId || x.contaId === ""))) return true;
  if (!contaId) return false;
  return a.some((x) => x.mes === mes && x.contaId === contaId);
}

/** Lista de contaId fechadas naquele mês (não inclui global). */
export function contasFechadasNoMes(mes: string): string[] {
  return ativos().filter((x) => x.mes === mes && !!x.contaId).map((x) => x.contaId!);
}

/** Há fechamento global do mês? */
export function isMesGlobalFechado(mes: string): boolean {
  return ativos().some((x) => x.mes === mes && (!x.contaId || x.contaId === ""));
}

export function fecharContaMes(args: { mes: string; contaId: string; saldoFinal: number; usuario: string; observacao?: string }) {
  const { mes, contaId, saldoFinal, usuario, observacao } = args;
  const cur = read().filter((x) => !(x.mes === mes && x.contaId === contaId));
  write([{ mes, contaId, saldoFinal, fechadoEm: new Date().toISOString(), fechadoPor: usuario, observacao }, ...cur]);
  recalcularBloqueiosFechamento();
  pushAudit({ entidade: "contrato", entidadeId: `FECH-${mes}-${contaId}`, acao: "FIN_FECHAMENTO", usuario, detalhe: `Conta ${contaId} fechada em ${mes} (saldo ${saldoFinal.toFixed(2)}).` });
}

export function reabrirContaMes(args: { mes: string; contaId: string; usuario: string; motivo: string }) {
  const { mes, contaId, usuario, motivo } = args;
  const cur = read();
  const idx = cur.findIndex((x) => x.mes === mes && x.contaId === contaId);
  if (idx < 0) return;
  const arr = [...cur];
  arr[idx] = { ...arr[idx], reabertoEm: new Date().toISOString(), reabertoPor: usuario, observacao: motivo };
  write(arr);
  recalcularBloqueiosFechamento();
  pushAudit({ entidade: "contrato", entidadeId: `FECH-${mes}-${contaId}`, acao: "FIN_REABERTURA", usuario, motivo });
}

/** Fechamento global do mês — pré-requisito: todas as contas ativas já fechadas naquele mês. */
export function fecharMesGlobal(mes: string, usuario: string, observacao?: string) {
  const cur = read().filter((x) => !(x.mes === mes && !x.contaId));
  write([{ mes, contaId: "", fechadoEm: new Date().toISOString(), fechadoPor: usuario, observacao }, ...cur]);
  recalcularBloqueiosFechamento();
  pushAudit({ entidade: "contrato", entidadeId: `FECH-${mes}-GLOBAL`, acao: "FIN_FECHAMENTO", usuario, detalhe: `Mês ${mes} fechado (global).` });
}

export function reabrirMesGlobal(mes: string, usuario: string, motivo: string) {
  const cur = read();
  const idx = cur.findIndex((x) => x.mes === mes && !x.contaId);
  if (idx < 0) return;
  const arr = [...cur];
  arr[idx] = { ...arr[idx], reabertoEm: new Date().toISOString(), reabertoPor: usuario, observacao: motivo };
  write(arr);
  recalcularBloqueiosFechamento();
  pushAudit({ entidade: "contrato", entidadeId: `FECH-${mes}-GLOBAL`, acao: "FIN_REABERTURA", usuario, motivo });
}

// Compat com chamadas antigas
export function fecharMes(mes: string, usuario: string, observacao?: string) {
  fecharMesGlobal(mes, usuario, observacao);
}
export function reabrirMes(mes: string, usuario: string, motivo: string) {
  reabrirMesGlobal(mes, usuario, motivo);
}

export { useEffect };
