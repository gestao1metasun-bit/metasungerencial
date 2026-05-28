# D17.UI 98% — Relatório de Aderência Enterprise RM/TOTVS
**Data:** 2026-05-28  
**Sprint:** Sprint 1 (Fundação) concluído; Sprint 2 (conversão dos 11 módulos) **NÃO concluído**.

---

## 1. O que foi entregue nesta onda (Sprint 1)

### Helpers oficiais (barrel `@/components/app/enterprise`)
| Componente | Status |
|---|---|
| `EnterprisePageShell` | **NOVO** — casca 3 linhas (header / toolbar / strip + grid) |
| `useEnterpriseGrid` | **NOVO** — orquestrador paginação+colunas+seleção+densidade+layout+filtros |
| `EnterpriseRecordToolbar` | existente (D6.13.2b) — pronto para todas as 11 entidades |
| `EnterpriseDataGrid` | existente |
| `RowActions` | existente (D17.UI.1) |
| `ColumnManager` + `useColumnPrefs` | existente |
| `FilterPanel` | existente |
| `BulkActionBar` + `useRowSelection` | existente (D17.UI.3) |
| `ServerPaginationFooter` + `useServerPagination` | existente (D14.5) |
| `AttachmentPanel` + `AnexosButton` | existente |
| `HistoricoDrawer` | existente |
| `ProcessosMenu` | existente |
| `EntityHeader` / `EntityStatusBadge` / `EntityTimeline` | existente |

**Resultado:** kit completo para qualquer tela ser convertida sem inventar componente novo.

---

## 2. Matriz de aderência por módulo (situação real)

| # | Módulo | Toolbar 3 linhas | Grid Enterprise | RowActions | ColumnManager | FilterPanel | Bulk | Server Pagination | Anexos | Histórico | Processos | **% aderente** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Financeiro (Títulos) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **100%** |
| 2 | Financeiro (Adiantamentos) | ✅ | ✅ | ✅ | parcial | parcial | ❌ | ✅ | ✅ | ✅ | parcial | **80%** |
| 3 | Estoque | ✅ | ✅ | ✅ | ✅ | ✅ | parcial | ✅ | parcial | ✅ | ✅ | **90%** |
| 4 | Comercial / Leads | parcial | parcial | ❌ | ❌ | ❌ | ❌ | ❌ | parcial | parcial | ❌ | **25%** |
| 5 | Comercial / Propostas | parcial | parcial | ❌ | ❌ | ❌ | ❌ | ❌ | parcial | parcial | ❌ | **25%** |
| 6 | Contratos | parcial | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | parcial | parcial | ❌ | **15%** |
| 7 | Pedido de Venda | parcial | parcial | ❌ | ❌ | ❌ | ❌ | ❌ | parcial | parcial | parcial | **25%** |
| 8 | Compras / Solicitações | parcial | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | parcial | ❌ | **10%** |
| 9 | Engenharia | parcial | parcial | ❌ | ❌ | ❌ | ❌ | ❌ | parcial | parcial | ❌ | **25%** |
| 10 | Ordem de Serviço | ❌ — entidade não materializada ainda | | | | | | | | | | **0%** |
| 11 | Financiamentos | parcial | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | parcial | parcial | ❌ | **15%** |
| 12 | Aprovações | ✅ | ✅ | parcial | parcial | parcial | ❌ | parcial | n/a | ✅ | ✅ | **75%** |
| 13 | Pós-venda | ❌ — esqueleto, sem grid operacional | | | | | | | | | | **5%** |
| 14 | Configurações | ❌ — formulários pontuais, sem padrão grid | | | | | | | | | | **N/A** |

**Média ponderada por uso operacional:** **~42%** padrão RM/TOTVS aderente.

---

## 3. Veredito UI Enterprise 98%

**Atingiu 98%?** **NÃO.**  
- Atingiu **~42%** real ponderado.  
- Fundação (Sprint 1) chegou a 100%: helpers + shell + hook universal estão prontos para colar nas telas.  
- Conversão das 11 telas é trabalho do **Sprint 2** (estimado em 30-40 arquivos editados, 6-10 ondas adicionais por módulo).

---

## 4. Próximos passos para fechar 98% UI

Cada módulo é uma onda fechável usando o helper `useEnterpriseGrid` + `EnterprisePageShell`:

```tsx
const grid = useEnterpriseGrid<ContratoRow>({
  entity: "contratos",
  columns: CONTRATOS_COLS,
  pagination: { table: "contratos", select: "id, numero, cliente_id, valor, status", softDeleteColumn: "deleted_at" },
  getId: (r) => r.id,
});

<EnterprisePageShell
  title="Contratos"
  subtitle={`${grid.total} registros`}
  toolbar={<EnterpriseRecordToolbar entityType="contratos" ... />}
>
  <EnterpriseDataGrid columns={grid.columns.visibleKeys.map(...)} data={grid.rows} />
  <ServerPaginationFooter {...grid.pagination} />
</EnterprisePageShell>
```

**Ordem recomendada (impacto operacional):**
1. Contratos (D17.UI.2)
2. Pedido de Venda (D17.UI.3a)
3. Comercial — Propostas e Leads (D17.UI.3b)
4. Compras / Solicitações (D17.UI.4a)
5. Engenharia (D17.UI.4b)
6. Financiamentos (D17.UI.5a)
7. Aprovações — fechar 25% restante (D17.UI.5b)
8. Pós-venda e OS (após D11)
9. Configurações (último, padrão diferente)

**Esforço estimado:** 8-12 ondas curtas, ~3-5 arquivos por onda.

---

## 5. Restrições respeitadas

- ✅ Zero RPC nova
- ✅ Zero tabela nova
- ✅ Zero alteração de RLS / auditoria
- ✅ Zero LS operacional (somente `ui.*`)
- ✅ Zero regra de negócio

---

## 6. Arquivos novos

- `src/components/app/enterprise/EnterprisePageShell.tsx`
- `src/lib/ui/use-enterprise-grid.ts`
- `src/components/app/enterprise/index.ts` (barrel atualizado)
