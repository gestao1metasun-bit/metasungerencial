# D17.UI Onda 3 — Financeiro padrão RM/TOTVS (relatório executivo)

**Data:** 2026-05-29
**Status:** APLICADA.

## Entregas

- Novo helper reutilizável `src/components/app/financeiro/RmTabHeader.tsx`
  que monta `EnterpriseRecordToolbar` com `ribbonRm()` / `ribbonRmAprovacao()`
  + `layoutBarRm()` + ações canônicas (Novo, Editar, Cancelar, Atualizar,
  Anexos, Histórico, Exportar, Filtros, Colunas, Imprimir).
- Cabeçalho RM aplicado nas 7 abas pendentes do módulo Financeiro:
  - `LancamentosTabSupabase` — fita padrão, Novo abre dialog oficial, Atualizar invalida `lancamentos-derivados`.
  - `RecorrentesTabSupabase` (Despesas Fixas) — fita padrão, Novo abre dialog, Atualizar invalida `recorrentes-supabase`.
  - `AdiantamentosTabSupabase` — fita padrão, busca canônica reativa, Novo abre dialog, Atualizar invalida `adiantamentos`.
  - `RescisoesTabSupabase` — fita **Aprovação** (Aprovar/Reprovar/Baixar/Estornar), Novo gated por contratos elegíveis.
  - `RenegociacaoHistoricoListSupabase` — fita padrão + busca canônica.
  - `CentrosNaturezasTabSupabase` (Plano de Contas & Categorias) — fita padrão + atualizar combina 2 queries.
  - `ParametrosFinanceirosForm` — fita padrão, ação **Editar** dispara salvar (único botão semântico do form).
- Contas a Receber / Pagar mantidas como referência visual canônica (já no padrão).
- Operações Financeiras já estavam fechadas em **D17.UI.6** (RowActions por status,
  Processos, Aprovar, Liberar, Aprovar e Liberar, Cancelar, Estornar, Títulos gerados,
  Anexos, Histórico) — confirmadas visualmente sem nova alteração.

## Restrições respeitadas

Zero alteração em banco, RLS, RPCs, auditoria, workflow ou regras financeiras.
Apenas refatoração de UI/cabeçalho. Type-check limpo (`bunx tsc --noEmit` exit 0).

## Aderência

| Módulo | Antes | Agora |
|---|---|---|
| Financeiro (abas internas) | ~55% | **~88%** |
| Operações Financeiras | ~90% (D17.UI.6) | mantida |
| UX Enterprise Global | ~80% | **~84%** |

## Próximos

- D17.UI Onda 4 — Financiamentos (Contratos em financiamento / sem
  financiamento / Pendências / Finalizados / Cancelados).
- D17.UI Onda 5 — Suprimentos visual (Compras + Estoque sem fusão, por
  decisão do usuário).
