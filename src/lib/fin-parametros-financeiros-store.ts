// ============================================================================
// Parâmetros Financeiros — política de juros, multa, desconto e tolerâncias.
// Usado pelo simulador e pelas renegociações. Persistência localStorage.
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";

export type ParametrosFinanceiros = {
  // Juros de mora
  jurosTipo: "percentual" | "fixo";   // % do valor / R$ fixo por período
  jurosModo: "diario" | "mensal";     // base de cálculo
  jurosValor: number;                 // ex: 1 (% a.m.) ou 0.033 (% a.d.)

  // Multa
  multaTipo: "percentual" | "fixo";
  multaValor: number;                 // ex: 2 (%) ou 50 (R$)

  // Tolerâncias
  carenciaDias: number;               // dias após vencimento sem juros
  toleranciaAtrasoDias: number;       // dias após vencimento sem multa

  // Aprovação de desconto (% sobre valor com encargos)
  limiteDescontoSemAprovacao: number; // até esse % auto-aprovado
  limiteDescontoDiretoria: number;    // acima desse % exige diretoria

  updatedAt?: string;
  updatedBy?: string;
};

const DEFAULTS: ParametrosFinanceiros = {
  jurosTipo: "percentual",
  jurosModo: "mensal",
  jurosValor: 1,            // 1% a.m.
  multaTipo: "percentual",
  multaValor: 2,            // 2%
  carenciaDias: 0,
  toleranciaAtrasoDias: 0,
  limiteDescontoSemAprovacao: 5,    // até 5% auto
  limiteDescontoDiretoria: 10,      // > 10% requer diretoria
};

const KEY = "ms.fin.parametros.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: ParametrosFinanceiros | null = null;

function read(): ParametrosFinanceiros {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = { ...DEFAULTS }; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { cache = { ...DEFAULTS }; }
  return cache!;
}

function write(next: ParametrosFinanceiros) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT: ParametrosFinanceiros = DEFAULTS;
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useParametrosFinanceiros(): ParametrosFinanceiros {
  const v = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return v;
}

export function getParametrosFinanceiros(): ParametrosFinanceiros { return read(); }

export function salvarParametrosFinanceiros(patch: Partial<ParametrosFinanceiros>, usuario = "Sistema") {
  const before = read();
  const next: ParametrosFinanceiros = {
    ...before,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy: usuario,
  };
  write(next);
  pushAudit({
    entidade: "contrato",
    entidadeId: "fin-parametros",
    acao: "FIN_PARAMETROS_ATUALIZADOS",
    usuario,
    detalhe: `Juros ${next.jurosValor}${next.jurosTipo === "percentual" ? "%" : "R$"}/${next.jurosModo} · Multa ${next.multaValor}${next.multaTipo === "percentual" ? "%" : "R$"}`,
  });
}
