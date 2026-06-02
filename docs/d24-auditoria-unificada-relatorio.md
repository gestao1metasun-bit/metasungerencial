# D24 — Auditoria Enterprise Unificada

**Data:** 2026-06-02
**Status:** APLICADA
**Frontend + 1 migração (view).** Zero alteração de RLS, workflow, RPCs ou regras.

## Objetivo

Criar `/auditoria` como ponto único para responder, sobre qualquer alteração relevante do ERP:
quem fez, quando, o que mudou, em qual módulo, com qual criticidade, e abrir a origem.

## Entregas

1. **View `v_auditoria_unificada`** (`security_invoker = on`, read-only, GRANT só `authenticated`)
   consolidando 11 fontes auditáveis existentes:
   - `audit_log` (universal — triggers `tg_audit_row`)
   - `workflow_aprovacoes_historico`
   - `suprimentos_requisicao_eventos` / `_pedido_eventos` / `_cotacao_eventos` / `_recebimento_eventos`
   - `os_eventos`
   - `comercial_assinatura_eventos` / `_comissao_eventos`
   - `operacoes_financeiras_eventos`
   - `notificacoes` (priorities `ALTA`/`CRITICA`)

2. **Campos canônicos:** `id, modulo, entidade_tipo, entidade_id, acao, usuario_id,
   usuario_email, data_hora, origem, antes, depois, observacao, payload,
   criticidade, link_origem`.

3. **Criticidade derivada** por padrão de ação:
   - **CRÍTICA:** EXCLUSÃO, CANCELAMENTO, ESTORNO, ASSINATURA de contrato, COMISSÃO paga/cancelada/estornada.
   - **ALTA:** APROVAÇÃO, LIBERAÇÃO, REPROVAÇÃO, DEVOLUÇÃO, RESERVA, BAIXA, RECEBIMENTO confirmado.
   - **NORMAL:** edições / transições rotineiras.
   - **BAIXA:** demais eventos.

4. **Rota `/auditoria`** — `src/routes/auditoria.tsx`:
   - Cabeçalho + 4 KPIs (Eventos hoje, Críticos, Alta criticidade, Total carregado).
   - Cards "Usuários mais ativos" e "Módulos mais alterados".
   - Toolbar (Atualizar + Exportar CSV).
   - Filtros: busca livre, Módulo, Criticidade, ID da entidade, E-mail do usuário.
   - Tabela densa (8 colunas) com badge de criticidade colorido.
   - **RowActions:** `Visualizar` (azul, abre modal) e `Abrir origem` (índigo, navega).
   - Modal de detalhe com cabeçalho, observação e componente **AntesDepois**
     (`src/components/app/auditoria/AntesDepois.tsx`) que destaca campos
     adicionados (verde), removidos (rosa) e editados (âmbar), com fallback
     `<details>` para payload bruto.

5. **Repositório oficial** `src/lib/repositories/auditoria-repo.ts`
   - `useAuditoriaUnificada(filtros)` (TanStack Query, staleTime 30s).
   - `rotaDaOrigemAuditoria()` mapeia 9 famílias de origem para rotas internas.
   - `exportarCsvAuditoria()` gera CSV UTF-8 BOM com filtros aplicados.

6. **Navegação:** novo item `Auditoria Corporativa` em `nav-structure.ts`
   sob macro **Analytics**, tier **controle**, ordem 80, marcado `critica`.

## Segurança

- **Append-only por construção:** a view é `SELECT` puro, não há `INSERT/UPDATE/DELETE`.
- **RLS respeitada:** `security_invoker = on` faz cada UNION carregar apenas o que
  o usuário já enxerga nas tabelas-fonte (audit_log com policy `own_or_admin`;
  eventos de suprimentos exigem `suprimentos.*.visualizar`; etc.).
- `REVOKE ALL ... FROM PUBLIC, anon` + `GRANT SELECT TO authenticated`.
- Zero novas policies, zero novas RPCs, zero novo motor de auditoria.

## Auditoria de botões da tela

| Botão | Ação | Status |
|---|---|---|
| Atualizar | `refetch()` | ✅ |
| Exportar CSV | `exportarCsvAuditoria` | ✅ |
| Visualizar (linha) | Abre modal com diff | ✅ |
| Abrir origem (linha) | Navega para rota mapeada (toast quando sem rota) | ✅ |
| Fechar (modal) | Fecha | ✅ |
| Abrir origem (modal) | Mesmo navigate | ✅ |
| Filtros (Módulo / Criticidade / ID / e-mail / busca) | Reaplicam a query | ✅ |

Critério de aceite: nenhum botão visível sem ação ou sem mensagem clara. ✅

## Restrições respeitadas

- Não duplicou registros: cada linha vem com `id` prefixado por origem.
- Não criou motor próprio: reutilizou 11 fontes oficiais existentes.
- Não permitiu edição/exclusão: view read-only, sem CRUD na UI.
- Não alterou RLS de forma permissiva.

## Linter

230 → **238 WARN** (todos do padrão D14.2 já aceito: `search_path` em RPCs
DEFINER autenticadas + `extension in public`). Sem novas categorias.

## Próximos (fora deste D24)

- Coluna `usuario_nome` resolvida via `profiles` (requer FK ou cache local).
- Exportação PDF (atualmente CSV).
- Trigger automático para registrar comissão / financeiro extra em `audit_log`
  quando aplicável (hoje cobertos pelas `*_eventos` próprias).

**D24 concluído.** Próximo: D25 — Operação simulada ponta a ponta + Relatório Final de Maturidade.
