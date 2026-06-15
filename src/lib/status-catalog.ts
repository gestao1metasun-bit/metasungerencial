// ============================================================================
// Catálogo único de status do ERP Meta Sun.
// Toda tela / filtro / card / relatório / trava deve consumir daqui.
// Não usar strings soltas em outras partes do sistema.
// ============================================================================

/* =================== LEAD =================== */
export const LEAD_STATUS = {
  LEAD_CADASTRADO: "LEAD_CADASTRADO",
  EM_ATENDIMENTO: "EM_ATENDIMENTO",
  PROPOSTA_SOLICITADA: "PROPOSTA_SOLICITADA",
  CONVERTIDO_EM_CONTRATO: "CONVERTIDO_EM_CONTRATO",
  PERDIDO: "PERDIDO",
  CANCELADO: "CANCELADO",
} as const;
export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  LEAD_CADASTRADO: "LEAD CADASTRADO",
  EM_ATENDIMENTO: "EM ATENDIMENTO",
  PROPOSTA_SOLICITADA: "PROPOSTA SOLICITADA",
  CONVERTIDO_EM_CONTRATO: "CONVERTIDO EM CONTRATO",
  PERDIDO: "PERDIDO",
  CANCELADO: "CANCELADO",
};

/** Motivos canônicos para cancelamento de Lead (C-ENT.2.b). */
export const LEAD_CANCEL_MOTIVOS = [
  "Sem retorno",
  "Cliente desistiu",
  "Duplicado",
  "Sem perfil",
  "Outro",
] as const;
export type LeadCancelMotivo = (typeof LEAD_CANCEL_MOTIVOS)[number];

/* =================== ORIGEM DO LEAD =================== */
export const ORIGEM_LEAD = {
  WHATSAPP: "WHATSAPP",
  SITE: "SITE",
  INDICACAO: "INDICACAO",
  TRAFEGO_PAGO: "TRAFEGO_PAGO",
  PORTA_A_PORTA: "PORTA_A_PORTA",
  INSTAGRAM: "INSTAGRAM",
  LIGACAO: "LIGACAO",
  FEIRAO: "FEIRAO",
  OUTROS: "OUTROS",
} as const;
export type OrigemLead = (typeof ORIGEM_LEAD)[keyof typeof ORIGEM_LEAD];

export const ORIGEM_LEAD_LABEL: Record<OrigemLead, string> = {
  WHATSAPP: "WhatsApp",
  SITE: "Site",
  INDICACAO: "Indicação",
  TRAFEGO_PAGO: "Tráfego pago",
  PORTA_A_PORTA: "Porta a porta",
  INSTAGRAM: "Instagram",
  LIGACAO: "Ligação",
  FEIRAO: "Feirão",
  OUTROS: "Outros",
};

export const ORIGEM_LEAD_OPTIONS = (Object.keys(ORIGEM_LEAD_LABEL) as OrigemLead[]).map((k) => ({
  value: k,
  label: ORIGEM_LEAD_LABEL[k],
}));

/* =================== PROPOSTA =================== */
export const PROPOSTA_STATUS = {
  AGUARDANDO_GERACAO: "AGUARDANDO_GERACAO",
  EM_ELABORACAO: "EM_ELABORACAO",
  PROPOSTA_GERADA: "PROPOSTA_GERADA",
  ENVIADA_AO_CONSULTOR: "ENVIADA_AO_CONSULTOR",
  APRESENTADA_AO_CLIENTE: "APRESENTADA_AO_CLIENTE",
  EM_NEGOCIACAO: "EM_NEGOCIACAO",
  APROVADA: "APROVADA",
  NAO_APROVADA: "NAO_APROVADA",
  OBSOLETA: "OBSOLETA",
  CANCELADA: "CANCELADA",
  CONVERTIDA_EM_CONTRATO: "CONVERTIDA_EM_CONTRATO",
} as const;
export type PropostaStatus = (typeof PROPOSTA_STATUS)[keyof typeof PROPOSTA_STATUS];

export const PROPOSTA_STATUS_LABEL: Record<PropostaStatus, string> = {
  AGUARDANDO_GERACAO: "AGUARDANDO GERAÇÃO",
  EM_ELABORACAO: "EM ELABORAÇÃO",
  PROPOSTA_GERADA: "PROPOSTA GERADA",
  ENVIADA_AO_CONSULTOR: "ENVIADA AO CONSULTOR",
  APRESENTADA_AO_CLIENTE: "APRESENTADA AO CLIENTE",
  EM_NEGOCIACAO: "EM NEGOCIAÇÃO",
  APROVADA: "APROVADA",
  NAO_APROVADA: "NÃO APROVADA",
  OBSOLETA: "OBSOLETA",
  CANCELADA: "CANCELADA",
  CONVERTIDA_EM_CONTRATO: "CONVERTIDA EM CONTRATO",
};

