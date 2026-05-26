
# Onda C — Fundação PV (Pedido de Venda)

## Pré-requisito bloqueante

Confirmar Onda B antes de iniciar:

1. App publicado em `https://metasungerencial.lovable.app/login` abre sem o toast `Missing Supabase environment variable(s)`.
2. Login com `renanbarc16@gmail.com` mostra **RENAN BARCELOS** no header (não "Visitante").
3. `/engenharia` mostra banner `sessão: OK` e `obras reais RLS >= 1`.

Se qualquer item falhar, eu paro a Onda C e voltamos à Onda B.

## Escopo desta onda (apenas PV)

Ondas D–I ficam para depois. Esta onda entrega só a fundação transacional do Pedido de Venda e a ponte Contrato→Projeto→PV→Obra.

## Entregáveis

### 1. Tabela `pedidos_venda`

Campos:
- `id uuid pk default gen_random_uuid()`
- `codigo text unique` (gerado: `PV-YYYYMMDD-<6hex>`)
- `contrato_id uuid not null` (FK lógica para `contratos.id`)
- `projeto_contrato_id uuid` (FK lógica para `projetos_contrato.id`)
- `obra_id uuid` (preenchido quando a obra é gerada)
- `cliente_id uuid not null`
- `consultor_id uuid not null`
- `status text not null default 'RASCUNHO'`
- `valor_total numeric(14,2) not null default 0`
- `forma_pagamento text` (`vista | parcelado | financiamento | permuta | misto`)
- `possui_financiamento boolean not null default false`
- `financiamento_banco text`
- `financiamento_valor numeric(14,2)`
- `gerente_id uuid`
- `observacoes text`
- `dados jsonb not null default '{}'::jsonb`
- `aprovado_em timestamptz`, `aprovado_por uuid`
- `cancelado_em timestamptz`, `motivo_cancelamento text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`, `deleted_reason text`, `deleted_by uuid`

Índices: `(contrato_id)`, `(projeto_contrato_id)`, `(obra_id)`, `(consultor_id)`, `(status)`.

### 2. Tabela `pedidos_venda_status_historico`

Campos: `id`, `pedido_id`, `status_anterior`, `status_novo`, `motivo`, `user_id`, `user_email`, `created_at`.
Preenchida por trigger a cada UPDATE de `status`.

### 3. Máquina de estados

Estados: `RASCUNHO`, `EM_ANALISE`, `APROVADO`, `EM_EXECUCAO`, `FATURADO`, `FINALIZADO`, `CANCELADO`.

Transições válidas (trigger `tg_pv_valida_transicao`, bloqueia o resto com `42501`):

```text
RASCUNHO     -> EM_ANALISE | CANCELADO
EM_ANALISE   -> APROVADO | RASCUNHO | CANCELADO
APROVADO     -> EM_EXECUCAO | CANCELADO
EM_EXECUCAO  -> FATURADO | CANCELADO
FATURADO     -> FINALIZADO
FINALIZADO   -> (nenhuma; apenas admin pode reabrir)
CANCELADO    -> (nenhuma; apenas admin pode reabrir)
```

`is_admin(auth.uid())` ignora as restrições (modo exceção).

### 4. RLS

Espelha o padrão `obras` / `contratos`:
- `pv_select`: `is_admin(auth.uid()) OR consultor_id = auth.uid()`
- `pv_insert`: `is_admin OR consultor_id = auth.uid()`
- `pv_update`: `is_admin OR consultor_id = auth.uid()`
- `pv_delete`: somente `is_admin`
- Histórico: SELECT próprio/admin; INSERT só via trigger (`with check true`); sem UPDATE/DELETE.

GRANTs explícitos para `authenticated` e `service_role` (sem `anon`).

### 5. Auditoria

Triggers reaproveitando funções existentes:
- `tg_audit_row('comercial','pedidos_venda')` em INSERT/UPDATE/DELETE.
- `tg_snapshot_version` em INSERT/UPDATE para `entidade_versoes`.
- `tg_set_updated_at_generic` em UPDATE.
- `tg_pv_status_historico` em UPDATE quando `OLD.status <> NEW.status`.

