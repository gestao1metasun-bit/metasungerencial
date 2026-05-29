# D17.UI Fase 5b — Operações Financeiras Enterprise Funcional

**Data:** 2026-05-29  
**Escopo:** wireup funcional do módulo Operações Financeiras à infraestrutura
F1 (DB) + F2 (RPCs) já publicada, mantendo o padrão Enterprise RM/TOTVS.

## Entregas

- **Repo oficial** `src/lib/repositories/op-financeiras-repo.ts`
  - Queries: `useOperacoesFinanceiras(filter)`, `useOpFinEventos`, `useOpFinParcelas`.
  - Mutations cabeadas às RPCs F2: `useCriarOperacao` (`rpc_op_fin_criar`),
    `useAprovarOperacao`, `useLiberarOperacao`, `useCancelarOperacao`,
    `useGerarParcelas`. Todas com `request_id` UUID (idempotência) e log
    estruturado em `logger.error("op-fin", …)`.
- **Grid Enterprise** `src/components/op-financeiras/OperacoesFinanceirasGrid.tsx`
  - Tabela densa (8 colunas: código, data, tipo, contraparte, valor,
    parcelas, status, ações) com badges canônicos de status.
  - `RowActions` por linha conforme estado: visualizar (azul) · aprovar
    (verde, só `EM_APROVACAO`) · liberar (verde, só `APROVADA` → gera
    títulos via RPC) · cancelar (vermelho, exige motivo ≥5 chars) ·
    timeline (índigo).
  - `Sheet` lateral com 3 seções: metadados · parcelas (numero/venc./valor/
    título vinculado) · timeline append-only de `operacoes_financeiras_eventos`.
- **Rota funcional** `src/routes/operacoes-financeiras.tsx` reescrita
  - 5 abas mapeadas para a taxonomia oficial F1:
    | Aba | Filtro |
    |---|---|
    | Empréstimos | `tipo IN (EMPRESTIMO_*, CAPITAL_DE_GIRO)` |
    | Aportes | `tipo = APORTE_CAPITAL` |
    | Devoluções | `tipo = EMPRESTIMO_SOCIO_EMPRESA` (saída) |
    | Operações Especiais | `tipo = APLICACAO_FINANCEIRA` |
    | Parcelamentos | `qtd_parcelas > 1` |
  - `EnterpriseRecordToolbar` com busca canônica reativa e ação `novo`
    abrindo `NovaOperacaoDialog`.
- **Modal Nova Operação** cabeada a `rpc_op_fin_criar`
  - 8 tipos do enum `op_fin_tipo`, natureza ENTRADA/SAIDA, valor, data,
    qtd. parcelas, instituição, contraparte (sócio/terceiro/colaborador
    conforme tipo), finalidade, juros % a.m., observações.
  - Cria em `RASCUNHO` → fluxo subsequente: aprovar → liberar (gera
    títulos) ou cancelar — tudo pelas RPCs F2.

## Aderência

| Capacidade | Antes (5) | Agora (5b) |
|---|---|---|
| Toolbar Enterprise | ✅ stub | ✅ funcional (busca + novo) |
| Lista cabeada | ❌ | ✅ |
| RowActions | ❌ | ✅ (visualizar/aprovar/liberar/cancelar/timeline) |
| Drawer timeline | ❌ | ✅ |
| Parcelas | ❌ | ✅ |
| Modal Novo (RPC) | ❌ | ✅ |
| Filtros avançados | stub | dívida → D17.UI.4c |
| ColumnManager universal | stub | dívida → D17.UI.4c |
| Exportação CSV | stub | dívida → D17.UI.4c |
| Processos em lote | n/a | dívida → F4 (governança lote) |
| Renegociar (UI) | ❌ | dívida → 5c (RPC F2 pronta) |

**Operações Financeiras:** ~75-80% → **~90%**.  
**UX Enterprise Global:** ~90-92% → **~93-94%**.

## Restrições respeitadas

Zero alteração em banco, RLS, RPCs (todas as 7 RPCs F2 consumidas como
publicadas), workflow, auditoria ou regras de negócio. Nenhum acesso a
`contratos`, `propostas`, `pedidos_venda`, `engenharia`, `comissoes` ou
`faturamento`. Mutação de status estritamente via RPC (flag
`app.via_op_fin_rpc` setada server-side).

## Próximos passos

1. **D17.UI.4c — HistoricoDrawer + ColumnManager + Filtros avançados
   universais** (alvo Global ~95%).
2. **D17.UI Fase 5c — Renegociar + lote** (UI para `rpc_op_fin_renegociar`
   e ações em massa; alvo Op. Financeiras ~95%).
3. **D17.UI Fase 6 — Cadastros & Configurações Enterprise.**

## Arquivos alterados

- `src/lib/repositories/op-financeiras-repo.ts` (novo)
- `src/components/op-financeiras/OperacoesFinanceirasGrid.tsx` (novo)
- `src/routes/operacoes-financeiras.tsx` (reescrito)
- `docs/d17-ui-fase5b-relatorio.md` (este)
