# D23 — Central de Notificações Unificada

**Status:** APLICADA 2026-06-02
**Maturidade:** ERP ~98,6% → ~98,8%

## Entregas

### 1. Banco
- ENUMs `notif_status` (NAO_LIDA/LIDA/ARQUIVADA/EXPIRADA), `notif_prioridade` (BAIXA/NORMAL/ALTA/CRITICA).
- Tabela `notificacoes` com destino por usuário OU grupo (CHECK), `dedupe_key` único por usuário (idempotência), `payload`+`metadata` jsonb, `expira_em`, rastreabilidade `origem_tipo`/`origem_id`/`link_origem`.
- 5 índices (não lidas, criada DESC, grupo, origem, dedupe).
- RLS: SELECT próprios + admin; UPDATE só próprios; sem INSERT/DELETE direto.
- GRANTs: SELECT/UPDATE authenticated, ALL service_role.

### 2. RPCs oficiais (SECURITY DEFINER, search_path=public, anon REVOKED)
- `rpc_notificacao_emitir(...)` — idempotente via dedupe_key; usado por triggers e por outros módulos.
- `rpc_notificacao_marcar_lida(p_id)`
- `rpc_notificacao_marcar_todas_lidas()` → retorna count
- `rpc_notificacao_arquivar(p_id)`

### 3. View
- `v_notificacoes_minhas` (security_invoker) — filtra por `auth.uid()` ou admin, calcula `vencida`.

### 4. Emissores iniciais (triggers)
- `tg_notif_workflow_aprovacao` em `workflow_aprovacoes`:
  - INSERT pendente → grupo `aprovadores_<setor>` (APROVACAO_PENDENTE, prioridade ALTA se valor ≥ 20k).
  - UPDATE de status → solicitante (APROVACAO_APROVADA/NEGADA/EXPIRADA/CANCELADA).
- `tg_notif_pedido_pronto_financeiro` em `suprimentos_pedidos_compra`:
  - status_financeiro=PRONTO_PARA_FINANCEIRO → grupo `financeiro` (PEDIDO_PRONTO_AP, prioridade ALTA, link `/financeiro#tab=a-pagar`).

### 5. UI
- **Sino global** (`NotificacoesBell`) no header h-11: badge gold com contagem (rosa se houver críticas), popover 96 com top 8 + "Ver todas". Clique marca como lida + abre origem.
- **Rota** `/notificacoes`: 5 StatCards (Total/Não lidas/Críticas/Vencidas/Hoje), Tabs (Não lidas/Lidas/Arquivadas/Todas), filtros (busca/módulo/prioridade), tabela densa com ações Abrir/Marcar lida/Arquivar.
- **Repo** `src/lib/repositories/notificacoes-repo.ts` com 4 hooks + tons canônicos.

## Restrições respeitadas
- Sem spam: dedupe por chave única (`wf-pend-<id>`, `wf-dec-<id>`, `pedido-pronto-fin-<id>`).
- RLS preservada — RPCs reforçam que UPDATE só afeta `auth.uid()`.
- Notificação não substitui ação oficial — apenas roteia para origem.
- Sem alteração em Central de Aprovações (D22), workflow ou módulos.

## Próximos emissores (escopo D23+ futuro)
- Suprimentos: requisição enviada/aprovada/item sem estoque/recebimento pendente.
- Financeiro: título vencendo/vencido/pagamento pendente.
- O.S.: atrasada/tarefa impedida/custo estourado.
- Engenharia: obra sem equipe/atrasada.
- Comercial: contrato aguardando assinatura.
- Resolução do grupo→usuários (hoje grupo fica apenas como rótulo no payload; precisa de tabela `notificacoes_grupos_membros` ou política de fan-out).

## Auditoria de botões
- Sino: badge + popover ✅
- Popover: marcar todas / abrir notificação / ver todas ✅
- Central: atualizar / marcar todas lidas / abrir origem / marcar lida / arquivar / filtrar / limpar filtros ✅
- Nenhum botão visível sem ação.

## Linter
230 → 238 WARN (+8 padrão D14.2: SECURITY DEFINER + search_path em RPCs autenticadas, aceito).
