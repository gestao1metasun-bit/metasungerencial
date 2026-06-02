# D22 — Central de Aprovações Unificada

Data: 2026-06-02
Status: APLICADA

## Objetivo

Consolidar em uma única tela todas as aprovações pendentes do ERP (Workflow oficial + Suprimentos), sem criar motor novo, sem alterar RLS e sem bypass de RPC oficial.

## Entregas

### 1. View `v_aprovacoes_unificadas`
- security_invoker = on, GRANT SELECT a `authenticated`.
- Consolida 4 fontes oficiais:
  - `workflow_aprovacoes` (status PENDENTE) — `acao_via_rpc = true`.
  - `suprimentos_requisicoes` (ENVIADA, EM_APROVACAO).
  - `suprimentos_cotacoes` (ENVIADA, EM_ANALISE).
  - `suprimentos_pedidos_compra` (EMITIDO).
- Campos: chave, origem_modulo, origem_tipo, origem_id, titulo, descricao, status, prioridade (ALTA/MEDIA/NORMAL), valor, solicitante, aprovador, alçada, CC/CR/natureza, data_solicitacao, prazo_sla, dias_pendente, acao_via_rpc, link_origem, payload_resumo (jsonb).

### 2. Rota `/aprovacoes`
- Reaproveitada. Novo Tabs raiz:
  - **Visão Unificada** (default) — consome a view nova.
  - **Workflow corporativo** — fluxo D5.2 original (Pendentes para mim / Minhas / Histórico) intacto.

### 3. UI Visão Unificada (`src/modules/aprovacoes/UnificadaTab.tsx`)
- 4 StatCards: pendentes totais, aguardando minha alçada, vencidas, valor pendente.
- Filtros: busca, módulo, prioridade.
- Tabela densa 9 colunas com Badge de prioridade e flag de SLA vencido.
- Ações por linha:
  - **Workflow** → Aprovar (verde) / Reprovar (vermelho) inline via RPCs oficiais `aprovar_solicitacao` / `negar_solicitacao` (motivo ≥5 char p/ reprovar).
  - **Suprimentos / outros** → **Abrir origem** (link externo) — abre `/suprimentos#tab=requisicoes|cotacoes|pedidos`. Não há aprovação inline, regra de negócio fica no módulo.

### 4. Segurança e Governança
- Zero novo motor de workflow.
- Zero update direto de status.
- Zero alteração em RLS / policies.
- Toda mutação continua passando por RPC SECURITY DEFINER existente, respeitando flags `app.via_workflow_rpc` / `app.via_sup_*`.
- A view não esconde aprovações dos módulos de origem (apenas consolida leitura).

### 5. Repo
- `src/lib/repositories/aprovacoes-unificadas-repo.ts` — hook `useAprovacoesUnificadas` (React Query, staleTime 30s) + helper `rotaDaOrigem`.

## Auditoria de botões (Critério §7)

| Botão | Estado |
|---|---|
| Aprovar (Workflow) | RPC `aprovar_solicitacao` |
| Reprovar (Workflow) | RPC `negar_solicitacao` (motivo ≥5) |
| Abrir origem (Suprimentos) | navega `/suprimentos#tab=...` |
| Visualizar (Workflow) | abre detalhe na aba Workflow corporativo |
| Atualizar | refetch da view |
| Busca | filtro reativo |
| Filtro módulo | filtro reativo |
| Filtro prioridade | filtro reativo |

Nenhum botão visível sem ação funcional.

## Linter / Build

- Linter Supabase: 230 WARN (mesmo padrão pré-existente D14.2; +1 vs D21 = view nova).
- Typecheck: OK.

## Restrições respeitadas

- Não cria novo motor de workflow.
- Não altera RLS de forma permissiva.
- Não burla RPCs oficiais.
- Não aprova por update direto.
- Não duplica aprovações (view é UNION ALL com chaves distintas por origem).
- Não esconde pendências das telas originais.

## Critério de aceite

Gestor abre `/aprovacoes`, vê todas as aprovações pendentes do ERP em uma única fila, aprova/reprova com segurança quando há RPC oficial (Workflow), e abre origem quando exige contexto completo (Suprimentos). Cumprido.

## Próximo (D23)

Central de Notificações unificada.
