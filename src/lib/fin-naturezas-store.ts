// Naturezas financeiras estruturadas — preparadas para integração contábil futura.
// Substitui o cadastro simples de `naturezas` em financeiro-store.ts (que segue
// existindo só para compatibilidade dos lançamentos antigos).
import { useEffect, useSyncExternalStore } from "react";

export type NaturezaFin = {
  id: string;
  codigo: string;                 // ex. "2.1.01"
  nome: string;
  grupoId: string;
  subgrupoId?: string;
  tipo: "Pagar" | "Receber";
  centroCustoPadraoId?: string;
  /** Se true, criar título com essa natureza exige centro de custo (#18). */
  centroCustoObrigatorio?: boolean;
  permiteVinculoObra: boolean;
  permiteVinculoEstoque: boolean;
  tipoAplicacaoPadraoId?: string;
  contaContabilFutura?: string;   // texto livre — preparação para Alterdata/Domínio
  ativo: boolean;
};

const KEY = "ms.fin.naturezas.v2";

// Seed alinhado com os grupos/subgrupos de fin-grupos-store
const SEED: NaturezaFin[] = [
  // Receitas
  { id: "N-001", codigo: "1.1.01", nome: "Receita venda FV",                    grupoId: "G-01", subgrupoId: "S-0101", tipo: "Receber", permiteVinculoObra: true,  permiteVinculoEstoque: false, ativo: true },
  { id: "N-002", codigo: "1.2.01", nome: "Receita manutenção",                  grupoId: "G-01", subgrupoId: "S-0102", tipo: "Receber", permiteVinculoObra: true,  permiteVinculoEstoque: false, ativo: true },
  { id: "N-003", codigo: "1.3.01", nome: "Liberação financiamento",             grupoId: "G-01", subgrupoId: "S-0103", tipo: "Receber", permiteVinculoObra: true,  permiteVinculoEstoque: false, ativo: true },
  // Custos diretos
  { id: "N-101", codigo: "2.1.01", nome: "Material aplicado em obra",           grupoId: "G-02", subgrupoId: "S-0201", tipo: "Pagar",   permiteVinculoObra: true,  permiteVinculoEstoque: true,  ativo: true },
  { id: "N-102", codigo: "2.1.02", nome: "Material manutenção",                 grupoId: "G-02", subgrupoId: "S-0201", tipo: "Pagar",   permiteVinculoObra: true,  permiteVinculoEstoque: true,  ativo: true },
  { id: "N-103", codigo: "2.2.01", nome: "Mão de obra instalação",              grupoId: "G-02", subgrupoId: "S-0202", tipo: "Pagar",   permiteVinculoObra: true,  permiteVinculoEstoque: false, ativo: true },
  { id: "N-104", codigo: "2.2.02", nome: "Mão de obra manutenção",              grupoId: "G-02", subgrupoId: "S-0202", tipo: "Pagar",   permiteVinculoObra: true,  permiteVinculoEstoque: false, ativo: true },
  { id: "N-105", codigo: "2.3.01", nome: "Frete obra",                           grupoId: "G-02", subgrupoId: "S-0203", tipo: "Pagar",   permiteVinculoObra: true,  permiteVinculoEstoque: false, ativo: true },
  { id: "N-106", codigo: "2.3.02", nome: "Frete manutenção",                     grupoId: "G-02", subgrupoId: "S-0203", tipo: "Pagar",   permiteVinculoObra: true,  permiteVinculoEstoque: false, ativo: true },
  { id: "N-107", codigo: "2.4.01", nome: "Terceiros / empreitada",               grupoId: "G-02", subgrupoId: "S-0204", tipo: "Pagar",   permiteVinculoObra: true,  permiteVinculoEstoque: false, ativo: true },
  // Custos indiretos
  { id: "N-201", codigo: "3.1.01", nome: "Engenharia / projetos",                grupoId: "G-03", subgrupoId: "S-0301", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-202", codigo: "3.2.01", nome: "Combustível frota",                    grupoId: "G-03", subgrupoId: "S-0302", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-203", codigo: "3.2.02", nome: "Manutenção veículos",                  grupoId: "G-03", subgrupoId: "S-0302", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  // Despesas administrativas
  { id: "N-301", codigo: "4.1.01", nome: "Folha administrativa",                 grupoId: "G-04", subgrupoId: "S-0401", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-302", codigo: "4.1.02", nome: "Pró-labore",                            grupoId: "G-04", subgrupoId: "S-0401", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-303", codigo: "4.1.03", nome: "Benefícios / encargos",                 grupoId: "G-04", subgrupoId: "S-0401", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-304", codigo: "4.2.01", nome: "Aluguel",                               grupoId: "G-04", subgrupoId: "S-0402", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-305", codigo: "4.2.02", nome: "Energia / Água",                        grupoId: "G-04", subgrupoId: "S-0402", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-306", codigo: "4.2.03", nome: "Internet / Telefonia",                  grupoId: "G-04", subgrupoId: "S-0402", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-307", codigo: "4.3.01", nome: "Software / Licenças",                   grupoId: "G-04", subgrupoId: "S-0403", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-308", codigo: "4.4.01", nome: "Contabilidade",                          grupoId: "G-04", subgrupoId: "S-0404", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-309", codigo: "4.4.02", nome: "Serviços profissionais (jurídico, etc.)", grupoId: "G-04", subgrupoId: "S-0404", tipo: "Pagar", permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  // Comerciais
  { id: "N-401", codigo: "5.1.01", nome: "Marketing",                              grupoId: "G-05", subgrupoId: "S-0501", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-402", codigo: "5.2.01", nome: "Comissões",                              grupoId: "G-05", subgrupoId: "S-0502", tipo: "Pagar",   permiteVinculoObra: true,  permiteVinculoEstoque: false, ativo: true },
  // Financeiro/Patrimonial
  { id: "N-701", codigo: "7.1.01", nome: "Impostos (DAS, ISS, etc.)",              grupoId: "G-07", subgrupoId: "S-0701", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-702", codigo: "7.2.01", nome: "Tarifas bancárias",                       grupoId: "G-07", subgrupoId: "S-0702", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
  { id: "N-703", codigo: "7.3.01", nome: "Parcelas de financiamento",               grupoId: "G-07", subgrupoId: "S-0703", tipo: "Pagar",   permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true },
];

type L = () => void;
const listeners = new Set<L>();
let cache: NaturezaFin[] | null = null;

function read(): NaturezaFin[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = SEED; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : SEED;
  } catch { cache = SEED; }
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(cache));
  return cache!;
}
function write(next: NaturezaFin[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

export function useNaturezasFin(): NaturezaFin[] {
  const list = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, read, () => SEED);
  useEffect(() => { read(); }, []);
  return list;
}
export function upsertNatureza(n: NaturezaFin) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === n.id);
  if (idx >= 0) { const arr = [...cur]; arr[idx] = n; write(arr); }
  else write([...cur, n]);
}
export function removeNatureza(id: string) { write(read().filter((x) => x.id !== id)); }
export function newNaturezaId() { return `N-${String(read().length + 1).padStart(3, "0")}`; }
