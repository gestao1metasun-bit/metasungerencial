/**
 * State machine canônica de `projetos_contrato`.
 * Espelha a regra real do banco (RPCs aprovar_projeto / cancelar_projeto /
 * enviar_projeto_para_engenharia + trigger pc_protege_aprovado).
 *
 * Frontend NÃO duplica regra. Esta constante existe apenas para:
 *  - rotular status na UI;
 *  - decidir quais botões ficam habilitados;
 *  - colorir badges.
 *
 * Fonte da verdade continua sendo o Postgres.
 */
export type ProjetoContratoStatus =
  | "RASCUNHO"
  | "PENDENTE_APROVACAO"
  | "APROVADO"
  | "ENVIADO_ENGENHARIA"
  | "EM_EXECUCAO"
  | "FINALIZADO"
  | "CANCELADO";

export const PROJETO_STATUS_LABEL: Record<ProjetoContratoStatus, string> = {
  RASCUNHO: "Rascunho",
  PENDENTE_APROVACAO: "Pendente aprovação",
  APROVADO: "Aprovado",
  ENVIADO_ENGENHARIA: "Enviado p/ Engenharia",
  EM_EXECUCAO: "Em execução",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

/** Classes Tailwind (semantic tokens) para badges. */
export const PROJETO_STATUS_BADGE: Record<ProjetoContratoStatus, string> = {
  RASCUNHO: "bg-muted text-muted-foreground border-border",
  PENDENTE_APROVACAO: "bg-warning/15 text-warning border-warning/30",
  APROVADO: "bg-success/15 text-success border-success/30",
  ENVIADO_ENGENHARIA: "bg-info/15 text-info border-info/30",
  EM_EXECUCAO: "bg-primary/15 text-primary border-primary/30",
  FINALIZADO: "bg-success/25 text-success border-success/40",
  CANCELADO: "bg-destructive/15 text-destructive border-destructive/30",
};

/** Estados em que `pc_protege_aprovado` bloqueia edição de campos comerciais/técnicos. */
export const PROJETO_STATUS_BLOQUEIA_EDICAO: ProjetoContratoStatus[] = [
  "APROVADO",
  "ENVIADO_ENGENHARIA",
  "EM_EXECUCAO",
  "FINALIZADO",
];

export function isProjetoEditavel(status: ProjetoContratoStatus): boolean {
  return !PROJETO_STATUS_BLOQUEIA_EDICAO.includes(status) && status !== "CANCELADO";
}

export function podeAprovar(status: ProjetoContratoStatus): boolean {
  return status === "RASCUNHO" || status === "PENDENTE_APROVACAO";
}

export function podeCancelar(status: ProjetoContratoStatus): boolean {
  return status !== "CANCELADO" && status !== "FINALIZADO";
}

export function podeEnviarEngenharia(status: ProjetoContratoStatus): boolean {
  return status === "APROVADO";
}

/** Transições válidas (apenas referência declarativa). */
export const TRANSICOES_VALIDAS: Record<ProjetoContratoStatus, ProjetoContratoStatus[]> = {
  RASCUNHO: ["PENDENTE_APROVACAO", "APROVADO", "CANCELADO"],
  PENDENTE_APROVACAO: ["APROVADO", "CANCELADO"],
  APROVADO: ["ENVIADO_ENGENHARIA", "CANCELADO"],
  ENVIADO_ENGENHARIA: ["EM_EXECUCAO", "CANCELADO"],
  EM_EXECUCAO: ["FINALIZADO", "CANCELADO"],
  FINALIZADO: [],
  CANCELADO: [],
};
