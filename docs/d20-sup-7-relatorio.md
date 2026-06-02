# D20.SUP.7 — Alçadas, Aprovações e Preparação Financeira

**Status:** APLICADA (2026-06-02). Sub-onda 7/8 de D20.SUP.

## 1. Migrações executadas (4)

| # | Conteúdo | Linter pré → pós |
|---|----------|------------------|
| 1 | Enum `app_permission` +4 valores (`suprimentos.alcada.gerir`, `.aplicar`, `.pedido.preparar_financeiro`, `.pedido.bloquear_financeiro`) | 218 → 222 WARN |
| 2 | Tabelas `suprimentos_alcadas` (regras, row_version+audit+soft-delete) e `suprimentos_alcadas_aplicadas` (append-only, triggers anti-UPDATE/DELETE). Ampliação de `suprimentos_pedidos_compra` com 6 campos de preparação financeira + CHECK do `status_financeiro` em 5 valores. | 222 → 224 |
| 3 | 5 RPCs SECURITY DEFINER: `rpc_sup_alcada_avaliar`, `rpc_sup_alcada_registrar_decisao`, `rpc_sup_pedido_preparar_financeiro`, `rpc_sup_pedido_bloquear_financeiro`, `rpc_sup_pedido_desbloquear_financeiro`. Todas REVOKE anon + GRANT authenticated + setam flag `app.via_sup_compras_rpc` quando mutam pedidos. | 224 → 229 |
| 4 | Views `v_suprimentos_dashboard_kpis`, `_por_fornecedor`, `_por_natureza`, `_por_cc`, `_por_os` + `v_suprimentos_alertas` (UNION ALL de 9 tipos de alerta). Todas `security_invoker=on`, GRANT authenticated. | 229 (estável) |

## 2. Motor de alçadas

`rpc_sup_alcada_avaliar(entidade_tipo, entidade_id, etapa, valor)` carrega o contexto da entidade (tipo/setor/natureza/CC/CR/fornecedor/destino/prioridade), busca a regra ativa de menor `prioridade` que satisfaça **todos** os critérios definidos (AND) e devolve `{matched, alcada_id, aprovador_tipo, aprovador_valor, exige_workflow, observacao_obrigatoria}`. Quando nenhuma regra casa, devolve `matched=false` com mensagem clara.

`rpc_sup_alcada_registrar_decisao` valida a permissão/role do aprovador antes de gravar a decisão. Motivo mínimo 5 caracteres para `REPROVADO`/`RETORNADO`; observação obrigatória respeitada quando a alçada exige. Triggers garantem que `suprimentos_alcadas_aplicadas` é estritamente append-only.

## 3. Preparação financeira do pedido (sem geração automática)

`rpc_sup_pedido_preparar_financeiro` exige fornecedor, CC e CR preenchidos. Aceita `{condicao_pagamento, data_prevista_pagamento, documento_fiscal, valor_aprovado_final, financeiro_observacao}`. Bloqueia se status atual for `GERADO` ou `CANCELADO`. Marca `status_financeiro='PRONTO_PARA_FINANCEIRO'`. **Não cria título, não toca `titulos_financeiros`, nada de geração automática.**

`rpc_sup_pedido_bloquear_financeiro(motivo)` e `_desbloquear_financeiro(motivo)` controlam o flag de bloqueio com motivo obrigatório (≥5).

## 4. UI

* **Novo repositório** `src/lib/repositories/suprimentos-alcadas-repo.ts`: CRUD de alçadas, `useAvaliarAlcada`, `useRegistrarDecisaoAlcada`, prep/bloqueio financeiro, hooks de dashboard (`useDashboardKpis`/`PorFornecedor`/`PorNatureza`/`PorCC`) e `useAlertasSuprimentos`.
* **Nova aba `Alçadas`** em `/suprimentos`: grid denso com toggle ativo/inativo + dialog de criação/edição com todos os critérios (etapa, tipo, valor min/max, setor, natureza, CC, CR, fornecedor, prioridade da req, destino, aprovador permissão/role, exige workflow, observação obrigatória).
* **Dashboard ao vivo**: 10 cards (abertas/aprovadas/rejeitadas/atrasadas/estoque reservado/valor solicitado/aprovado/em compra/recebido/itens críticos) + lista de alertas (até 50) com chip por severidade (INFO/WARN/HIGH) + Top fornecedores/natureza/CC.
* **PedidoDetailDialog** ganha aba **Preparação financeira** (form completo + Enviar/Bloquear/Desbloquear) e badge `Fin: …` ao lado do status. `status_financeiro` aparece no header.

## 5. Alertas implementados (9)

REQ_AGUARDANDO_APROVACAO · COT_SEM_FORNECEDOR · PED_AGUARDANDO_APROVACAO · PED_SEM_CC · REQ_URGENTE · REQ_ATRASADA · REC_ATRASADO (>14d) · SVC_SEM_CONFIRMACAO (>7d) · PED_PRONTO_FINANCEIRO/PED_FIN_BLOQUEADO.

## 6. Restrições respeitadas

- ❌ Sem geração automática de título financeiro.
- ❌ Sem alteração de RLS permissiva — toda regra continua via permissão/role + `auth.uid()`.
- ❌ Sem bypass das RPCs oficiais — mutação de pedido continua sob flag `app.via_sup_compras_rpc`.
- ❌ Sem aprovação fora de permissão — `rpc_sup_alcada_registrar_decisao` valida e rejeita com ERRCODE 42501.
- ❌ Sem toque em estoque / OS / contratos / comercial.

## 7. Critério de aceite

✅ Cadastrar alçada em `/suprimentos > Alçadas`.
✅ Em uma requisição/cotação/pedido, executar `rpc_sup_alcada_avaliar` retorna a regra exigida.
✅ `rpc_sup_alcada_registrar_decisao` bloqueia usuário sem a permissão correta.
✅ Em um Pedido com fornecedor+CC+CR, abrir aba "Preparação financeira", preencher e enviar → `status_financeiro=PRONTO_PARA_FINANCEIRO` (sem título criado).
✅ Bloquear/desbloquear gera atualização auditada e alerta no painel.
✅ Dashboard `/suprimentos` exibe KPIs reais, top fornecedores/natureza/CC e alertas.

## 8. Pendências naturais para D20.SUP.8

- Integração da chamada `useAvaliarAlcada` dentro dos botões Aprovar de Requisição/Cotação para mostrar chip "Alçada exigida: X" antes da decisão (atualmente o motor está disponível por hook mas não plugado nesses botões; o pedido tem o status financeiro plugado).
- Kanban e processos avançados das listas.
- Job de evolução de `status_financeiro` para `GERADO` quando o financeiro efetivar o pagamento (entra em onda Financeiro D8).

## 9. Métricas

- Tabelas novas: 2 · Colunas novas: 7 (em pedido) · RPCs novas: 5 · Views novas: 6 · Permissões novas: 4
- Linter: 218 → 229 WARN (padrão D14.2 aceito; +5 funções DEFINER + +6 views security_invoker no padrão authenticated-only).
- Maturidade Suprimentos: ~82% → **~92%** (motor de alçadas + preparação financeira + dashboard ao vivo + alertas).
