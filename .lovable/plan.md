# Onda D — Financeiro Real + Estoque (Fundação)

Escopo grande. Vou executar em **sub-ondas sequenciais**, cada uma com migração + UI mínima + validação estrutural antes da próxima. Mantenho a diretriz: **consistência operacional > estética**, **sem mock**, **sem fallback silencioso**, **tudo via Supabase + RLS + auditoria**.

---

## Sub-onda D1 — Núcleo Financeiro (Schema)

Migração única criando:

**Tabelas**
- `centros_resultado` (codigo, nome, tipo, ativo)
- `contas_financeiras` (codigo, nome, tipo: caixa/banco/cartao, ativo, saldo_inicial)
- `titulos_financeiros` — campos: `tipo` (receber/pagar), `origem_tipo` (enum CHECK: contrato/projeto/pedido_venda/obra/cliente/fornecedor/aditivo/estoque/manual_controlado), `origem_id uuid NOT NULL`, `cliente_id`, `consultor_id`, `valor_bruto`, `valor_liquido`, `desconto`, `juros`, `multa`, `saldo`, `competencia`, `vencimento`, `status` (PENDENTE/PARCIAL/RECEBIDO/ATRASADO/CANCELADO/RENEGOCIADO), `centro_id`, `conta_id`, `forma_pagamento`, `observacoes`, auditoria padrão.
- `parcelas_financeiras` (titulo_id, numero, valor, vencimento, saldo, status, recebido_em)
- `movimentacoes_financeiras` (titulo_id, parcela_id?, tipo: recebimento/baixa/estorno/juros/desconto/multa, valor, data, conta_id, observacao, user_id) — append-only.

**Constraints críticas**
- `origem_id NOT NULL` + CHECK que `origem_tipo` é valor válido → **proíbe título órfão**.
- Trigger `tg_titulo_valida_saldo`: bloqueia movimentação que ultrapasse `saldo`.
- Trigger `tg_titulo_atualiza_saldo`: a cada movimentação recalcula `saldo` e ajusta `status` (PENDENTE → PARCIAL → RECEBIDO).
- Trigger `tg_titulo_valida_transicao`: state machine (mesma lógica do PV — bloqueio 42501).
- Trigger `tg_audit_row` + `tg_snapshot_version` + `tg_set_updated_at_generic` em `titulos_financeiros` e `movimentacoes_financeiras`.
- `is_period_closed` aplicado em UPDATE financeiro.

**RLS**
- `titulos_*` SELECT/INSERT/UPDATE: `is_admin(auth.uid()) OR consultor_id = auth.uid()`. DELETE: só admin.
- `movimentacoes_*` SELECT via título; INSERT autenticado com validação de saldo no trigger; UPDATE/DELETE bloqueado (append-only).
- `centros_resultado` / `contas_financeiras`: SELECT auth, write admin.

**RPCs**
- `gerar_titulos_do_pv(_pv_id, _parcelas jsonb)` SECURITY DEFINER — só PV APROVADO, idempotente, preenche `origem_tipo='pedido_venda'` + `origem_id=pv_id`.
- `receber_parcela(_parcela_id, _valor, _conta_id, _data, _obs)` — valida saldo, cria movimentação, recalcula via trigger.
- `cancelar_titulo(_titulo_id, _motivo)` — exige motivo ≥3 chars.
- `renegociar_titulo(_titulo_id, _novas_parcelas jsonb, _motivo)`.

---

## Sub-onda D2 — UI Financeira Mínima

- Hook `useTitulosFinanceiros` (lista + CRUD via RPCs).
- Rota `/financeiro/titulos` com tabela + filtros (status, origem_tipo, vencimento) + botão "Receber" → modal padronizado (Identificação / Financeiro / Operacional / Auditoria).
- Botão "Gerar títulos" no `PedidoVendaModal` quando status = APROVADO.
- Link no `AppLayout`.

---

## Sub-onda D3 — Estoque (Fundação)

Migração criando:

- `estoque_itens` (codigo, descricao, unidade, categoria, ativo, custo_medio)
- `estoque_movimentacoes` (item_id, tipo: entrada/saida/ajuste/reserva/liberacao_reserva, quantidade, custo_unit, **origem_tipo** CHECK (obra/pv/projeto/manual_controlado), **origem_id NOT NULL para saídas**, data, user_id, observacao) — append-only.
- `estoque_reservas` (item_id, obra_id?, pv_id?, projeto_id?, quantidade, status: ATIVA/CONSUMIDA/LIBERADA, criado_em, consumido_em)
- `estoque_entregas` (obra_id, item_id, quantidade, responsavel, data, observacao, reserva_id?)

**Views/Funções**
- `vw_estoque_saldos`: por item retorna `fisico`, `reservado`, `disponivel = fisico - reservado`, `entregue`, `pendente`.
- Trigger `tg_estoque_valida_origem_saida`: bloqueia saída sem `origem_id` válido.
- Trigger `tg_estoque_valida_disponivel`: bloqueia reserva > disponível.

**RLS** análogo a PV (admin OR criador/consultor via obra).

**Bridge Engenharia ↔ Estoque**
- RPC `reservar_material_obra(_obra_id, _item_id, _qtd)`.
- RPC `entregar_material_obra(_reserva_id, _qtd, _responsavel, _obs)` → cria `estoque_entregas` + movimentação SAIDA com `origem_tipo='obra'`/`origem_id=obra_id` + atualiza reserva.

---

## Sub-onda D4 — UI Estoque Mínima

- Rota `/estoque/itens` (lista + saldos da view).
- Rota `/estoque/movimentacoes` (histórico append-only).
- Aba "Materiais" no modal de Obra (reserva + entrega).

---

## Sub-onda D5 — Preparação CMV

- View `vw_custo_obra` (soma movimentações SAIDA × custo_unit por obra_id).
- View `vw_custo_pv` (via obra vinculada ao PV).
- View `vw_custo_contrato` (via PVs do contrato).
- Sem UI nova nesta sub-onda — apenas estrutura para próximas ondas.

---

## Fora de escopo (explicitamente)

- Módulo fiscal, contabilidade completa, BI avançado, WMS, MRP, integrações bancárias, conciliação OFX, NFe — ficam para ondas futuras.
- Refino visual, animações, dashboards — standby (regra existente).

---

## Ordem de execução proposta

1. **Agora**: migração D1 (schema financeiro + triggers + RPCs + RLS + GRANTs).
2. Após aprovação da migração: UI D2 + hook + link.
3. **Checkpoint operacional D1+D2**: validar geração de títulos a partir de PV aprovado no app publicado, recebimento de parcela, bloqueio de saldo, auditoria.
4. Migração D3 (estoque) → UI D4 → checkpoint.
5. Migração D5 (views CMV) → fim da Onda D.

Cada migração será submetida separadamente (uma por vez, sem paralelizar com código) para permitir validação incremental e rollback seguro.

---

## Confirmação necessária

Confirma esta divisão em 5 sub-ondas sequenciais? Posso começar imediatamente com a **migração D1 (núcleo financeiro)** assim que aprovar.
