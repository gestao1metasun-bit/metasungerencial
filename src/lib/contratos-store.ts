// Store de contratos — cliente, dados técnicos, projetos vinculados e auditoria.
// Persiste em localStorage e fornece hooks reativos.
import { useEffect, useSyncExternalStore } from "react";
import { contratos as contratosSeed } from "./mock-data";

export type ClienteFull = {
  nome: string;
  doc: string;          // CPF ou CNPJ
  telefone: string;
  telefone2?: string;   // telefone alternativo
  email: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  complemento: string;
  cidade: string;
  uf: string;
};

export type ProjetoVinculado = {
  id: string;            // ex. 088/2026-01
  contratoId: string;    // ex. 088/2026
  tipo: string;          // ex. "Projeto 1", "Residencial telhado", etc.
  endereco: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  cidade: string;
  uf: string;
  modulos: number;
  potenciaModuloW: number; // W por módulo
  kwp: number;
  inversor: string;
  inv2?: string;
  inv3?: string;
  equipe: string;
  status: string;        // "Em projeto/aprovação" | "Aguardando instalação" | ...
  inicio: string;        // YYYY-MM-DD
  previsto: string;
  obs: string;
  cronograma: string;    // texto livre opcional
  enviadoEngenharia?: boolean; // true quando liberado para engenharia
  orcado?: number;             // custo orçado da obra (R$)
  valor?: number;              // valor financeiro deste projeto (parte do total do contrato)
  parcelasPagto?: ParcelaPagto[]; // parcelas/financeiro próprias do projeto
  financeiroGerado?: boolean;  // true quando lançamentos foram gerados no Financeiro
};

export type AuditEntry = {
  id: string;
  data: string;          // ISO
  usuario: string;
  campo: string;
  de: string;
  para: string;
};

export type FormaPagamento = "Pix" | "Boleto" | "Cartão" | "Transferência" | "Dinheiro" | "Financiamento";

export type ParcelaPagto = {
  id: string;
  valor: number;
  dataEmissao: string;       // YYYY-MM-DD
  dataVencimento: string;    // YYYY-MM-DD
  competencia: string;       // YYYY-MM (mês de competência)
  formaPagamento: FormaPagamento;
  descricao?: string;
};

export type ContratoFull = {
  id: string;            // ex. 088/2026
  cliente: string;
  vendedor: string;
  valor: number;
  kwp: number;
  status: string;
  data: string;
  pagamento: string;
  banco?: string;
  modulos?: number;
  obs?: string;
  potencia?: number;
  inv1?: string; inv2?: string; inv3?: string;
  inv4?: string; inv5?: string; inv6?: string;
  parametro?: string;
  dataCadastro?: string;
  dataAssinatura?: string;
  comissaoPct?: number;
  comissaoValor?: number;
  // Novo: dados completos do cliente
  clienteFull?: ClienteFull;
  // Novo: projetos vinculados (desdobramento)
  projetos?: ProjetoVinculado[];
  // Novo: auditoria de edições
  auditoria?: AuditEntry[];
  // Novo: parcelas de pagamento detalhadas
  parcelasPagto?: ParcelaPagto[];
};

const KEY = "ms.contratos.v2";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: ContratoFull[] | null = null;

function seedAll(): ContratoFull[] {
  return contratosSeed.map((c) => ({
    ...c,
    banco: "BASA",
    modulos: Math.round(c.kwp * 2),
    obs: "",
    projetos: [],
    auditoria: [],
  }));
}

function read(): ContratoFull[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = seedAll(); return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
  } catch {}
  cache = seedAll();
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  return cache;
}

