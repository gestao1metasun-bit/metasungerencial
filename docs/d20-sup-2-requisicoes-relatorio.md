# D20.SUP.2 — Esquema Unificado de Requisições de Suprimentos

**Data:** 2026-06-02
**Escopo:** schema-first (DDL + RLS + RPCs + view). Sem UI.
**Aprovado:** D20.SUP (sub-onda 2 de 8) — Decisões D1=nova tabela canônica, D2=`os.material.baixar` mantido como exceção controlada, D3=fluxo sequencial.

## Aplicado em 2 migrações
1. **Parte 1/2** — adiciona 8 valores ao enum `app_permission` (commit obrigatório antes de uso em policies).
2. **Parte 2/2** — schema + RLS + 12 RPCs + view.

## Tabelas novas
- **`suprimentos_requisicoes`** (cabeçalho) — 39 colunas. Vínculos: O.S., tarefa, obra, projeto, cliente, CC, CR, natureza, competência. Integrabilidade: `codigo_externo`, `sistema_destino`, `status_integracao` (CHECK 5 valores), `hash_integracao`, `lote_integracao_id`. Auditoria: `row_version`, `criado_por`, `criado_em`, `atualizado_em`, `deleted_at`. `numero` bigserial único.
- **`suprimentos_requisicao_itens`** — 17 colunas. `valor_estimado_total` GENERATED (qtd×unit). CHECKs `>0`/`>=0` em todas as quantidades. FKs: `produtos` (item de estoque opcional), `fornecedores` (sugerido).
- **`suprimentos_requisicao_eventos`** — append-only (triggers bloqueiam UPDATE/DELETE). FK em CASCADE.

## Enums novos
- `sup_req_tipo` — MATERIAL, SERVICO.
- `sup_req_status` — 13 estados: RASCUNHO, ENVIADA, EM_APROVACAO, APROVADA, REPROVADA, RETORNADA, AGUARDANDO_ESTOQUE, EM_SEPARACAO, AGUARDANDO_COMPRA, EM_COMPRA, PARCIALMENTE_ATENDIDA, ATENDIDA, CANCELADA.

## Índices (10)
status (partial deleted_at IS NULL), tipo (partial), os_id (partial), obra_id (partial), projeto_id (partial), solicitante_id, criado_em DESC, centro_resultado_id (partial), itens.requisicao_id, itens.item_estoque_id (partial), eventos.(requisicao_id, data_hora DESC).

## Permissões (8 novas no `app_permission`)
- `suprimentos.requisicao.visualizar` / `criar` / `editar` / `aprovar` / `cancelar` / `atender` / `comprar`
- `suprimentos.dashboard.ver`

## RLS
- Cabeçalho/itens: SELECT/INSERT/UPDATE/DELETE gateados pela permissão correspondente via `has_permission(auth.uid(), …)`.
- Eventos: SELECT gateado por `visualizar`. **Sem policy de INSERT/UPDATE/DELETE para o usuário comum** — inserção exclusiva via RPC `fn_sup_req_log_evento` (SECURITY DEFINER); triggers `tg_sup_req_eventos_no_mut` bloqueiam UPDATE/DELETE.

## Guard de status
- Trigger `tg_sup_req_status_guard` rejeita mudança de `status` direta — exige `app.via_sup_req_rpc='true'` setado pelo helper `fn_sup_req_set_status` (chamado só pelas RPCs oficiais). Mesmo trigger bumpa `row_version`.

## RPCs oficiais (12, todas SECURITY DEFINER + search_path=public, REVOKE anon/PUBLIC + GRANT authenticated)
| RPC | Transição | Regra extra |
|---|---|---|
| `rpc_sup_requisicao_criar(jsonb)` | → RASCUNHO | precisa `criar` |
| `rpc_sup_requisicao_atualizar(uuid,jsonb)` | RASCUNHO/RETORNADA | precisa `editar` |
| `rpc_sup_requisicao_enviar(uuid)` | → EM_APROVACAO | precisa itens > 0 |
| `rpc_sup_requisicao_aprovar(uuid,numeric,text)` | → APROVADA | bloqueia qtd=0; default qtd_aprovada=solicitada |
| `rpc_sup_requisicao_reprovar(uuid,text)` | → REPROVADA | motivo ≥5 |
| `rpc_sup_requisicao_cancelar(uuid,text)` | → CANCELADA | motivo ≥5 |
| `rpc_sup_requisicao_retornar(uuid,text)` | → RETORNADA | motivo ≥5 |
| `rpc_sup_requisicao_verificar_estoque(uuid)` | diagnóstico | retorna jsonb com `falta` por item |
| `rpc_sup_requisicao_enviar_compra(uuid,text)` | → AGUARDANDO_COMPRA | usa `comprar` ou `atender` |
| `rpc_sup_requisicao_atender_parcial(uuid,jsonb)` | → PARCIALMENTE_ATENDIDA | precisa `atender` |
| `rpc_sup_requisicao_atender_total(uuid,jsonb)` | → ATENDIDA | rejeita entregue > aprovada |
| `rpc_sup_requisicao_evento_registrar(uuid,text,text,jsonb)` | observação livre | grava em eventos sem mudar status |

Helpers internos (REVOKE total): `fn_sup_req_log_evento`, `fn_sup_req_set_status`.

## View
- `v_suprimentos_requisicoes_resumo` (security_invoker=on, GRANT authenticated): cabeçalho + `qtd_itens` + `qtd_solicitada_total` + `qtd_entregue_total`. Filtra `deleted_at IS NULL`.

## Segurança / Linter
- Linter: 164 → 178 WARN (+14). Todos do padrão D14.2 (SECURITY DEFINER + search_path) em RPCs autenticadas. **Aceito arquiteturalmente** — todas têm `REVOKE anon, PUBLIC` + `GRANT authenticated` + `SET search_path = public`.
- Eventos efetivamente append-only (triggers + ausência de policy de INSERT).
- Mudança de status só por RPC (flag de sessão).

## Decisões implementadas
- **D1** — tabela canônica nova `suprimentos_requisicoes`. `solicitacoes_material` legado preservado intacto.
- **D2** — `os.material.baixar` segue existindo como exceção controlada (não foi tocado).
- **D3** — fluxo sequencial; nenhum agrupamento por fornecedor/obra ainda.

## NÃO feito (proposital)
- UI (telas/listagem/forms) — fica para D20.SUP.2.UI (próximo turno UI puro) ou direto D20.SUP.3.
- Workflow D5.1 — aprovação reusará alçada `requisicao_suprimentos` em D20.SUP.3.
- Compras/cotação/pedido/recebimento — D20.SUP.5.
- Reflexo em O.S. (view `v_os_suprimentos_resumo`) — D20.SUP.6.
- Financeiro automático — fora de escopo D20.SUP.

## Próximo
**D20.SUP.3** — Aprovação via Workflow D5.1 (alçada `requisicao_suprimentos`) OU **D20.SUP.2.UI** se a prioridade for ter tela de Requisições antes da aprovação por alçada.
