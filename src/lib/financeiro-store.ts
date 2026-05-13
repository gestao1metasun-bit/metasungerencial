// Financeiro — store local (localStorage) para fluxo de caixa completo
import { useEffect, useState } from "react";

export type Camada = "Realizado" | "Confirmado" | "Previsto" | "A realizar" | "Orçado futuro";
export type Tipo = "Entrada" | "Saída";
export type Recorrencia = "Única" | "Mensal" | "Quinzenal" | "Semanal" | "Anual" | "Personalizada";

export type Lancamento = {
  id: string;
  data: string;            // YYYY-MM-DD
  descricao: string;
  tipo: Tipo;
  valor: number;
  camada: Camada;
  natureza: string;        // ex: "Material", "Aluguel", "Folha"
  centroCusto: string;     // ex: "Administrativo", "OB-0231"
  obra?: string;           // vínculo opcional com obra
  empresa: string;         // ex: "Meta Sun"
  filial: string;          // ex: "Manaus"
  responsavel?: string;
  obs?: string;
};

export type DespesaRecorrente = {
  id: string;
  descricao: string;
  valor: number;
  recorrencia: Recorrencia;
  diaVencimento: number;     // 1..28
  natureza: string;
  centroCusto: string;
  empresa: string;
  filial: string;
  responsavel?: string;
  ativa: boolean;
};

export type CentroCusto = { id: string; nome: string; tipo: "Administrativo" | "Operacional" | "Comercial" | "Obra" };
export type Natureza = { id: string; nome: string; tipo: Tipo };

const LS_LANC = "metasun.fin.lancamentos.v1";
const LS_REC = "metasun.fin.recorrentes.v1";
const LS_CC = "metasun.fin.centros.v1";
const LS_NAT = "metasun.fin.naturezas.v1";

// ---------- seeds ----------
const seedNaturezas: Natureza[] = [
  { id: "n1", nome: "Material", tipo: "Saída" },
  { id: "n2", nome: "Mão de obra", tipo: "Saída" },
  { id: "n3", nome: "Logística/Frete", tipo: "Saída" },
  { id: "n4", nome: "Combustível", tipo: "Saída" },
  { id: "n5", nome: "Hospedagem", tipo: "Saída" },
  { id: "n6", nome: "Terceiros", tipo: "Saída" },
  { id: "n7", nome: "Aluguel", tipo: "Saída" },
  { id: "n8", nome: "Folha de pagamento", tipo: "Saída" },
  { id: "n9", nome: "Pró-labore", tipo: "Saída" },
  { id: "n10", nome: "Energia/Água", tipo: "Saída" },
  { id: "n11", nome: "Internet/Telefonia", tipo: "Saída" },
  { id: "n12", nome: "Software/Licenças", tipo: "Saída" },
  { id: "n13", nome: "Contabilidade", tipo: "Saída" },
  { id: "n14", nome: "Marketing", tipo: "Saída" },
  { id: "n15", nome: "Manutenção/Limpeza", tipo: "Saída" },
  { id: "n16", nome: "Impostos", tipo: "Saída" },
  { id: "n17", nome: "Financiamentos", tipo: "Saída" },
  { id: "n18", nome: "Veículos/Seguros", tipo: "Saída" },
  { id: "n19", nome: "Benefícios/Encargos", tipo: "Saída" },
  { id: "n20", nome: "Comissões", tipo: "Saída" },
  { id: "n21", nome: "Despesas bancárias", tipo: "Saída" },
  { id: "n50", nome: "Recebimento de cliente", tipo: "Entrada" },
  { id: "n51", nome: "Liberação financiamento", tipo: "Entrada" },
  { id: "n52", nome: "Parcelas/Recorrentes", tipo: "Entrada" },
  { id: "n53", nome: "Outras receitas", tipo: "Entrada" },
];

