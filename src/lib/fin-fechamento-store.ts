// Fechamento mensal — bloqueia edição/baixa de títulos do mês.
// Reabertura: apenas perfis com a capability "financeiro.fechar_mes" (admin master).
import { useEffect, useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";
import { aplicarBloqueioFechamento } from "@/lib/fin-titulos-store";

export type FechamentoMes = {
  mes: string;            // YYYY-MM
  fechadoEm: string;      // ISO
  fechadoPor: string;
  reabertoEm?: string;
  reabertoPor?: string;
  observacao?: string;
};

const KEY = "ms.fin.fechamentos.v1";
type L = () => void;
const listeners = new Set<L>();
let cache: FechamentoMes[] | null = null;

function read(): FechamentoMes[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : [];
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

export function isMesFechado(mes: string): boolean {
  const f = read().find((x) => x.mes === mes);
  return !!f && !f.reabertoEm;
}

export function fecharMes(mes: string, usuario: string, observacao?: string) {
  const cur = read().filter((x) => x.mes !== mes);
  write([{ mes, fechadoEm: new Date().toISOString(), fechadoPor: usuario, observacao }, ...cur]);
  aplicarBloqueioFechamento(mes, true);
  pushAudit({ entidade: "contrato", entidadeId: `FECH-${mes}`, acao: "FIN_FECHAMENTO", usuario, detalhe: `Mês ${mes} fechado.` });
}

export function reabrirMes(mes: string, usuario: string, motivo: string) {
  const cur = read();
  const idx = cur.findIndex((x) => x.mes === mes);
  if (idx < 0) return;
  const arr = [...cur];
  arr[idx] = { ...arr[idx], reabertoEm: new Date().toISOString(), reabertoPor: usuario, observacao: motivo };
  write(arr);
  aplicarBloqueioFechamento(mes, false);
  pushAudit({ entidade: "contrato", entidadeId: `FECH-${mes}`, acao: "FIN_REABERTURA", usuario, motivo });
}

export { useEffect };
