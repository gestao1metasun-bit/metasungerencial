
# D17.UI — Padrão UI Enterprise RM/TOTVS oficial

## Diagnóstico rápido

Boa parte do padrão já existe e está consolidado no barrel `@/components/app/enterprise`:

- `EnterpriseToolbar` — barra superior (Novo / Editar / Aprovar / Cancelar / Atualizar / Filtrar / Exportar / Imprimir / Histórico / Anexos / Processos / Mais ações).
- `EnterpriseRecordToolbar` — variante RM (azul Novo, verde Salvar/Aprovar, vermelho Excluir/Cancelar, ícones puros, Anexos em pílula azul, Processos em pílula verde, Filtros em pílula índigo, Colunas/Visões à direita).
- `EnterpriseDataGrid` — grid denso, seleção individual/lote, ordenação, paginação.
- `ProcessosMenu` — dropdown de processos por módulo.
- `HistoricoDrawer`, `AnexosButton`, `AttachmentPanel`, `EntityTimeline`, `EntityStatusBadge`, `GovernedActionButton`, `ServerPaginationFooter`.

**Lacunas reais** (o que esta onda fecha):

1. **`RowActions`** — botão de ações por linha padrão único (lápis/olho/clipe/relógio/X/lixeira) com cores azul/verde/vermelho/cinza. Hoje só existe `TituloRowActions` específico de Títulos.
2. **`ColumnManager`** — livrinho que mostra/oculta, reordena, salva preferência em LS e restaura padrão.
3. **`FilterPanel`** — painel padronizado (rápido + avançado: status, período, responsável, busca, limpar).
4. **Diretriz oficial** — `docs/ui-enterprise-padrao-rm.md` + memory `mem://design/d17-ui-enterprise-rm` definindo regra de pedra para toda tela operacional nova.

## Escopo desta onda (D17.UI.1)

Criar componentes base + diretriz + aplicar no **Financeiro/TitulosTabSupabase** como referência canônica. Demais módulos seguem em D17.UI.2..N (sob demanda).

### Arquivos novos

```
src/components/app/enterprise/RowActions.tsx       # ações por linha (azul/verde/vermelho/cinza)
src/components/app/enterprise/ColumnManager.tsx    # mostra/oculta/reordena + LS por usuário+entidade
src/components/app/enterprise/FilterPanel.tsx      # rápido + avançado (status/período/responsável)
src/lib/ui/column-prefs.ts                          # helper LS ui.cols.{user}.{entity}.v1
docs/ui-enterprise-padrao-rm.md                    # diretriz oficial
mem://design/d17-ui-enterprise-rm                  # memory rule
```

### Arquivos editados

```
src/components/app/enterprise/index.ts             # re-export dos 3 novos
src/modules/financeiro/TitulosTabSupabase.tsx      # adota RowActions + ColumnManager + FilterPanel (referência)
.lovable/plan.md                                    # registra D17.UI
mem://index.md                                      # entrada da nova memory
```

## Especificação dos componentes

### `RowActions`

Botão composto que aparece na primeira coluna sticky do grid. Recebe array tipado:

```
type RowActionKind = "visualizar"|"editar"|"duplicar"|"excluir"|"cancelar"
                   |"anexos"|"historico"|"auditoria"|"aprovar"|"reprovar";

<RowActions
  rowId={t.id}
  permissions={perms}
  actions={[
    { kind: "visualizar" },
    { kind: "editar", permissao: "financeiro.editar" },
    { kind: "anexos", badgeCount: t.qtd_anexos },
    { kind: "historico" },
    { kind: "cancelar", permissao: "financeiro.movimentar", confirm: true },
  ]}
  onAction={(kind, rowId) => ...}
/>
```

Visual: ícones h-3.5, h-7 w-7, cores tom-on-hover: azul (visualizar/anexos), âmbar (editar), índigo (histórico/auditoria), verde (aprovar), vermelho (excluir/cancelar/reprovar), cinza (duplicar). Sem texto, só ícone + tooltip. Botões inline + opcional dropdown “⋯” para overflow.

### `ColumnManager`

Botão livrinho (`Columns3`) + popover. Recebe lista de colunas com `key/label/defaultVisible/locked`. Permite toggle, drag-reorder, “Restaurar padrão”. Persiste em `ui.cols.{userEmail}.{entityType}.v1`. Hook companion `useColumnPrefs(entityType, defaults)` retorna `{visibleKeys, order, setVisible, reorder, reset}`.

### `FilterPanel`

Trigger pílula índigo “Filtros: {resumo}”. Sheet/popover com slots: status (multi-select), período (range), responsável (combobox), busca (texto), + slot extra. “Aplicar” / “Limpar”. Estado controlado pelo consumidor; persistência LS opcional (`ui.filters.{entity}.v1`).

## Regras de pedra (memory `d17-ui-enterprise-rm`)

- Toda tela operacional nova OBRIGATÓRIA usar `EnterpriseRecordToolbar` + `EnterpriseDataGrid` + `RowActions` + `ColumnManager` + `FilterPanel` do barrel `@/components/app/enterprise`.
- Proibido criar `<table>` cru ou Toolbar custom em telas listadas no escopo (Financeiro, Comercial, Contratos, PVs, Compras, Estoque, Engenharia, OS, Aprovações, Pós-venda, Configurações, Formulários).
- Cores canônicas: **azul=criar/visualizar/anexos**, **verde=salvar/aprovar/avançar/baixar**, **vermelho=excluir/cancelar/reprovar/estornar**, **âmbar=editar**, **índigo=histórico/auditoria/filtros**, **cinza=neutro**.
- Preferências de coluna/filtros podem ficar em LS (UI apenas) com prefixo `ui.`. Nunca persistir dado operacional em LS.
- Backend, RLS, auditoria, workflow: **NÃO TOCAR** nesta onda. Apenas casca visual.

## Critério de aceite

- 3 componentes novos compilam, exportados pelo barrel, com tipos.
- `TitulosTabSupabase` adota os 3 sem perder nenhuma funcionalidade existente (Receber/Pagar, RPC baixar, audit, filtros atuais).
- Doc + memory publicados. Plano D17.UI registrado.
- Demais módulos ficam para D17.UI.2 (com prioridade Financeiro → Comercial → PV/Contratos → Compras/Estoque → Engenharia/OS → Configurações).

## Riscos

- Refator do TitulosTabSupabase pode regredir filtros se mal feito → aplico mudança aditiva (RowActions na 1ª coluna + ColumnManager no slot direito + FilterPanel substitui filtros inline antigos só se equivalência total).
- LS de colunas precisa namespacing por usuário pra não vazar entre contas.

Aguardo aprovação para executar.
