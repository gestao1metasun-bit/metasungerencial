# Onda F2 — Operações Financeiras: RPCs oficiais

**Data:** 2026-05-28  
**Status:** APLICADA  
**Escopo:** Backend (SQL/RPCs). Sem UI, sem alteração no fluxo comercial.

## Entregas

### Schema
- `titulos_financeiros.origem_tipo` ampliado para aceitar `OPERACAO_FINANCEIRA` (CHECK atualizado).
- Helper interno `fn_op_fin_log_evento(op_id, evento, motivo, detalhes)` — append-only.

### 7 RPCs SECURITY DEFINER

| RPC | Permissão | Idempotente | Evento |
|---|---|---|---|
| `rpc_op_fin_criar` | `operacao_financeira.criar` | ✅ | CRIADA |
| `rpc_op_fin_gerar_parcelas` | `operacao_financeira.criar` | ✅ | PARCELAS_GERADAS |
| `rpc_op_fin_aprovar` | `operacao_financeira.aprovar` | ✅ | APROVADA |
| `rpc_op_fin_liberar` | `operacao_financeira.liberar` | ✅ | LIBERADA |
| `rpc_op_fin_renegociar` | `operacao_financeira.renegociar` | ✅ | RENEGOCIADA + CRIADA |
| `rpc_op_fin_cancelar` | `operacao_financeira.cancelar` | ✅ | CANCELADA |
| `rpc_op_fin_estornar_recebimento` | `operacao_financeira.estornar` | ✅ | ESTORNADA |

Todas com:
- `SECURITY DEFINER` + `SET search_path = public`
- `REVOKE ALL FROM PUBLIC, anon` + `GRANT EXECUTE TO authenticated`
- Idempotência via `rpc_idempotente_check/commit`
- Mutação de status apenas dentro da RPC via `set_config('app.via_op_fin_rpc','true',true)` (respeita trigger anti-edição direta)

## Regras de pedra cumpridas

- ✅ Nenhuma RPC toca: **propostas, contratos, PV, projetos, engenharia, estoque, comissão, faturamento, KPIs comerciais**.
- ✅ Títulos gerados nascem com `origem_tipo = 'OPERACAO_FINANCEIRA'` e `origem_id = operacao_id`.
- ✅ Tipo do título derivado de `natureza_caixa`: ENTRADA→`receber`, SAIDA→`pagar`.
- ✅ Vínculo título↔parcela 1:1 (`parcelas.titulo_id`).
- ✅ Auditoria 100% em `operacoes_financeiras_eventos` (append-only, RLS por permissão).
- ✅ Cancelamento bloqueado se houver baixa pendente de estorno.
- ✅ Renegociação preserva originais (status RENEGOCIADA, FK `renegociacao_de` na nova).
- ✅ Motivo obrigatório (≥5 chars) em renegociar/cancelar/estornar.

## Integração financeira

Títulos gerados:
- Aparecem em `v_lancamentos_derivados` (filtra `titulos_financeiros`).
- Impactam fluxo de caixa via `v_kpis_financeiro_oficial`.
- Rastreáveis por `origem_tipo='OPERACAO_FINANCEIRA'` + `dados->>'operacao_id'`.

## Validações de entrada implementadas

| Campo | Regra |
|---|---|
| `valor_total` | obrigatório, > 0 |
| `natureza_id, centro_resultado_id, conta_id` | obrigatórios |
| `finalidade` | obrigatória |
| `contraparte` por tipo | já garantido pelo trigger F1 `tg_op_fin_valida_contraparte` |
| `qtd_parcelas` | APORTE/SÓCIO_EMPRESA → exatamente 1 |
| soma das parcelas | = `valor_total` (resto na última) |

## Linter / Segurança

- Padrão D14.2 mantido: 129 → 137 WARN (8 novas funções, todas `SECURITY DEFINER` + REVOKE anon + GRANT authenticated).
- Zero WARN de `search_path mutable` para as novas funções.
- Zero erro ERROR.

## Riscos remanescentes (para F3/F4)

| # | Risco | Mitigação proposta |
|---|---|---|
| R1 | Quitação automática da operação não acontece quando todos os títulos saldam | Trigger em `titulos_movimentacoes` filtrado por origem_tipo='OPERACAO_FINANCEIRA' (F4) |
| R2 | Estorno só registra evento; baixa em si continua via fluxo financeiro padrão | Compor com `rpc_movimentacao_estornar` em F4 |
| R3 | Não há view `v_op_fin_enriquecido` (cabeçalho + parcelas + saldos) | Criar em F3 com a UI |
| R4 | UI precisa gerar `_request_id` UUID por ação operacional | Padronizar em F3 (hook `useOpFinanceira`) |
| R5 | Renegociação não recalcula saldo residual da origem automaticamente | UI em F3 deve apresentar saldo residual para o usuário replicar no payload da nova |

## Próxima onda

**F3 — UI Enterprise** dentro do módulo Financeiro, aba "Operações Financeiras":
- Lista enterprise (filtros por tipo, status, contraparte, período)
- Modal de criação multistep (tipo → contraparte → financeiro → parcelas)
- Ações governadas (aprovar/liberar/renegociar/cancelar/estornar) via `GovernedActionButton`
- Card de rastreabilidade (eventos + títulos gerados)
- View auxiliar `v_op_fin_enriquecido` para o grid

## Critério de aceite F2 — ATENDIDO

✅ Uma operação financeira pode ser **criada → parcelada → aprovada → liberada**, gera títulos financeiros corretos, é rastreável no financeiro oficial, sem passar pelo Comercial/PV/Projeto.