const seedCentros: CentroCusto[] = [
  { id: "c1", nome: "Administrativo", tipo: "Administrativo" },
  { id: "c2", nome: "Comercial", tipo: "Comercial" },
  { id: "c3", nome: "Engenharia/Operação", tipo: "Operacional" },
  { id: "c4", nome: "Frota", tipo: "Operacional" },
  { id: "c5", nome: "Marketing", tipo: "Administrativo" },
];

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const seedLanc: Lancamento[] = [
  // realizados
  { id: "L-001", data: iso(addDays(today, -8)), descricao: "Aluguel sede", tipo: "Saída", valor: 12000, camada: "Realizado", natureza: "Aluguel", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus" },
  { id: "L-002", data: iso(addDays(today, -5)), descricao: "Folha de pagamento", tipo: "Saída", valor: 178000, camada: "Realizado", natureza: "Folha de pagamento", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus" },
  { id: "L-003", data: iso(addDays(today, -4)), descricao: "Liberação BASA — FIN-0087", tipo: "Entrada", valor: 360000, camada: "Realizado", natureza: "Liberação financiamento", centroCusto: "Comercial", obra: "OB-0230", empresa: "Meta Sun", filial: "Manaus" },
  { id: "L-004", data: iso(addDays(today, -3)), descricao: "Material — OB-0231 (módulos)", tipo: "Saída", valor: 42000, camada: "Realizado", natureza: "Material", centroCusto: "Engenharia/Operação", obra: "OB-0231", empresa: "Meta Sun", filial: "Manaus" },
  { id: "L-005", data: iso(addDays(today, -2)), descricao: "Combustível frota", tipo: "Saída", valor: 3200, camada: "Realizado", natureza: "Combustível", centroCusto: "Frota", empresa: "Meta Sun", filial: "Manaus" },
  // confirmados
  { id: "L-010", data: iso(addDays(today, 2)), descricao: "Boleto Canadian Solar", tipo: "Saída", valor: 142000, camada: "Confirmado", natureza: "Material", centroCusto: "Engenharia/Operação", obra: "OB-0230", empresa: "Meta Sun", filial: "Manaus" },
  { id: "L-011", data: iso(addDays(today, 4)), descricao: "Recebimento cliente — CT-0142 P1", tipo: "Entrada", valor: 29667, camada: "Confirmado", natureza: "Recebimento de cliente", centroCusto: "Comercial", empresa: "Meta Sun", filial: "Manaus" },
  { id: "L-012", data: iso(addDays(today, 5)), descricao: "Impostos DAS", tipo: "Saída", valor: 18500, camada: "Confirmado", natureza: "Impostos", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus" },
  // previstos
  { id: "L-020", data: iso(addDays(today, 9)), descricao: "Mão de obra OB-0228", tipo: "Saída", valor: 22000, camada: "Previsto", natureza: "Mão de obra", centroCusto: "Engenharia/Operação", obra: "OB-0228", empresa: "Meta Sun", filial: "Manaus" },
  { id: "L-021", data: iso(addDays(today, 12)), descricao: "Liberação SICREDI prevista", tipo: "Entrada", valor: 195000, camada: "Previsto", natureza: "Liberação financiamento", centroCusto: "Comercial", empresa: "Meta Sun", filial: "Manaus" },
  // a realizar
  { id: "L-030", data: iso(addDays(today, 18)), descricao: "Recebimento parcela CT-0138", tipo: "Entrada", valor: 74500, camada: "A realizar", natureza: "Recebimento de cliente", centroCusto: "Comercial", empresa: "Meta Sun", filial: "Manaus" },
  { id: "L-031", data: iso(addDays(today, 22)), descricao: "Material OB-0228", tipo: "Saída", valor: 86000, camada: "A realizar", natureza: "Material", centroCusto: "Engenharia/Operação", obra: "OB-0228", empresa: "Meta Sun", filial: "Manaus" },
  // orçado futuro
  { id: "L-040", data: iso(addDays(today, 45)), descricao: "Campanha marketing trimestre", tipo: "Saída", valor: 35000, camada: "Orçado futuro", natureza: "Marketing", centroCusto: "Marketing", empresa: "Meta Sun", filial: "Manaus" },
];

const seedRec: DespesaRecorrente[] = [
  { id: "R-001", descricao: "Aluguel sede", valor: 12000, recorrencia: "Mensal", diaVencimento: 5, natureza: "Aluguel", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus", ativa: true },
  { id: "R-002", descricao: "Folha de pagamento", valor: 178000, recorrencia: "Mensal", diaVencimento: 5, natureza: "Folha de pagamento", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus", ativa: true },
  { id: "R-003", descricao: "Pró-labore sócios", valor: 28000, recorrencia: "Mensal", diaVencimento: 10, natureza: "Pró-labore", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus", ativa: true },
  { id: "R-004", descricao: "Energia elétrica", valor: 4200, recorrencia: "Mensal", diaVencimento: 15, natureza: "Energia/Água", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus", ativa: true },
  { id: "R-005", descricao: "Internet + telefonia", valor: 1800, recorrencia: "Mensal", diaVencimento: 12, natureza: "Internet/Telefonia", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus", ativa: true },
  { id: "R-006", descricao: "Software CRM/ERP", valor: 2400, recorrencia: "Mensal", diaVencimento: 20, natureza: "Software/Licenças", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus", ativa: true },
  { id: "R-007", descricao: "Contabilidade", valor: 3500, recorrencia: "Mensal", diaVencimento: 8, natureza: "Contabilidade", centroCusto: "Administrativo", empresa: "Meta Sun", filial: "Manaus", ativa: true },
  { id: "R-008", descricao: "Seguros frota", valor: 1900, recorrencia: "Mensal", diaVencimento: 18, natureza: "Veículos/Seguros", centroCusto: "Frota", empresa: "Meta Sun", filial: "Manaus", ativa: true },
];

// ---------- generic LS hook ----------
function useLS<T>(key: string, seed: T): [T, (next: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(seed);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setVal(JSON.parse(raw));
      else localStorage.setItem(key, JSON.stringify(seed));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = (next: T | ((p: T) => T)) => {
    setVal((prev) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
      return v;
    });
  };
  return [val, update];
}

export const useLancamentos = () => useLS<Lancamento[]>(LS_LANC, seedLanc);
export const useRecorrentes = () => useLS<DespesaRecorrente[]>(LS_REC, seedRec);
export const useCentrosCusto = () => useLS<CentroCusto[]>(LS_CC, seedCentros);
export const useNaturezas = () => useLS<Natureza[]>(LS_NAT, seedNaturezas);

/** Append lançamentos ao LocalStorage (uso fora de componentes React). */
export function appendLancamentos(novos: Lancamento[]) {
  if (typeof window === "undefined" || novos.length === 0) return;
  try {
    const raw = localStorage.getItem(LS_LANC);
    const cur: Lancamento[] = raw ? JSON.parse(raw) : seedLanc;
    localStorage.setItem(LS_LANC, JSON.stringify([...novos, ...cur]));
  } catch {}
}

export const fmtBRLPrecise = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const startOfWeek = (d: Date) => { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; };
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
