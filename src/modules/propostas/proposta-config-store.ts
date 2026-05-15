// Configurações globais travadas da Proposta (tarifa padrão, etc.)
// Editáveis somente por Admin em /configuracoes#tab=proposta
import { useEffect, useSyncExternalStore } from "react";

export type PropostaConfig = {
  tarifaPadraoKwh: number;          // R$/kWh — usada em "3. Dados da Fatura"
  inversorMultBaixa: number;        // ≤ 37,5 kW
  inversorMultAlta: number;         // ≥ 40 kW
};

const KEY = "ms.fv.proposta_config.v1";
const DEFAULT: PropostaConfig = {
  tarifaPadraoKwh: 1.151730,
  inversorMultBaixa: 1.6,
  inversorMultAlta: 1.8,
};

const listeners = new Set<() => void>();
let cache: PropostaConfig | null = null;

function read(): PropostaConfig {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = DEFAULT; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = { ...DEFAULT, ...JSON.parse(raw) }; return cache!; }
  } catch {}
  cache = DEFAULT;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  return cache;
}

export function getPropostaConfig(): PropostaConfig { return read(); }

export function setPropostaConfig(patch: Partial<PropostaConfig>) {
  const next = { ...read(), ...patch };
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function usePropostaConfig(): PropostaConfig {
  const v = useSyncExternalStore(subscribe, () => read(), () => DEFAULT);
  useEffect(() => { read(); }, []);
  return v;
}
