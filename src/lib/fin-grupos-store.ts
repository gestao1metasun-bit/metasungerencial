// Grupos e Subgrupos financeiros — base do plano de contas gerencial.
// Estrutura preparada para futura integração contábil (Alterdata/Domínio).
import { useEffect, useSyncExternalStore } from "react";

export type GrupoFinanceiro = {
  id: string;
  codigo: string;       // 1, 2, 3...
  nome: string;
  tipo: "Receita" | "Custo Direto" | "Custo Indireto" | "Despesa Administrativa" | "Despesa Comercial" | "Imobilizado" | "Financeiro/Patrimonial";
  ativo: boolean;
};

export type SubgrupoFinanceiro = {
  id: string;
  grupoId: string;
  codigo: string;       // 1.1, 1.2...
  nome: string;
  ativo: boolean;
};

const KEY_G = "ms.fin.grupos.v1";
const KEY_S = "ms.fin.subgrupos.v1";

const SEED_G: GrupoFinanceiro[] = [
  { id: "G-01", codigo: "1", nome: "Receitas",                    tipo: "Receita",                  ativo: true },
  { id: "G-02", codigo: "2", nome: "Custos Diretos",              tipo: "Custo Direto",             ativo: true },
  { id: "G-03", codigo: "3", nome: "Custos Indiretos",            tipo: "Custo Indireto",           ativo: true },
  { id: "G-04", codigo: "4", nome: "Despesas Administrativas",    tipo: "Despesa Administrativa",   ativo: true },
  { id: "G-05", codigo: "5", nome: "Despesas Comerciais",         tipo: "Despesa Comercial",        ativo: true },
  { id: "G-06", codigo: "6", nome: "Imobilizado",                 tipo: "Imobilizado",              ativo: true },
  { id: "G-07", codigo: "7", nome: "Financeiro/Patrimonial",      tipo: "Financeiro/Patrimonial",   ativo: true },
];

const SEED_S: SubgrupoFinanceiro[] = [
  { id: "S-0101", grupoId: "G-01", codigo: "1.1", nome: "Vendas de sistemas FV",      ativo: true },
  { id: "S-0102", grupoId: "G-01", codigo: "1.2", nome: "Manutenção / Pós-venda",     ativo: true },
  { id: "S-0103", grupoId: "G-01", codigo: "1.3", nome: "Liberações de financiamento", ativo: true },
  { id: "S-0201", grupoId: "G-02", codigo: "2.1", nome: "Material aplicado em obra",  ativo: true },
  { id: "S-0202", grupoId: "G-02", codigo: "2.2", nome: "Mão de obra de instalação",  ativo: true },
  { id: "S-0203", grupoId: "G-02", codigo: "2.3", nome: "Frete / Logística obra",     ativo: true },
  { id: "S-0204", grupoId: "G-02", codigo: "2.4", nome: "Terceiros (empreitada)",     ativo: true },
  { id: "S-0301", grupoId: "G-03", codigo: "3.1", nome: "Engenharia / Projetos",      ativo: true },
  { id: "S-0302", grupoId: "G-03", codigo: "3.2", nome: "Frota / Combustível",        ativo: true },
  { id: "S-0401", grupoId: "G-04", codigo: "4.1", nome: "Folha administrativa",       ativo: true },
  { id: "S-0402", grupoId: "G-04", codigo: "4.2", nome: "Ocupação (aluguel, energia)", ativo: true },
  { id: "S-0403", grupoId: "G-04", codigo: "4.3", nome: "Software / TI",              ativo: true },
  { id: "S-0404", grupoId: "G-04", codigo: "4.4", nome: "Serviços profissionais",     ativo: true },
  { id: "S-0501", grupoId: "G-05", codigo: "5.1", nome: "Marketing",                  ativo: true },
  { id: "S-0502", grupoId: "G-05", codigo: "5.2", nome: "Comissões",                  ativo: true },
  { id: "S-0701", grupoId: "G-07", codigo: "7.1", nome: "Impostos",                   ativo: true },
  { id: "S-0702", grupoId: "G-07", codigo: "7.2", nome: "Despesas bancárias",         ativo: true },
  { id: "S-0703", grupoId: "G-07", codigo: "7.3", nome: "Financiamentos (parcelas)",  ativo: true },
];

type L = () => void;
const listenersG = new Set<L>();
const listenersS = new Set<L>();
let cacheG: GrupoFinanceiro[] | null = null;
let cacheS: SubgrupoFinanceiro[] | null = null;

function readG(): GrupoFinanceiro[] {
  if (cacheG) return cacheG;
  if (typeof window === "undefined") { cacheG = SEED_G; return cacheG; }
  try {
    const raw = localStorage.getItem(KEY_G);
    cacheG = raw ? JSON.parse(raw) : SEED_G;
  } catch { cacheG = SEED_G; }
  if (!localStorage.getItem(KEY_G)) localStorage.setItem(KEY_G, JSON.stringify(cacheG));
  return cacheG!;
}
function writeG(next: GrupoFinanceiro[]) {
  cacheG = next;
  try { localStorage.setItem(KEY_G, JSON.stringify(next)); } catch {}
  listenersG.forEach((l) => l());
}
function readS(): SubgrupoFinanceiro[] {
  if (cacheS) return cacheS;
  if (typeof window === "undefined") { cacheS = SEED_S; return cacheS; }
  try {
    const raw = localStorage.getItem(KEY_S);
    cacheS = raw ? JSON.parse(raw) : SEED_S;
  } catch { cacheS = SEED_S; }
  if (!localStorage.getItem(KEY_S)) localStorage.setItem(KEY_S, JSON.stringify(cacheS));
  return cacheS!;
}
function writeS(next: SubgrupoFinanceiro[]) {
  cacheS = next;
  try { localStorage.setItem(KEY_S, JSON.stringify(next)); } catch {}
  listenersS.forEach((l) => l());
}

export function useGrupos(): GrupoFinanceiro[] {
  const list = useSyncExternalStore((l) => { listenersG.add(l); return () => { listenersG.delete(l); }; }, readG, () => SEED_G);
  useEffect(() => { readG(); }, []);
  return list;
}
export function useSubgrupos(): SubgrupoFinanceiro[] {
  const list = useSyncExternalStore((l) => { listenersS.add(l); return () => { listenersS.delete(l); }; }, readS, () => SEED_S);
  useEffect(() => { readS(); }, []);
  return list;
}

export function upsertGrupo(g: GrupoFinanceiro) {
  const cur = readG();
  const idx = cur.findIndex((x) => x.id === g.id);
  if (idx >= 0) { const arr = [...cur]; arr[idx] = g; writeG(arr); }
  else writeG([...cur, g]);
}
export function removeGrupo(id: string) {
  writeG(readG().filter((x) => x.id !== id));
  writeS(readS().filter((x) => x.grupoId !== id));
}
export function upsertSubgrupo(s: SubgrupoFinanceiro) {
  const cur = readS();
  const idx = cur.findIndex((x) => x.id === s.id);
  if (idx >= 0) { const arr = [...cur]; arr[idx] = s; writeS(arr); }
  else writeS([...cur, s]);
}
export function removeSubgrupo(id: string) { writeS(readS().filter((x) => x.id !== id)); }
export function newGrupoId() { return `G-${String(readG().length + 1).padStart(2, "0")}`; }
export function newSubgrupoId() { return `S-${String(readS().length + 1).padStart(4, "0")}`; }
