// ============================================================================
// Finalização de obras — dupla aprovação (Engenharia + Financeiro/Diretoria).
//
// Regras:
// - A obra só é FINALIZADA automaticamente quando existirem as duas aprovações.
// - A ordem das aprovações não importa.
// - Não existe reprovação. Enquanto faltar aprovação, a obra fica em
//   STANDBY/AGUARDANDO APROVAÇÃO mas continua operacional (não trava).
// - Obras finalizadas só podem ser editadas via "liberação de edição",
//   válida até o fim do dia. Depois disso o sistema trava novamente.
// - Toda alteração em obra finalizada gera histórico automático (audit).
// ============================================================================
import { useSyncExternalStore } from "react";
import { pushAudit } from "@/lib/audit-store";

export type SetorAprovacao = "engenharia" | "financeiro";

export type AprovacaoFinalizacao = {
  obraId: string;
  setor: SetorAprovacao;
  usuario: string;
  data: string; // ISO
};

export type LiberacaoEdicao = {
  obraId: string;
  liberadoPor: string;
  liberadoEm: string;   // ISO
  validoAteISO: string; // ISO end-of-day local
};

type State = {
  aprovacoes: AprovacaoFinalizacao[];
  liberacoes: LiberacaoEdicao[];
};

const KEY = "ms.obras.finalizacao.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: State | null = null;

function read(): State {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = { aprovacoes: [], liberacoes: [] }; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw) as State; return cache!; }
  } catch {}
  cache = { aprovacoes: [], liberacoes: [] };
  return cache;
}

function write(next: State) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT: State = { aprovacoes: [], liberacoes: [] };
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useFinalizacaoState(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------- Aprovações ----------

export function getAprovacoes(obraId: string): { engenharia?: AprovacaoFinalizacao; financeiro?: AprovacaoFinalizacao } {
  const s = read();
  return {
    engenharia: s.aprovacoes.find((a) => a.obraId === obraId && a.setor === "engenharia"),
    financeiro: s.aprovacoes.find((a) => a.obraId === obraId && a.setor === "financeiro"),
  };
}

export function useAprovacoes(obraId: string) {
  useFinalizacaoState();
  return getAprovacoes(obraId);
}

export function temAmbasAprovacoes(obraId: string): boolean {
  const a = getAprovacoes(obraId);
  return !!a.engenharia && !!a.financeiro;
}

export function aguardandoAprovacao(obraId: string): boolean {
  const a = getAprovacoes(obraId);
  const algumaSim = !!a.engenharia || !!a.financeiro;
  const algumaNao = !a.engenharia || !a.financeiro;
  return algumaSim && algumaNao;
}

export function aprovarFinalizacao(obraId: string, setor: SetorAprovacao, usuario: string, contexto?: { cliente?: string }) {
  const s = read();
  // não duplica
  const ja = s.aprovacoes.find((a) => a.obraId === obraId && a.setor === setor);
  if (ja) return ja;
  const novo: AprovacaoFinalizacao = {
    obraId, setor, usuario, data: new Date().toISOString(),
  };
  write({ ...s, aprovacoes: [novo, ...s.aprovacoes] });
  pushAudit({
    entidade: "obra",
    entidadeId: obraId,
    acao: "APROVACAO_FINALIZACAO",
    usuario,
    campo: setor === "engenharia" ? "Aprovação Engenharia" : "Aprovação Financeiro/Diretoria",
    valorNovo: "Aprovado",
    detalhe: contexto?.cliente ? `Obra de ${contexto.cliente}` : undefined,
  });
  return novo;
}

export function revogarAprovacao(obraId: string, setor: SetorAprovacao, usuario: string) {
  const s = read();
  const restante = s.aprovacoes.filter((a) => !(a.obraId === obraId && a.setor === setor));
  if (restante.length === s.aprovacoes.length) return;
  write({ ...s, aprovacoes: restante });
  pushAudit({
    entidade: "obra",
    entidadeId: obraId,
    acao: "REVOGACAO_APROVACAO",
    usuario,
    campo: setor === "engenharia" ? "Aprovação Engenharia" : "Aprovação Financeiro/Diretoria",
    valorAnterior: "Aprovado",
    valorNovo: "Revogado",
  });
}

// ---------- Lista global de obras aguardando (para alertas) ----------

export function useObrasAguardandoIds(): string[] {
  const s = useFinalizacaoState();
  // ids com pelo menos uma aprovação e faltando outra
  const map = new Map<string, { eng: boolean; fin: boolean }>();
  for (const a of s.aprovacoes) {
    const cur = map.get(a.obraId) ?? { eng: false, fin: false };
    if (a.setor === "engenharia") cur.eng = true;
    else cur.fin = true;
    map.set(a.obraId, cur);
  }
  const out: string[] = [];
  map.forEach((v, k) => { if (!(v.eng && v.fin)) out.push(k); });
  return out;
}

// ---------- Liberação de edição (válida até o fim do dia) ----------

function endOfTodayISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function liberarEdicao(obraId: string, usuario: string) {
  const s = read();
  const valido = endOfTodayISO();
  const lib: LiberacaoEdicao = {
    obraId,
    liberadoPor: usuario,
    liberadoEm: new Date().toISOString(),
    validoAteISO: valido,
  };
  const outras = s.liberacoes.filter((l) => l.obraId !== obraId);
  write({ ...s, liberacoes: [lib, ...outras] });
  pushAudit({
    entidade: "obra",
    entidadeId: obraId,
    acao: "LIBERACAO_EDICAO",
    usuario,
    detalhe: `Edição liberada até ${new Date(valido).toLocaleString("pt-BR")}`,
  });
  return lib;
}

export function podeEditarFinalizada(obraId: string): boolean {
  const s = read();
  const lib = s.liberacoes.find((l) => l.obraId === obraId);
  if (!lib) return false;
  return new Date(lib.validoAteISO).getTime() > Date.now();
}

export function usePodeEditarFinalizada(obraId: string): boolean {
  useFinalizacaoState();
  return podeEditarFinalizada(obraId);
}

export function getLiberacao(obraId: string): LiberacaoEdicao | undefined {
  return read().liberacoes.find((l) => l.obraId === obraId);
}

// ---------- Registro automático de alterações em obras finalizadas ----------

export function registrarAlteracaoFinalizada(
  obraId: string,
  usuario: string,
  alteracoes: Array<{ campo: string; antes?: string; depois?: string }>,
  contexto?: { cliente?: string },
) {
  for (const a of alteracoes) {
    pushAudit({
      entidade: "obra",
      entidadeId: obraId,
      acao: "EDICAO_POS_FINALIZACAO",
      usuario,
      campo: a.campo,
      valorAnterior: a.antes,
      valorNovo: a.depois,
      detalhe: contexto?.cliente ? `Obra de ${contexto.cliente}` : undefined,
    });
  }
}
