/**
 * D18.15 — Classificador oficial da etapa do contrato (Supabase).
 *
 * Normaliza o status textual em cinco grupos da esteira oficial:
 *
 *  - "minuta"      → pendente de redação / minuta / rascunho — editável
 *  - "gerado"      → PDF gerado, ainda não enviado para assinatura
 *  - "aguardando"  → enviado / aguardando assinatura
 *  - "assinado"    → contrato assinado/ativo, libera financeiro+engenharia
 *  - "cancelado"   → contrato anulado
 */
export type EtapaContrato =
  | "minuta"
  | "gerado"
  | "aguardando"
  | "assinado"
  | "cancelado";

const MINUTA = new Set([
  "MINUTA", "PENDENTE_REVISAO", "PENDENTE_APROVACAO",
  "PENDENTE", "PENDENTE_REDACAO", "RASCUNHO",
]);
const GERADO = new Set(["GERADO"]);
const AGUARDANDO = new Set(["AGUARDANDO_ASSINATURA", "EM_ASSINATURA", "ENVIADO_ASSINATURA"]);
const ASSINADO = new Set(["ASSINADO", "ATIVO", "ATIVA", "VIGENTE"]);

export function classificarEtapaContrato(
  status: string | null | undefined,
  cancelado?: boolean | null,
): EtapaContrato {
  const s = (status ?? "").toUpperCase().trim();
  if (cancelado || s === "CANCELADO") return "cancelado";
  if (MINUTA.has(s)) return "minuta";
  if (GERADO.has(s)) return "gerado";
  if (AGUARDANDO.has(s)) return "aguardando";
  if (ASSINADO.has(s)) return "assinado";
  return "minuta";
}

export function rotuloEtapaContrato(etapa: EtapaContrato): string {
  if (etapa === "minuta") return "Contrato Pendente de Redação";
  if (etapa === "gerado") return "Contrato Gerado";
  if (etapa === "aguardando") return "Aguardando Assinatura";
  if (etapa === "assinado") return "Contrato Assinado";
  return "Cancelado";
}

export function badgeEtapaContrato(etapa: EtapaContrato): {
  label: string;
  className?: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
} {
  if (etapa === "cancelado") return { label: "CANCELADO", variant: "destructive" };
  if (etapa === "minuta") return {
    label: "PENDENTE REDAÇÃO",
    variant: "outline",
    className: "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40",
  };
  if (etapa === "gerado") return {
    label: "GERADO",
    variant: "outline",
    className: "border-indigo-500 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40",
  };
  if (etapa === "aguardando") return {
    label: "AGUARDANDO ASSINATURA",
    variant: "outline",
    className: "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/40",
  };
  return { label: "ASSINADO", variant: "default" };
}
