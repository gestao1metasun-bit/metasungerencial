# D6.13 — Enterprise Core Framework

Frente transversal para transformar o Meta Sun em plataforma ERP padronizada. **Não** abre módulo novo; consolida padrões, engines e governança que TODOS os módulos passarão a consumir.

Antes de começar a codar, preciso confirmar **escopo e ordem**, porque D6.13 inteiro é grande demais para uma única entrega — vai virar 7 subwaves (D6.13.1 → D6.13.7), cada uma publicável independente.

---

## Fase 0 — Validação Visual Enterprise Shell (pré-requisito, rápido)

Antes de qualquer engine nova, fechar o shell atual:

1. Varrer as 11 rotas macro (`/paineis`, `/leads`+`/propostas`, `/financeiro`, `/financiamentos`, `/cadastros` compras, `/engenharia`, `/estoque`, `/aprovacoes`, `/posvenda`, `/analytics`, `/configuracoes`) em 1920×1080.
2. Checar por módulo: macro ativo destacado, ribbon com grupos centralizados, contraste `--meta-bar`, ícones legíveis, toolbar alinhada, grid full width, sem sidebar fixa residual, sem overflow.
3. Entregar uma **tabela de divergências**: rota | componente | ajuste fino. Só corrigir o que estiver realmente quebrado — não mexer no que está OK.

Saída: relatório curto + (se necessário) 1 commit de hotfix visual.

---

## Fase 1 — D6.13.1 · Matriz EnterpriseEntity

Documento `docs/ENTERPRISE_ENTITY_MATRIX.md` listando as 10 entidades críticas (clientes, contratos, pedidos_venda, titulos_financeiros, obras, produtos, estoque_movimentos, aprovações, solicitações_material, ordens_compra) × 14 capacidades (id, código, status, origem, responsável, setor, timestamps, created_by, updated_by, deleted_at, motivo, auditoria, snapshot, anexos, comentários, flags, histórico, permissões, processos, lote, export, workflow).

Saída: matriz cheia/lacuna ✓/✗/parcial + priorização. **Sem código**. Vira backlog das ondas seguintes.

---

## Fase 2 — D6.13.2 · Componentes Framework

Consolidar/criar em `src/components/app/enterprise/`:

- `EntityHeader` — cabeçalho padrão de tela operacional (título, badges, breadcrumbs, ações primárias).
- `EntityStatusBadge` — wrapper sobre StatusBadge ligado ao status-catalog.
- `EntityTimeline` — extende HistoricoTimeline com filtros por tipo de evento.
- `AttachmentPanel` (stub) — UI polimórfica (engine real na fase 4).
- Re-export oficial: `EnterpriseToolbar`, `EnterpriseDataGrid`, `EnterpriseDialog`, `HistoricoDrawer`, `ProcessosMenu`, `FlagPicker`, `CommandPalette` via `index.ts` único.

**Sem regressão** nos módulos atuais: só novos componentes + barrel file.

---

## Fase 3 — D6.13.3 · Process Engine

`src/lib/process-engine.ts`:
- `registerProcess({entidade, id, label, permissao, requerSelecao, requerMotivo, workflow, handler})`
- `runProcess(id, ctx)` → valida permissão → valida seleção → coleta motivo se exigido → chama handler/RPC → audita via `audit-store`.
- Hook `useProcessos(entidade)` retorna lista filtrada por permissão pronta pro `ProcessosMenu`.

Migra **1 processo piloto** (renegociar título) pra provar o engine. Os demais migram nas waves dos módulos.

---

## Fase 4 — D6.13.4 · Attachment Engine

Tabela `anexos_polimorficos` (entidade_tipo, entidade_id, path, mime, size, uploaded_by, uploaded_at) + RLS por permissão da entidade. `AttachmentPanel` real plugado em Supabase Storage.

**Requer migration** — vou pedir aprovação antes de executar.

---

## Fase 5 — D6.13.5 · Saved Views / Advanced Filters

Tabela `user_saved_views` (user_id, entidade, nome, filtros jsonb, colunas jsonb, default bool). Hook `useSavedViews(entidade)` + UI no `EnterpriseToolbar` (dropdown "Visões").

**Requer migration.**

---

## Fase 6 — D6.13.6 · Timeline Único

View `v_entity_timeline` unificando audit_log + workflow_historico + anexos + comentários por entidade/id. `EntityTimeline` consome essa view.

---

## Fase 7 — D6.13.7 · Governança Transversal

`docs/GOVERNANCA_MATRIX.md`: Ação | Permissão | Workflow | Motivo | Auditável | Lote | Estornável — para as ~20 ações críticas. Vira contrato vinculante para todo processo registrado no Process Engine.

---

## Detalhes técnicos

- **Sem mock**: tudo Supabase + RPC + auditoria (regra de memória core).
- **Sem novo módulo** funcional: D6.13 é puro framework/engine.
- **Sem duplicar componente**: barrel file `enterprise/index.ts` é a porta oficial.
- **Status crítico nunca editável livre**: Process Engine é o único caminho.
- **Migrations** (fases 4, 5, 6): GRANT + RLS obrigatórios, aprovação por turno.

---

## O que preciso de você antes de começar

Duas decisões:

1. **Começo pela Fase 0 (validação visual) ou pulo direto para D6.13.1 (matriz)?**
   Recomendo Fase 0 primeiro — é rápida e o usuário já pediu explicitamente.

2. **Confirmo que D6.13 será entregue em 7 PRs/turnos separados** (um por subwave), não tudo de uma vez? Cada wave fecha um valor publicável.

Após sua resposta executo Fase 0 (ou D6.13.1) imediatamente.
