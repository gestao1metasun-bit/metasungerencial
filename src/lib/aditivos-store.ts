// ============================================================================
// ADITIVOS CONTRATUAIS — store oficial
// Regra: contrato assinado NÃO volta etapa/comercial.
// Qualquer alteração posterior acontece via aditivo (acumulativo ou substitutivo),
// com fluxo: CRIADO → AGUARDANDO_ASSINATURA → ASSINADO →
//            AGUARDANDO_APROVACAO → APROVADO/REPROVADO.
// Aprovação aplica automaticamente as alterações no contrato e nos projetos.
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";
import { pushAudit } from "./audit-store";
import {
  updateContratoAudit,
  updateProjeto,
  removerVinculoFinanciamento,
  type ContratoFull,
  type ProjetoVinculado,
} from "./contratos-store";
import { cancelarPendenciaFin, getPendenciaByContrato } from "./fin-pendencias";

export type AditivoStatus =
  | "CRIADO"
  | "AGUARDANDO_ASSINATURA"
  | "ASSINADO"
  | "AGUARDANDO_APROVACAO"
  | "APROVADO"
  | "REPROVADO"
  | "CANCELADO";

export const ADITIVO_STATUS_LABEL: Record<AditivoStatus, string> = {
  CRIADO: "Criado",
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  ASSINADO: "Assinado / Anexado",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  CANCELADO: "Cancelado",
};

export type AditivoCategoria =
  | "troca_inversor"
  | "troca_modulo"
  | "troca_telhado"
  | "ajuste_tecnico"
  | "alteracao_operacional"
  | "financeiro"
  | "outro";

export const ADITIVO_CATEGORIA_LABEL: Record<AditivoCategoria, string> = {
  troca_inversor: "Troca de inversor",
  troca_modulo: "Troca de potência do módulo",
  troca_telhado: "Troca de telhado",
  ajuste_tecnico: "Ajuste técnico",
  alteracao_operacional: "Alteração operacional",
  financeiro: "Financeiro",
  outro: "Outro",
};

/** Áreas operacionais que ficam travadas enquanto houver aditivo pendente impactando-as. */
export type AreaOperacional =
  | "finalizar_obra"
  | "liberar_estoque"
  | "faturar"
  | "gerar_financeiro"
  | "concluir_etapa_critica"
  | "consolidar";

export type AditivoAlteracoes = {
  modulos?: number;          // delta (+/-)
  inversores?: string;       // texto livre da nova configuração
  potenciaKwp?: number;      // delta (+/-)
  valor?: number;            // delta financeiro (+/-)
  endereco?: string;         // novo endereço
  estruturaTecnica?: string; // descrição técnica
  observacoesTecnicas?: string;
  /** Troca da forma de pagamento. Se sair de "Financiamento" para outra, ao aprovar
   *  o aditivo o vínculo de financiamento é removido, a pendência (se houver) é cancelada
   *  e a Engenharia é liberada automaticamente (Stand-by → Novo projeto). */
  novaFormaPagamento?: "PIX" | "Boleto" | "Cartão" | "Misto" | "Dinheiro" | "Financiamento";
};

export type AditivoProjetoDistribuicao = {
  projetoId: string;
  deltaModulos: number;
  deltaValor: number;
};

export type Aditivo = {
  id: string;                // ADT-<contratoId>-NNN
  contratoId: string;
  numero: number;
  tipo: "acumulativo" | "substitutivo";
  impactoFinanceiro: boolean;
  categoria: AditivoCategoria;
  descricao: string;
  motivo: string;
  status: AditivoStatus;
  alteracoes: AditivoAlteracoes;
  distribuicaoProjetos: AditivoProjetoDistribuicao[];
  anexoAssinadoNome?: string;
  dataCriacao: string;        // ISO
  dataAssinatura?: string;
  dataAprovacao?: string;
  criadoPor: string;
  aprovadoPor?: string;
  reprovadoMotivo?: string;
  reprovadoPor?: string;
  oculto?: boolean;           // true quando substituído por outro aditivo
};

// ------------------------------------------------------------------ store

const KEY = "ms.aditivos.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Aditivo[] | null = null;

function read(): Aditivo[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw) as Aditivo[]; return cache!; }
  } catch {}
  cache = [];
  return cache;
}

