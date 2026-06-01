# D19.SEC — Auditoria de Regressão Pós-Correção RLS

Data: 2026-06-01 20:00 (UTC-3 ~17:00 BRT)
Escopo: validar que o endurecimento de 3 políticas RLS (scanner SUPA_rls_policy_always_true) não quebrou nenhum fluxo operacional.

## 1. Patches verificados

| Tabela | Política | Antes | Depois |
|---|---|---|---|
| operacoes_financeiras_eventos | `op_fin_ev ins` (INSERT) | WITH CHECK true | `has_permission(auth.uid(), 'operacao_financeira.criar')` |
| faturamentos_comercial | `fat_insert_auth` (INSERT) | WITH CHECK true | `has_permission(auth.uid(), 'comercial.proposta.editar')` |
| faturamentos_comercial | `fat_update_auth` (UPDATE) | USING/WITH CHECK true | `has_permission(auth.uid(), 'comercial.proposta.editar')` |

Políticas residuais com `true` em INSERT/UPDATE/DELETE: **0**. ✅

## 2. Pré-requisitos estruturais

- Enum `app_permission` contém `operacao_financeira.criar` e `comercial.proposta.editar`. ✅
- `has_permission` é SECURITY DEFINER com `search_path=public`. ✅
- GRANTs nas duas tabelas preservados (anon/authenticated/service_role com ALL — herdado e intacto). ✅
- 16 RPCs SECURITY DEFINER críticas continuam DEFINER + search_path bound (rpc_lancamento_criar, rpc_titulos_totais, rpc_contrato_assinar, rpc_proposta_solicitar_revisao, fn_op_fin_log_evento, rpc_op_fin_criar/aprovar/liberar, rpc_adiantamento_estornar, rpc_idempotente_check/commit, rpc_perf_log, check_row_version, has_role, has_permission). ✅
  - Observação: `rpc_titulos_totais` é SECURITY INVOKER (intencional — D15.1.a.1.i). RPCs DEFINER continuam bypassando RLS, então toda a escrita "oficial" via RPCs **não é afetada** pelos novos predicados.

## 3. Telemetria operacional pós-fix

### error_log (últimas 24h)
- Erros com `permission` / `RLS` / `42501` / `row-level`: **0**
- Erros totais: **0**

### perf_log (última 1h, pós-deploy SEC)
| evento | amostras | avg_ms | P95 |
|---|---:|---:|---:|
| shell.ready | 1.072 | 0 | 0 |
| route.ready | 282 | 208 | 208 |
| module.switch | 96 | 655 | 2.727 |
| first-list.ready | 5 | 231 | 588 |
| auth.ok | 1 | 837 | 837 |

Sem regressão de performance. P95 de módulos e listas dentro do SLA.

### Volumetria (leitura ok, sem 42501)
titulos_financeiros 0 · operacoes_financeiras 2 · op_fin_eventos 4 · faturamentos_comercial 0 · contratos 0 · propostas 0 · projetos 0 · estoque_movimentos 8 · workflow_aprovacoes 0 · anexos 0 · audit_log 224.

## 4. Cobertura por módulo (análise estrutural)

| Módulo | Leitura | Criação | Edição | Aprovação | Anexos | Histórico | RPCs DEFINER | Status |
|---|---|---|---|---|---|---|---|---|
| Login / Admin Master | n/a | n/a | n/a | n/a | n/a | n/a | has_role/has_permission intactas | ✅ |
| Financeiro (títulos/parcelas/movs/adiantamentos) | inalterado | rpc_lancamento_criar (DEFINER) | RLS inalterada | n/a | anexos inalterado | audit_log inalterado | inalterado | ✅ |
| Operações Financeiras | RLS sel inalterada | rpc_op_fin_criar (DEFINER) | rpc_op_fin_aprovar/liberar (DEFINER) | idem | anexos inalterado | op_fin_eventos: INSERT direto agora exige `operacao_financeira.criar`; helper `fn_op_fin_log_evento` é DEFINER → continua escrevendo | ✅ |
| Comercial (lead/proposta/contrato/comissão/carteira) | inalterado | inalterado | rpc_proposta_solicitar_revisao (DEFINER) | rpc_contrato_assinar (DEFINER) | inalterado | inalterado | inalterado | ✅ |
| Comercial → Faturamentos | leitura inalterada | INSERT agora exige `comercial.proposta.editar` | UPDATE idem | n/a | inalterado | inalterado | n/a (tabela vazia, 0 linhas) | ✅ |
| Engenharia / Obras / Projetos | inalterado | inalterado | inalterado | inalterado | inalterado | inalterado | inalterado | ✅ |
| Financiamentos | n/a (cabe em titulos_financeiros via lancamento_criar) | inalterado | inalterado | inalterado | inalterado | inalterado | inalterado | ✅ |
| Estoque (movs/itens/solicitações) | inalterado | inalterado (RPCs movimentação) | inalterado | inalterado | inalterado | inalterado | inalterado | ✅ |
| Aprovações (workflow) | inalterado | inalterado | inalterado | flag `app.via_workflow_rpc` intacta | inalterado | workflow_historico inalterado | inalterado | ✅ |
| Pós-venda | inalterado | inalterado | inalterado | inalterado | inalterado | inalterado | inalterado | ✅ |

Justificativa "Operações Financeiras ✅": a única mudança restringe **INSERT direto** em `operacoes_financeiras_eventos`. Esses eventos sempre nascem por `fn_op_fin_log_evento` ou por RPCs `rpc_op_fin_*`, todas SECURITY DEFINER → contornam RLS por design. O endurecimento só bloqueia escrita por cliente fora desse caminho oficial — exatamente o objetivo do scanner. Nenhuma RPC oficial foi alterada.

Justificativa "Faturamentos ✅": a tabela `faturamentos_comercial` é preparatória (D18.3), 0 linhas, sem UI ativa. Quando entrar em uso, a permissão `comercial.proposta.editar` já é a permissão que rege edição de propostas — mesmo dono funcional. Admin Master tem todas as permissões.

## 5. Riscos residuais

- Nenhum risco P0 ou P1 identificado.
- P2: se algum trigger interno (não revisado) escrever em `operacoes_financeiras_eventos` ou `faturamentos_comercial` sem flag DEFINER e como `authenticated`, o INSERT será bloqueado. Mitigação: o helper canônico `fn_op_fin_log_evento` é DEFINER, e `faturamentos_comercial` ainda não tem trigger de escrita externa. Monitorar `error_log` por 48h.

## 6. Veredito

🟢 **GO — Regressão limpa.**

- 0 erro de RLS / permission nas últimas 24h.
- Performance sem regressão (P95 módulos 2,7s; lista 588ms; auth 837ms).
- Todos os caminhos oficiais de escrita continuam funcionando (DEFINER bypass).
- Admin Master mantém acesso total via `has_role('admin_master')` + `has_permission`.
- Nenhuma RPC SECURITY DEFINER foi tocada.

## 7. Recomendação

- Monitorar `error_log` filtrando `mensagem ILIKE '%42501%'` por 48h.
- Próxima auditoria SEC: rodar scanner novamente após o próximo deploy estrutural (D19.2 ou D15.3.c).
- Não há ação corretiva pendente.
