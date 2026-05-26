/**
 * D7.7 — Tradução de erros do Postgres para mensagens amigáveis.
 * Mapeia violações de UNIQUE (23505) das restrições antiduplicidade
 * para mensagens claras ao usuário operacional.
 */

const UNIQUE_INDEX_MESSAGES: Record<string, string> = {
  uq_clientes_doc_norm: "Cliente já cadastrado com este CPF/CNPJ.",
  uq_produtos_codigo: "Produto já existe com este código/SKU.",
  uq_contratos_codigo: "Contrato já existe com este número.",
  uq_titulos_origem_ativa:
    "Título financeiro já gerado para esta origem. Cancele o título existente antes de gerar outro.",
};

type AnyError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
} | null | undefined;

/**
 * Retorna mensagem amigável para erros conhecidos.
 * Quando não reconhece, devolve `null` (use a mensagem original).
 */
export function friendlyDbError(err: AnyError): string | null {
  if (!err) return null;
  const msg = (err.message || "") + " " + (err.details || "");

  // Unique violation (Postgres 23505) — procura nome do índice na mensagem
  if (err.code === "23505" || /duplicate key value/i.test(msg)) {
    for (const [idx, friendly] of Object.entries(UNIQUE_INDEX_MESSAGES)) {
      if (msg.includes(idx)) return friendly;
    }
    return "Registro duplicado: já existe um item com estes dados.";
  }

  // RLS / permissões
  if (err.code === "42501") {
    // Mensagens já vêm em pt-BR das RPCs — apenas repassa.
    return err.message || "Operação não permitida pelas regras de acesso.";
  }

  return null;
}

/** Helper para uso em catch — devolve sempre uma string utilizável. */
export function toFriendlyMessage(err: unknown, fallback = "Erro inesperado."): string {
  const friendly = friendlyDbError(err as AnyError);
  if (friendly) return friendly;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message) || fallback;
  }
  return fallback;
}
