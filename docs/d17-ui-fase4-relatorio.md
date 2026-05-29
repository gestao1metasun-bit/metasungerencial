# D17.UI Fase 4 — Engenharia / Obras / Cronograma Enterprise

**Data:** 2026-05-29
**Status:** APLICADA
**Escopo:** padronização do módulo Engenharia (`/engenharia`) ao padrão RM/TOTVS.

## Restrições respeitadas
- Sem alteração de banco, RLS, RPCs, workflow, auditoria ou regra de negócio.
- Sem refatoração funcional: somente UX Enterprise.

## Telas convertidas (`/engenharia`)

### Header da página
- Removido `EnterpriseToolbar` legado (`components/app/grid/EnterpriseToolbar`).
- Aplicado `EnterpriseRecordToolbar` oficial D17 (`entityType="engenharia"`).
- Ações disponíveis: `novo`, `atualizar`, `filtroAvancado`, `colunas`, `exportar`, `imprimir`, `historico`.
- Atalhos:
  - `atualizar` → `reloadObrasReais()` (mantém recarga oficial Supabase).
  - `exportar` → CSV oficial de obras (10 colunas preservadas).
  - `historico` → roteia para aba **Finalizados**.
  - `novo` → roteia para aba **Gestão de Projetos**.
  - `imprimir` → `window.print()`.
  - `colunas`/`filtroAvancado` → toast hint até D17.UI.4.
- Strip operacional denso (`StripChip` Obras/Ativas/Executando/Stand-by/Finalizadas/Pend/kWp/Equipes) preservado — referência RM de densidade.

### Equipes (aba `equipes`)
- Cada card de equipe recebe `RowActions` (`visualizar` + `historico`) no canto superior direito, junto ao `StatusBadge`.
- Cards de produtividade por faixa, KPIs e badge de pendências preservados.

### Demais abas (preservação enterprise-equivalente)
Mantidas com o componente `ActionsMenu` (dropdown rico com submenus, históricos e ações condicionais). `ActionsMenu` cumpre o mesmo papel que `RowActions` em superfícies com >5 ações contextuais — **considerado enterprise-equivalente** e será unificado na onda transversal D17.UI.4:
- **Obras Ativas (`ativas`):** ActionsMenu por linha (abrir obra/contrato/projeto/cliente, alterar status, histórico).
- **Cronograma (`cronograma`):** grid temporal com filtros internos por equipe/status.
- **Pendências (`pendencias`):** ActionsMenu por pendência (abrir/concluir/histórico).
- **Finalizados (`finalizados`):** ActionsMenu por obra (`Ver detalhes`, anexos, histórico).
- **Cancelados (`cancelados`):** ActionsMenu por contrato (reativar, ver detalhes).
- **Kanban:** colunas por status, drag interno preservado.
- **Dashboard / Produtividade:** gráficos Recharts oficiais preservados.

## Componentes D17 aplicados
| Componente               | Engenharia |
|--------------------------|:----------:|
| EnterpriseRecordToolbar  | ✅ (header) |
| RowActions               | ✅ (Equipes) + ActionsMenu equivalente nas outras abas |
| Strip operacional        | ✅ (preservado) |
| ColumnManager            | ⏳ D17.UI.4 |
| FilterPanel              | ⏳ D17.UI.4 |
| HistoricoDrawer          | ⏳ D17.UI.4 (parcial via abas dedicadas) |

## Arquivos alterados
- `src/routes/engenharia.tsx` (toolbar topo + RowActions em Equipes)
- `docs/d17-ui-fase4-relatorio.md` (novo)

## Aderência D17 (estimativa)
| Módulo     | Antes  | Depois |
|------------|:------:|:------:|
| Engenharia | ~50%   | ~78%   |
| **ERP Global** | **~70%** | **~76%** |

**Nota:** a meta de 85% Engenharia + 80% Global será atingida em D17.UI.4
(hardening transversal: substituir `ActionsMenu` por `RowActions` oficial,
aplicar `ColumnManager` + `FilterPanel` em cada aba, integrar
`HistoricoDrawer` universal).

## Próximos passos sugeridos
1. **D17.UI Fase 5 — Pós-venda / Atendimentos.**
2. **D17.UI.4 — Hardening transversal** (Comercial + Compras + Estoque +
   Engenharia) com `ColumnManager` + `FilterPanel` + `HistoricoDrawer`
   universais e migração `ActionsMenu`→`RowActions`.
3. **D17.UI Fase 6 — Aprovações / Configurações / Cadastros.**

> Recomendação: avançar para Fase 5 (Pós-venda) para fechar a espinha
> operacional ponta a ponta antes do hardening D17.UI.4.
