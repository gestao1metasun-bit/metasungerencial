// Mapper isomórfico entre row do Supabase (public.contratos) e ContratoFull do store.
// Sem dependências server-only — pode ser importado tanto pelo .functions.ts quanto pelo cliente.
import type { ContratoFull } from "./contratos-store";

/** Shape parcial da row de public.contratos que o adapter usa. */
export type ContratoRow = {
  id: string;
  codigo: string | null;
  cliente_id: string;
  consultor_id: string | null;
  status: string;
  valor_total: number | string;
  valor_entrada: number | string;
  data_assinatura: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  potencia_kwp: number | string | null;
  modulos_qtde: number | null;
  inversor: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  dados: Record<string, unknown>;
  vendedor: string | null;
  comissao_pct: number | string | null;
  comissao_valor: number | string | null;
  possui_financiamento: boolean;
  financiamento_banco: string | null;
  financiamento_valor: number | string | null;
  financiamento_status: string | null;
  financiamento_liberado_eng: boolean;
  proposta_id: string | null;
  lead_id: string | null;
  assinado_aprovado: boolean;
  assinado_aprovado_em: string | null;
  assinado_aprovado_por: string | null;
  liberado_para_contrato: boolean;
  liberado_em: string | null;
  liberado_por: string | null;
  liberacao_obs: string | null;
  contrato_redigido: boolean;
  cancelado: boolean;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const n = (v: unknown): number | undefined =>
  v === null || v === undefined ? undefined : Number(v);

/** Converte row do banco em ContratoFull (cliente-friendly). */
export function contratoFromRow(row: ContratoRow): ContratoFull {
  const d = (row.dados ?? {}) as Partial<ContratoFull> & Record<string, unknown>;
  return {
    // chave visível para a UI
    id: row.codigo ?? row.id,
    cliente: (d.cliente as string) ?? "",
    clienteId: row.cliente_id,
    vendedor: row.vendedor ?? (d.vendedor as string) ?? "",
    valor: Number(row.valor_total) || 0,
    kwp: Number(row.potencia_kwp ?? 0) || (d.kwp as number) || 0,
    status: row.status,
    data: row.data_inicio ?? (d.data as string) ?? row.created_at.slice(0, 10),
    pagamento: row.forma_pagamento ?? (d.pagamento as string) ?? "",
    banco: (d.banco as string) ?? row.financiamento_banco ?? undefined,
    modulos: row.modulos_qtde ?? (d.modulos as number),
    obs: row.observacoes ?? (d.obs as string),
    potencia: n(d.potencia),
    inv1: row.inversor ?? (d.inv1 as string),
    inv2: d.inv2 as string,
    inv3: d.inv3 as string,
    inv4: d.inv4 as string,
    inv5: d.inv5 as string,
    inv6: d.inv6 as string,
    parametro: d.parametro as string,
    dataCadastro: (d.dataCadastro as string) ?? row.created_at.slice(0, 10),
    dataAssinatura: row.data_assinatura ?? (d.dataAssinatura as string),
    comissaoPct: n(row.comissao_pct) ?? n(d.comissaoPct),
    comissaoValor: n(row.comissao_valor) ?? n(d.comissaoValor),
    clienteFull: d.clienteFull as ContratoFull["clienteFull"],
    projetos: (d.projetos as ContratoFull["projetos"]) ?? [],
    auditoria: (d.auditoria as ContratoFull["auditoria"]) ?? [],
    parcelasPagto: d.parcelasPagto as ContratoFull["parcelasPagto"],
    composicaoPagto: d.composicaoPagto as ContratoFull["composicaoPagto"],
    possuiFinanciamento: row.possui_financiamento ?? false,
    financiamentoBanco: row.financiamento_banco ?? undefined,
    financiamentoValor: n(row.financiamento_valor),
    financiamentoGerente: d.financiamentoGerente as string,
    financiamentoStatus: row.financiamento_status ?? undefined,
    financiamentoObs: d.financiamentoObs as string,
    financiamentoStatusLiberacao: d.financiamentoStatusLiberacao as string,
    financiamentoLiberacao: d.financiamentoLiberacao as string,
    financiamentoPrevisao: d.financiamentoPrevisao as string,
    financiamentoEnvio: d.financiamentoEnvio as string,
    financiamentoLiberadoEng: row.financiamento_liberado_eng ?? false,
    financiamentoLiberadoEngEm: d.financiamentoLiberadoEngEm as string,
    financiamentoLiberadoEngPor: d.financiamentoLiberadoEngPor as string,
    propostaId: row.proposta_id ?? undefined,
    propostaNumero: d.propostaNumero as string,
    leadId: row.lead_id ?? undefined,
    leadNumero: d.leadNumero as string,
    contratoAssinadoArquivo: d.contratoAssinadoArquivo as string,
    contratoRedigido: row.contrato_redigido ?? false,
    assinadoAprovado: row.assinado_aprovado ?? false,
    assinadoAprovadoEm: row.assinado_aprovado_em ?? undefined,
    assinadoAprovadoPor: row.assinado_aprovado_por ?? undefined,
    liberadoParaContrato: row.liberado_para_contrato ?? false,
    liberadoPor: row.liberado_por ?? undefined,
    liberadoEm: row.liberado_em ?? undefined,
    liberacaoObs: row.liberacao_obs ?? undefined,
    motivoCancelamento: row.motivo_cancelamento ?? undefined,
    cancelado: row.cancelado ?? false,
    responsavel: d.responsavel as string,
    responsavelDoc: d.responsavelDoc as string,
    responsavelCargo: d.responsavelCargo as string,
    pagamentoTipo: d.pagamentoTipo as ContratoFull["pagamentoTipo"],
    pagamentoDetalhes: d.pagamentoDetalhes as ContratoFull["pagamentoDetalhes"],
    clausulasCustom: d.clausulasCustom as ContratoFull["clausulasCustom"],
  };
}

/** Payload de upsert: separa colunas tipadas do `dados jsonb` (preserva o resto). */
export type ContratoUpsertPayload = {
  codigo: string;
  cliente_id: string | null;
  status: string;
  valor_total: number;
  valor_entrada: number;
  data_assinatura: string | null;
  data_inicio: string | null;
  potencia_kwp: number | null;
  modulos_qtde: number | null;
  inversor: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  vendedor: string | null;
  comissao_pct: number | null;
  comissao_valor: number | null;
  possui_financiamento: boolean;
  financiamento_banco: string | null;
  financiamento_valor: number | null;
  financiamento_status: string | null;
  financiamento_liberado_eng: boolean;
  proposta_id: string | null;
  lead_id: string | null;
  assinado_aprovado: boolean;
  assinado_aprovado_em: string | null;
  liberado_para_contrato: boolean;
  liberado_em: string | null;
  liberacao_obs: string | null;
  contrato_redigido: boolean;
  cancelado: boolean;
  motivo_cancelamento: string | null;
  dados: Record<string, unknown>;
};

/** Converte ContratoFull em payload de upsert. Retorna null se faltar cliente_id (NOT NULL). */
export function rowFromContrato(c: ContratoFull): ContratoUpsertPayload | null {
  if (!c.clienteId) return null; // sem cliente_id não dá pra subir (NOT NULL no banco)
  return {
    codigo: c.id,
    cliente_id: c.clienteId,
    status: c.status ?? "Rascunho",
    valor_total: Number(c.valor) || 0,
    valor_entrada: 0,
    data_assinatura: c.dataAssinatura ?? null,
    data_inicio: c.data ?? null,
    potencia_kwp: c.kwp != null ? Number(c.kwp) : null,
    modulos_qtde: c.modulos != null ? Number(c.modulos) : null,
    inversor: c.inv1 ?? null,
    forma_pagamento: c.pagamento ?? null,
    observacoes: c.obs ?? null,
    vendedor: c.vendedor ?? null,
    comissao_pct: c.comissaoPct != null ? Number(c.comissaoPct) : null,
    comissao_valor: c.comissaoValor != null ? Number(c.comissaoValor) : null,
    possui_financiamento: !!c.possuiFinanciamento,
    financiamento_banco: c.financiamentoBanco ?? null,
    financiamento_valor: c.financiamentoValor != null ? Number(c.financiamentoValor) : null,
    financiamento_status: c.financiamentoStatus ?? null,
    financiamento_liberado_eng: !!c.financiamentoLiberadoEng,
    proposta_id: c.propostaId ?? null,
    lead_id: c.leadId ?? null,
    assinado_aprovado: !!c.assinadoAprovado,
    assinado_aprovado_em: c.assinadoAprovadoEm ?? null,
    liberado_para_contrato: !!c.liberadoParaContrato,
    liberado_em: c.liberadoEm ?? null,
    liberacao_obs: c.liberacaoObs ?? null,
    contrato_redigido: !!c.contratoRedigido,
    cancelado: !!c.cancelado,
    motivo_cancelamento: c.motivoCancelamento ?? null,
    // `dados` carrega tudo que não tem coluna tipada
    dados: {
      cliente: c.cliente,
      vendedor: c.vendedor,
      data: c.data,
      pagamento: c.pagamento,
      banco: c.banco,
      modulos: c.modulos,
      obs: c.obs,
      potencia: c.potencia,
      inv1: c.inv1, inv2: c.inv2, inv3: c.inv3,
      inv4: c.inv4, inv5: c.inv5, inv6: c.inv6,
      parametro: c.parametro,
      dataCadastro: c.dataCadastro,
      dataAssinatura: c.dataAssinatura,
      comissaoPct: c.comissaoPct,
      comissaoValor: c.comissaoValor,
      clienteFull: c.clienteFull,
      projetos: c.projetos ?? [],
      auditoria: c.auditoria ?? [],
      parcelasPagto: c.parcelasPagto,
      composicaoPagto: c.composicaoPagto,
      financiamentoGerente: c.financiamentoGerente,
      financiamentoObs: c.financiamentoObs,
      financiamentoStatusLiberacao: c.financiamentoStatusLiberacao,
      financiamentoLiberacao: c.financiamentoLiberacao,
      financiamentoPrevisao: c.financiamentoPrevisao,
      financiamentoEnvio: c.financiamentoEnvio,
      financiamentoLiberadoEngEm: c.financiamentoLiberadoEngEm,
      financiamentoLiberadoEngPor: c.financiamentoLiberadoEngPor,
      propostaNumero: c.propostaNumero,
      leadNumero: c.leadNumero,
      contratoAssinadoArquivo: c.contratoAssinadoArquivo,
      responsavel: c.responsavel,
      responsavelDoc: c.responsavelDoc,
      responsavelCargo: c.responsavelCargo,
      pagamentoTipo: c.pagamentoTipo,
      pagamentoDetalhes: c.pagamentoDetalhes,
      clausulasCustom: c.clausulasCustom,
    },
  };
}
