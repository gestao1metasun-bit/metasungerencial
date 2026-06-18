/**
 * D18.12 — Classificador oficial da etapa do contrato (Supabase).
 *
 * Normaliza o status textual em quatro grupos da esteira oficial:
 *
 *  - "minuta"    → contrato pendente / minuta / rascunho — editável
 *  - "gerado"    → contrato redigido aguardando assinatura
 *  - "assinado"  → contrato assinado/ativo, libera financeiro+engenharia
 *  - "cancelado" → contrato anulado
 */
export type EtapaContrato = "minuta" | "gerado" | "assinado" | "cancelado";

const MINUTA = new Set([
  "MINUTA", "PENDENTE_REVISAO", "PENDENTE_APROVACAO",
  "PENDENTE", "RASCUNHO",
]);
const GERADO = new Set([
  "GERADO", "AGUARDANDO_ASSINATURA", "EM_ASSINATURA",
]);
const ASSINADO = new Set([
  "ASSINADO", "ATIVO", "ATIVA", "VIGENTE",
]);

export function classificarEtapaContrato(
  status: string | null | undefined,
  cancelado?: boolean | null,
): EtapaContrato {
  const s = (status ?? "").toUpperCase().trim();
  if (cancelado || s === "CANCELADO") return "cancelado";
  if (MINUTA.has(s)) return "minuta";
  if (GERADO.has(s)) return "gerado";
  if (ASSINADO.has(s)) return "assinado";
  return "minuta";
}

export function rotuloEtapaContrato(etapa: EtapaContrato): string {
  if (etapa === "minuta") return "Contrato Pendente";
  if (etapa === "gerado") return "Contrato Gerado — Aguardando Assinatura";
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
    label: "CONTRATO PENDENTE",
    variant: "outline",
    className: "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40",
  };
  if (etapa === "gerado") return {
    label: "AGUARDANDO ASSINATURA",
    variant: "outline",
    className: "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/40",
  };
  return { label: "ASSINADO", variant: "default" };
}
