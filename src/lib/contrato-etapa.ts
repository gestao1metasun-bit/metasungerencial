/**
 * D18.8 — Classificador oficial da etapa do contrato (Supabase).
 *
 * Normaliza o status textual (que historicamente apareceu em variações tipo
 * "MINUTA", "Pendente", "Rascunho", "Ativo", "Cancelado") em três grupos:
 *
 *  - "minuta"   → contrato pendente / minuta / rascunho — editável + aprovável
 *  - "ativo"    → contrato definitivo, em produção
 *  - "cancelado" → contrato anulado
 *
 * Use esta função em listas, badges e gates de UI para evitar `if` solto
 * por todo lado.
 */
export type EtapaContrato = "minuta" | "ativo" | "cancelado";

const MINUTA = new Set([
  "MINUTA", "PENDENTE_REVISAO", "PENDENTE_APROVACAO",
  "PENDENTE", "RASCUNHO",
]);

export function classificarEtapaContrato(
  status: string | null | undefined,
  cancelado?: boolean | null,
): EtapaContrato {
  const s = (status ?? "").toUpperCase().trim();
  if (cancelado || s === "CANCELADO") return "cancelado";
  if (MINUTA.has(s)) return "minuta";
  return "ativo";
}

export function rotuloEtapaContrato(etapa: EtapaContrato): string {
  if (etapa === "minuta") return "Contrato Pendente";
  if (etapa === "cancelado") return "Cancelado";
  return "Ativo";
}