/* =================== CONTRATO =================== */
export const CONTRATO_STATUS = {
  CONTRATO_GERADO: "CONTRATO_GERADO",
  AGUARDANDO_ASSINATURA: "AGUARDANDO_ASSINATURA",
  CONTRATO_ASSINADO: "CONTRATO_ASSINADO",
  ENVIADO_PARA_ENGENHARIA: "ENVIADO_PARA_ENGENHARIA",
  EM_ANDAMENTO_OPERACIONAL: "EM_ANDAMENTO_OPERACIONAL",
  CANCELADO: "CANCELADO",
  FINALIZADO: "FINALIZADO",
} as const;
export type ContratoStatus = (typeof CONTRATO_STATUS)[keyof typeof CONTRATO_STATUS];

export const CONTRATO_STATUS_LABEL: Record<ContratoStatus, string> = {
  CONTRATO_GERADO: "CONTRATO GERADO",
  AGUARDANDO_ASSINATURA: "AGUARDANDO ASSINATURA",
  CONTRATO_ASSINADO: "CONTRATO ASSINADO",
  ENVIADO_PARA_ENGENHARIA: "ENVIADO PARA ENGENHARIA",
  EM_ANDAMENTO_OPERACIONAL: "EM ANDAMENTO OPERACIONAL",
  CANCELADO: "CANCELADO",
  FINALIZADO: "FINALIZADO",
};

/* =================== Helpers =================== */

/** Tom visual para um status (compatível com Tailwind tokens do app). */
export function statusTone(
  status: LeadStatus | PropostaStatus | ContratoStatus | string,
): "neutral" | "info" | "warning" | "success" | "destructive" | "primary" {
  switch (status) {
    // Lead
    case LEAD_STATUS.LEAD_CADASTRADO:
      return "info";
    case LEAD_STATUS.EM_ATENDIMENTO:
      return "primary";
    case LEAD_STATUS.PROPOSTA_SOLICITADA:
      return "warning";
    case LEAD_STATUS.CONVERTIDO_EM_CONTRATO:
      return "success";
    case LEAD_STATUS.PERDIDO:
      return "destructive";

    // Proposta
    case PROPOSTA_STATUS.AGUARDANDO_GERACAO:
    case PROPOSTA_STATUS.EM_ELABORACAO:
      return "warning";
    case PROPOSTA_STATUS.PROPOSTA_GERADA:
    case PROPOSTA_STATUS.ENVIADA_AO_CONSULTOR:
    case PROPOSTA_STATUS.APRESENTADA_AO_CLIENTE:
      return "info";
    case PROPOSTA_STATUS.EM_NEGOCIACAO:
      return "primary";
    case PROPOSTA_STATUS.APROVADA:
    case PROPOSTA_STATUS.CONVERTIDA_EM_CONTRATO:
      return "success";
    case PROPOSTA_STATUS.NAO_APROVADA:
    case PROPOSTA_STATUS.CANCELADA:
      return "destructive";
    case PROPOSTA_STATUS.OBSOLETA:
      return "neutral";

    // Contrato
    case CONTRATO_STATUS.CONTRATO_GERADO:
      return "info";
    case CONTRATO_STATUS.AGUARDANDO_ASSINATURA:
      return "warning";
    case CONTRATO_STATUS.CONTRATO_ASSINADO:
      return "success";
    case CONTRATO_STATUS.ENVIADO_PARA_ENGENHARIA:
    case CONTRATO_STATUS.EM_ANDAMENTO_OPERACIONAL:
      return "primary";
    case CONTRATO_STATUS.CANCELADO:
      return "destructive";
    case CONTRATO_STATUS.FINALIZADO:
      return "neutral";

    default:
      return "neutral";
  }
}

const TONE_CLASS: Record<ReturnType<typeof statusTone>, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/15 text-info border-info/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  success: "bg-success/15 text-success border-success/30",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
  primary: "bg-primary/15 text-primary border-primary/30",
};

export function statusClass(status: string) {
  return TONE_CLASS[statusTone(status as LeadStatus)];
}

/** Label legível para qualquer status do sistema. */
export function statusLabel(status: string): string {
  return (
    (LEAD_STATUS_LABEL as Record<string, string>)[status] ??
    (PROPOSTA_STATUS_LABEL as Record<string, string>)[status] ??
    (CONTRATO_STATUS_LABEL as Record<string, string>)[status] ??
    status
  );
}

export const LEAD_STATUS_OPTIONS = (Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((k) => ({
  value: k,
  label: LEAD_STATUS_LABEL[k],
}));
export const PROPOSTA_STATUS_OPTIONS = (Object.keys(PROPOSTA_STATUS_LABEL) as PropostaStatus[]).map(
  (k) => ({ value: k, label: PROPOSTA_STATUS_LABEL[k] }),
);
export const CONTRATO_STATUS_OPTIONS = (Object.keys(CONTRATO_STATUS_LABEL) as ContratoStatus[]).map(
  (k) => ({ value: k, label: CONTRATO_STATUS_LABEL[k] }),
);