### 6. RPC `gerar_pv_do_contrato(_contrato_id uuid, _projeto_contrato_id uuid default null)`

Comportamento:
- Verifica permissão (consultor dono do contrato ou admin).
- Se `_projeto_contrato_id` nulo, usa o primeiro `projetos_contrato` APROVADO do contrato.
- Cria `pedidos_venda` em `RASCUNHO` com `cliente_id`, `consultor_id`, `valor_total = projetos_contrato.valor`, `forma_pagamento`/`financiamento*` herdados do contrato.
- Idempotente: se já existir PV não-cancelado para `(contrato_id, projeto_contrato_id)`, retorna o existente.
- Retorna `uuid` do PV.

### 7. RPC `aprovar_pv(_pv_id uuid, _motivo text default null)`

- Valida `status = 'EM_ANALISE'`.
- Atualiza `status='APROVADO'`, `aprovado_em=now()`, `aprovado_por=auth.uid()`.
- Não dispara geração de títulos financeiros nesta onda (fica para Onda D).

### 8. RPC `enviar_pv_para_engenharia(_pv_id uuid)`

- Exige `status='APROVADO'`.
- Reaproveita `enviar_projeto_para_engenharia(projeto_contrato_id)` para gerar a `obra`.
- Grava `obra_id` no PV e transiciona PV para `EM_EXECUCAO`.

### 9. Frontend mínimo (sem refino visual)

- Página `/pedidos-venda` (lista + criar a partir de contrato).
- Modal "Pedido de Venda" com tabs: Resumo / Pagamento / Engenharia / Histórico.
- Botões: "Enviar para análise", "Aprovar" (admin/gerente), "Enviar para engenharia", "Cancelar".
- Hook `usePedidosVenda` com TanStack Query e `invalidateQueries` em mutações.
- Tudo via `supabase` client + RPCs; sem mock, sem array hardcoded.

### 10. Bridge UUID rastreável

- `contratos.id` → `projetos_contrato.contrato_id` → `pedidos_venda.projeto_contrato_id` → `pedidos_venda.obra_id` → `obras.id`.
- View read-only `vw_bridge_pv` para diagnóstico operacional (`contrato_codigo, projeto_id, pv_id, pv_status, obra_codigo, obra_status`).

## Fora de escopo desta onda (explícito)

- Geração de `titulos_financeiros` → Onda D.
- Refactor de Engenharia para drag-and-drop persistido → Onda E.
- Cadastros estruturais (bancos, gerentes, naturezas) → Onda F.
- State machine central genérica → Onda G.

## Validação obrigatória ao final

1. `INSERT` direto via UI cria PV em `RASCUNHO` e aparece em `entidade_versoes`/`audit_log`.
2. Transição `RASCUNHO → APROVADO` direta é bloqueada com `42501`.
3. Fluxo `RASCUNHO → EM_ANALISE → APROVADO → EM_EXECUCAO` funciona e cria obra real ligada por `obra_id`.
4. `pedidos_venda_status_historico` tem 1 linha por transição.
5. Consultor A não vê PV do consultor B; admin vê tudo.
6. `vw_bridge_pv` retorna a cadeia completa para o contrato de teste.

## Detalhes técnicos

- Migração única com `CREATE TABLE` + `GRANT` + `ENABLE RLS` + `CREATE POLICY` + funções + triggers, na ordem exigida.
- Funções marcadas `SECURITY DEFINER` com `SET search_path = public`.
- Sem CHECK constraints temporais (usar triggers conforme guideline).
- Sem alteração em `auth`, `storage`, `realtime`.
- Frontend toca apenas: `src/routes/pedidos-venda*.tsx`, `src/components/pv/*`, `src/hooks/usePedidosVenda.ts`, `src/lib/pv.ts`. Não mexe em Engenharia, AppLayout, auth-store, repositories existentes.

## Ordem de execução

1. Migração SQL (você aprova) → executo.
2. Tipos Supabase regenerados → aguardo.
3. Hook + RPC wrappers + página + modal.
4. Validação operacional na preview com o roteiro acima.
5. Republicar e validar no published.
6. Só então abrir plano da Onda D.