function write(next: ContratoFull[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
function getServerSnapshot() { return seedAll(); }

export function useContratos(): ContratoFull[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // hidrata após mount caso server snapshot tenha sido usado
  useEffect(() => { read(); }, []);
  return list;
}

export function setContratos(next: ContratoFull[]) { write(next); }

export function upsertContrato(novo: ContratoFull) {
  const cur = read();
  const idx = cur.findIndex((c) => c.id === novo.id);
  if (idx >= 0) {
    const merged = [...cur]; merged[idx] = novo; write(merged);
  } else { write([novo, ...cur]); }
}

export function updateContratoAudit(
  id: string,
  patch: Partial<ContratoFull>,
  usuario = "Operador",
) {
  const cur = read();
  const idx = cur.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const atual = cur[idx];
  const audit: AuditEntry[] = [...(atual.auditoria ?? [])];
  const fields: (keyof ContratoFull)[] = Object.keys(patch) as any;
  for (const f of fields) {
    const before = (atual as any)[f];
    const after = (patch as any)[f];
    const beforeStr = typeof before === "object" ? JSON.stringify(before ?? "") : String(before ?? "");
    const afterStr = typeof after === "object" ? JSON.stringify(after ?? "") : String(after ?? "");
    if (beforeStr !== afterStr) {
      audit.push({
        id: `A-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        data: new Date().toISOString(),
        usuario,
        campo: String(f),
        de: beforeStr.slice(0, 200),
        para: afterStr.slice(0, 200),
      });
    }
  }
  const next = [...cur];
  next[idx] = { ...atual, ...patch, auditoria: audit };
  write(next);
}

export function nextProjetoId(contratoId: string): string {
  const c = read().find((x) => x.id === contratoId);
  const n = (c?.projetos?.length ?? 0) + 1;
  return `${contratoId}-${String(n).padStart(2, "0")}`;
}

export function addProjeto(contratoId: string, projeto: Omit<ProjetoVinculado, "id" | "contratoId">) {
  const cur = read();
  const idx = cur.findIndex((c) => c.id === contratoId);
  if (idx < 0) return;
  const id = nextProjetoId(contratoId);
  const novo: ProjetoVinculado = { ...projeto, id, contratoId };
  const next = [...cur];
  const projetos = [...(next[idx].projetos ?? []), novo];
  const audit: AuditEntry = {
    id: `A-${Date.now()}`, data: new Date().toISOString(),
    usuario: "Operador", campo: "projetos", de: "", para: `+${id}`,
  };
  next[idx] = { ...next[idx], projetos, auditoria: [...(next[idx].auditoria ?? []), audit] };
  write(next);
}

export function updateProjeto(contratoId: string, projetoId: string, patch: Partial<ProjetoVinculado>) {
  const cur = read();
  const idx = cur.findIndex((c) => c.id === contratoId);
  if (idx < 0) return;
  const projetos = (cur[idx].projetos ?? []).map((p) => p.id === projetoId ? { ...p, ...patch } : p);
  const next = [...cur];
  next[idx] = { ...next[idx], projetos };
  write(next);
}

export function removeProjeto(contratoId: string, projetoId: string) {
  const cur = read();
  const idx = cur.findIndex((c) => c.id === contratoId);
  if (idx < 0) return;
  const projetos = (cur[idx].projetos ?? []).filter((p) => p.id !== projetoId);
  const next = [...cur];
  next[idx] = { ...next[idx], projetos };
  write(next);
}

/** Lista plana de todos os projetos vinculados a contratos (para Engenharia). */
export function getAllProjetos(): ProjetoVinculado[] {
  return read().flatMap((c) => c.projetos ?? []);
}

/** ViaCEP lookup — retorna parcial ou null se falhar. */
export async function buscarCEP(cep: string): Promise<Partial<ClienteFull> | null> {
  const limpo = cep.replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (!r.ok) return null;
    const d = await r.json();
    if (d.erro) return null;
    return {
      cep: limpo, rua: d.logradouro || "", bairro: d.bairro || "",
      cidade: d.localidade || "", uf: d.uf || "", complemento: d.complemento || "",
    };
  } catch { return null; }
}

/* ============================================================
 * Validação de completude do contrato
 * ============================================================ */
export type ContratoValidation = { ok: boolean; missing: string[] };

const onlyDigits = (v: string) => (v ?? "").replace(/\D/g, "");

export function validateContratoCompleto(c: ContratoFull): ContratoValidation {
  const missing: string[] = [];
  const cli = c.clienteFull;
  if (!c.cliente?.trim() && !cli?.nome?.trim()) missing.push("Nome do cliente");
  if (!cli) {
    missing.push("Dados do cliente (CPF/CNPJ, telefone, e-mail, endereço)");
  } else {
    const docDig = onlyDigits(cli.doc);
    if (!(docDig.length === 11 || docDig.length === 14)) missing.push("CPF (11) ou CNPJ (14)");
    if (onlyDigits(cli.telefone).length !== 11) missing.push("Telefone (DDD + 9)");
    if (!cli.email?.trim() || !/^.+@.+\..+$/.test(cli.email)) missing.push("E-mail");
    if (onlyDigits(cli.cep).length !== 8) missing.push("CEP");
    if (!cli.rua?.trim()) missing.push("Rua");
    if (!cli.numero?.trim()) missing.push("Número");
    if (!cli.bairro?.trim()) missing.push("Bairro");
    if (!cli.cidade?.trim()) missing.push("Cidade");
    if (!cli.uf?.trim()) missing.push("UF");
  }
  if (!c.vendedor?.trim()) missing.push("Vendedor");
  if (!(Number(c.valor) > 0)) missing.push("Valor total");
  if (!(Number(c.potencia) > 0)) missing.push("Potência/módulo");
  if (!(Number(c.modulos) > 0)) missing.push("Quantidade de módulos");
  if (!c.inv1?.trim()) missing.push("Inversor 1");
  if (!c.pagamento?.trim()) missing.push("Forma de pagamento");
  if (c.pagamento === "Financiamento" && !c.banco?.trim()) missing.push("Banco (financiamento)");
  return { ok: missing.length === 0, missing };
}

/** Solicitação formal de alteração após aprovação. */
export function solicitarAlteracaoContrato(
  id: string,
  motivo: string,
  usuario: string,
  patch: Partial<ContratoFull>,
) {
  const cur = read();
  const idx = cur.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const atual = cur[idx];
  const audit: AuditEntry[] = [...(atual.auditoria ?? [])];
  audit.push({
    id: `A-${Date.now()}-mot`, data: new Date().toISOString(),
    usuario, campo: "solicitação de alteração",
    de: atual.status ?? "", para: `motivo: ${motivo}`,
  });
  const fields = Object.keys(patch) as (keyof ContratoFull)[];
  for (const f of fields) {
    const before = (atual as any)[f];
    const after = (patch as any)[f];
    const beforeStr = typeof before === "object" ? JSON.stringify(before ?? "") : String(before ?? "");
    const afterStr = typeof after === "object" ? JSON.stringify(after ?? "") : String(after ?? "");
    if (beforeStr !== afterStr) {
      audit.push({
        id: `A-${Date.now()}-${String(f)}`, data: new Date().toISOString(),
        usuario, campo: String(f), de: beforeStr.slice(0, 200), para: afterStr.slice(0, 200),
      });
    }
  }
  const next = [...cur];
  next[idx] = { ...atual, ...patch, auditoria: audit };
  write(next);
}