function write(next: Aditivo[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT: Aditivo[] = [];
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useAditivos(): Aditivo[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}

// ------------------------------------------------------------------ helpers

export const STATUS_PENDENTES: AditivoStatus[] = [
  "CRIADO",
  "AGUARDANDO_ASSINATURA",
  "ASSINADO",
  "AGUARDANDO_APROVACAO",
];

export function isPendente(a: Aditivo): boolean {
  return STATUS_PENDENTES.includes(a.status) && !a.oculto;
}

export function getAditivosByContrato(contratoId: string): Aditivo[] {
  return read()
    .filter((a) => a.contratoId === contratoId)
    .sort((a, b) => a.numero - b.numero);
}

export function useAditivosByContrato(contratoId: string): Aditivo[] {
  const all = useAditivos();
  return all.filter((a) => a.contratoId === contratoId).sort((a, b) => a.numero - b.numero);
}

export function getAditivoPendente(contratoId: string): Aditivo | null {
  return getAditivosByContrato(contratoId).find(isPendente) ?? null;
}

export function temAditivoPendente(contratoId: string): boolean {
  return !!getAditivoPendente(contratoId);
}

/** Hook reativo de trava — retorna { pendente, podeExecutar(area) }. */
export function useAditivoLock(contratoId: string | undefined) {
  const lista = useAditivos();
  const pendente = contratoId
    ? lista.find((a) => a.contratoId === contratoId && isPendente(a)) ?? null
    : null;
  return {
    pendente,
    podeExecutar(area: AreaOperacional): boolean {
      if (!pendente) return true;
      const areas = areasImpactadas(pendente);
      return !areas.includes(area);
    },
    motivoBloqueio(area: AreaOperacional): string | null {
      if (!pendente) return null;
      const areas = areasImpactadas(pendente);
      if (!areas.includes(area)) return null;
      return `Aditivo ${pendente.id} pendente (${ADITIVO_STATUS_LABEL[pendente.status]}). Conclua o fluxo antes de prosseguir.`;
    },
  };
}

/** Mapeia categoria/alterações do aditivo para áreas operacionais bloqueadas. */
export function areasImpactadas(a: Aditivo): AreaOperacional[] {
  const set = new Set<AreaOperacional>();
  // Toda mudança bloqueia consolidação até aprovar
  set.add("consolidar");
  // Mudanças técnicas impedem finalizar obra e concluir etapa crítica
  if (
    a.categoria === "troca_inversor" ||
    a.categoria === "troca_modulo" ||
    a.categoria === "troca_telhado" ||
    a.categoria === "ajuste_tecnico" ||
    a.alteracoes.modulos !== undefined ||
    a.alteracoes.inversores !== undefined ||
    a.alteracoes.potenciaKwp !== undefined ||
    a.alteracoes.estruturaTecnica
  ) {
    set.add("finalizar_obra");
    set.add("concluir_etapa_critica");
    set.add("liberar_estoque");
  }
  // Impacto financeiro bloqueia faturar / gerar financeiro
  if (a.impactoFinanceiro || a.alteracoes.valor !== undefined) {
    set.add("faturar");
    set.add("gerar_financeiro");
  }
  // Alteração operacional também trava liberação de estoque
  if (a.categoria === "alteracao_operacional") {
    set.add("liberar_estoque");
  }
  return Array.from(set);
}

// ------------------------------------------------------------------ CRUD

function proximoNumero(contratoId: string): number {
  const lista = getAditivosByContrato(contratoId);
  return (lista[lista.length - 1]?.numero ?? 0) + 1;
}

function nextId(contratoId: string, numero: number): string {
  return `ADT-${contratoId.replace(/\//g, "")}-${String(numero).padStart(3, "0")}`;
}

/** Distribui delta de módulos/valor proporcionalmente aos módulos existentes em cada projeto. */
export function calcularDistribuicaoProporcional(
  contrato: ContratoFull,
  deltaModulos: number,
  deltaValor: number,
): AditivoProjetoDistribuicao[] {
  const projetos = contrato.projetos ?? [];
  if (projetos.length === 0) return [];
  const totalModulos = projetos.reduce((s, p) => s + (Number(p.modulos) || 0), 0) || 1;
  // Primeiro passa, depois ajusta o último para somar exatamente o delta (evita perdas de arredondamento).
  let acumMod = 0;
  let acumVal = 0;
  return projetos.map((p, idx) => {
    const peso = (Number(p.modulos) || 0) / totalModulos;
    let dm = Math.round(deltaModulos * peso);
    let dv = Math.round(deltaValor * peso * 100) / 100;
    if (idx === projetos.length - 1) {
      dm = deltaModulos - acumMod;
      dv = Math.round((deltaValor - acumVal) * 100) / 100;
    } else {
      acumMod += dm;
      acumVal += dv;
    }
    return { projetoId: p.id, deltaModulos: dm, deltaValor: dv };
  });
}

export type CriarAditivoInput = {
  contratoId: string;
  tipo: "acumulativo" | "substitutivo";
  impactoFinanceiro: boolean;
  categoria: AditivoCategoria;
  descricao: string;
  motivo: string;
  alteracoes: AditivoAlteracoes;
  distribuicaoProjetos?: AditivoProjetoDistribuicao[]; // se omitido, calcula proporcional
  usuario: string;
};

export function criarAditivo(input: CriarAditivoInput, contrato: ContratoFull): Aditivo {
  const numero = proximoNumero(input.contratoId);
  const id = nextId(input.contratoId, numero);
  const distribuicao = input.distribuicaoProjetos ??
    calcularDistribuicaoProporcional(
      contrato,
      Number(input.alteracoes.modulos) || 0,
      Number(input.alteracoes.valor) || 0,
    );
  const novo: Aditivo = {
    id,
    contratoId: input.contratoId,
    numero,
    tipo: input.tipo,
    impactoFinanceiro: input.impactoFinanceiro,
    categoria: input.categoria,
    descricao: input.descricao,
    motivo: input.motivo,
    status: "CRIADO",
    alteracoes: input.alteracoes,
    distribuicaoProjetos: distribuicao,
    dataCriacao: new Date().toISOString(),
    criadoPor: input.usuario,
  };
  write([novo, ...read()]);
  pushAudit({
    entidade: "contrato",
    entidadeId: input.contratoId,
    acao: "ADITIVO_CRIADO",
    usuario: input.usuario,
    detalhe: `Aditivo ${id} (${input.tipo}, ${ADITIVO_CATEGORIA_LABEL[input.categoria]}) criado. Motivo: ${input.motivo}`,
  });
  return novo;
}

function updateAditivo(id: string, patch: Partial<Aditivo>): Aditivo | null {
  const cur = read();
  const idx = cur.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const next = [...cur];
  next[idx] = { ...cur[idx], ...patch };
  write(next);
  return next[idx];
}

export function enviarParaAssinatura(id: string, usuario: string) {
  const a = updateAditivo(id, { status: "AGUARDANDO_ASSINATURA" });
  if (a) pushAudit({
    entidade: "contrato", entidadeId: a.contratoId,
    acao: "ADITIVO_ASSINATURA", usuario,
    detalhe: `Aditivo ${a.id} enviado para assinatura.`,
  });
}

export function anexarAssinado(id: string, anexoNome: string, usuario: string) {
  const a = updateAditivo(id, {
    status: "ASSINADO",
    anexoAssinadoNome: anexoNome,
    dataAssinatura: new Date().toISOString(),
  });
  if (a) pushAudit({
    entidade: "contrato", entidadeId: a.contratoId,
    acao: "ADITIVO_ASSINADO", usuario,
    detalhe: `Aditivo ${a.id} assinado e anexado (${anexoNome}).`,
  });
}

export function enviarParaAprovacao(id: string, usuario: string) {
  const a = updateAditivo(id, { status: "AGUARDANDO_APROVACAO" });
  if (a) pushAudit({
    entidade: "contrato", entidadeId: a.contratoId,
    acao: "ADITIVO_APROVACAO_PENDENTE", usuario,
    detalhe: `Aditivo ${a.id} enviado para aprovação.`,
  });
}

export function cancelarAditivo(id: string, motivo: string, usuario: string) {
  const a = updateAditivo(id, { status: "CANCELADO", reprovadoMotivo: motivo, reprovadoPor: usuario });
  if (a) pushAudit({
    entidade: "contrato", entidadeId: a.contratoId,
    acao: "ADITIVO_CANCELADO", usuario, motivo,
    detalhe: `Aditivo ${a.id} cancelado.`,
  });
}

export function reprovarAditivo(id: string, motivo: string, usuario: string) {
  const a = updateAditivo(id, {
    status: "REPROVADO",
    reprovadoMotivo: motivo,
    reprovadoPor: usuario,
    dataAprovacao: new Date().toISOString(),
  });
  if (a) pushAudit({
    entidade: "contrato", entidadeId: a.contratoId,
    acao: "ADITIVO_REPROVADO", usuario, motivo,
    detalhe: `Aditivo ${a.id} reprovado. Trava operacional liberada. Alterações descartadas.`,
  });
}

/**
 * APROVA o aditivo e APLICA as alterações no contrato (consolidação automática)
 * + distribui nos projetos conforme distribuicaoProjetos.
 * Se substitutivo, oculta operacionalmente os aditivos anteriores aprovados.
 */
export function aprovarAditivo(
  id: string,
  usuario: string,
  contrato: ContratoFull,
): { ok: true; aditivo: Aditivo } | { ok: false; erro: string } {
  const cur = read();
  const aditivo = cur.find((a) => a.id === id);
  if (!aditivo) return { ok: false, erro: "Aditivo não encontrado." };
  if (aditivo.status !== "AGUARDANDO_APROVACAO") {
    return { ok: false, erro: `Aditivo precisa estar em "${ADITIVO_STATUS_LABEL.AGUARDANDO_APROVACAO}" para aprovação.` };
  }

  // 1) Consolida no contrato
  const patchContrato: Partial<ContratoFull> = {};
  if (aditivo.alteracoes.modulos !== undefined) {
    patchContrato.modulos = (Number(contrato.modulos) || 0) + Number(aditivo.alteracoes.modulos);
  }
  if (aditivo.alteracoes.potenciaKwp !== undefined) {
    patchContrato.kwp = Math.round(((Number(contrato.kwp) || 0) + Number(aditivo.alteracoes.potenciaKwp)) * 100) / 100;
  }
  if (aditivo.alteracoes.valor !== undefined) {
    patchContrato.valor = Math.round(((Number(contrato.valor) || 0) + Number(aditivo.alteracoes.valor)) * 100) / 100;
  }
  if (aditivo.alteracoes.inversores) {
    patchContrato.inv1 = aditivo.alteracoes.inversores;
  }
  if (Object.keys(patchContrato).length > 0) {
    updateContratoAudit(contrato.id, patchContrato, usuario);
  }

  // 1.b) Troca de forma de pagamento (saindo de Financiamento ⇒ libera Engenharia e cancela pendência)
  const novaForma = aditivo.alteracoes.novaFormaPagamento;
  if (novaForma && novaForma !== "Financiamento" && contrato.possuiFinanciamento) {
    removerVinculoFinanciamento(contrato.id, novaForma, usuario);
    const pend = getPendenciaByContrato(contrato.id);
    if (pend && pend.status !== "Cancelado") {
      cancelarPendenciaFin(
        contrato.id,
        `Forma de pagamento alterada para ${novaForma} via aditivo ${aditivo.id}`,
        usuario,
      );
    }
  } else if (novaForma === "Financiamento" && !contrato.possuiFinanciamento) {
    // Caso raro: aditivo passou a exigir financiamento — apenas registra.
    updateContratoAudit(contrato.id, { possuiFinanciamento: true, pagamentoTipo: "Financiamento" }, usuario);
  }


  // 2) Distribui nos projetos
  for (const d of aditivo.distribuicaoProjetos) {
    const proj = (contrato.projetos ?? []).find((p) => p.id === d.projetoId);
    if (!proj) continue;
    const patch: Partial<ProjetoVinculado> = {};
    if (d.deltaModulos !== 0) {
      patch.modulos = (Number(proj.modulos) || 0) + d.deltaModulos;
      const potW = Number(proj.potenciaModuloW) || 0;
      if (potW > 0) patch.kwp = Math.round((patch.modulos * potW / 1000) * 100) / 100;
    }
    if (d.deltaValor !== 0) {
      patch.valor = Math.round(((Number(proj.valor) || 0) + d.deltaValor) * 100) / 100;
    }
    if (Object.keys(patch).length > 0) updateProjeto(contrato.id, proj.id, patch);
  }

  // 3) Substitutivo: oculta anteriores aprovados
  const next = cur.map((a) => {
    if (a.id === id) {
      return {
        ...a,
        status: "APROVADO" as AditivoStatus,
        aprovadoPor: usuario,
        dataAprovacao: new Date().toISOString(),
      };
    }
    if (
      aditivo.tipo === "substitutivo" &&
      a.contratoId === aditivo.contratoId &&
      a.status === "APROVADO" &&
      a.id !== id
    ) {
      return { ...a, oculto: true };
    }
    return a;
  });
  write(next);

  pushAudit({
    entidade: "contrato",
    entidadeId: contrato.id,
    acao: "ADITIVO_APROVADO",
    usuario,
    detalhe: `Aditivo ${aditivo.id} aprovado (${aditivo.tipo}). Alterações aplicadas no contrato e distribuídas em ${aditivo.distribuicaoProjetos.length} projeto(s).${aditivo.tipo === "substitutivo" ? " Aditivos anteriores ocultados operacionalmente." : ""}`,
  });

  return { ok: true, aditivo: next.find((a) => a.id === id)! };
}

/** Total geral de aditivos pendentes no sistema. */
export function contarPendentes(lista: Aditivo[]): number {
  return lista.filter(isPendente).length;
}
