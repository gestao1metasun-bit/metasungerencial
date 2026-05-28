# D17.UI — Padrão UI Enterprise RM/TOTVS oficial

**Status:** ATIVO (D17.UI.1 aplicada 2026-05-28)
**Escopo:** toda tela operacional do ERP Meta Sun.

## Regra de pedra

Toda tela operacional nova é **obrigatoriamente** construída com os componentes do barrel:

```ts
import {
  EnterpriseRecordToolbar, EnterpriseDataGrid, EnterpriseDialog,
  RowActions, ColumnManager, FilterPanel, useColumnPrefs,
  HistoricoDrawer, AnexosButton, ProcessosMenu,
  ServerPaginationFooter, useServerPagination,
} from "@/components/app/enterprise";
```

Proibido criar `<table>` cru, Toolbar custom, ou ações por linha avulsas em telas listadas em **Escopo de adoção**.

## Cores canônicas (padrão RM)

| Ação | Cor | Token |
|------|-----|-------|
| Novo / Visualizar / Anexos | azul | `text-sky-600` / `bg-sky-50` |
| Editar | âmbar | `text-amber-600` |
| Salvar / Aprovar / Avançar / Baixar | verde | `text-emerald-600` |
| Excluir / Cancelar / Reprovar / Estornar | vermelho | `text-red-600` |
| Histórico / Auditoria / Comentários / Filtros / Colunas | índigo | `text-indigo-600` / `text-indigo-700` |
| Duplicar / Neutro | cinza | `text-slate-500` |

## Anatomia de uma tela enterprise

```
┌──────────────────────────────────────────────────────────────┐
│ EnterpriseRecordToolbar (Novo · Editar · Salvar · Excluir …)│
│   + Anexos (pílula azul) · Processos (pílula verde) ·       │
│     Filtros (pílula índigo) · Colunas (índigo) · Exportar   │
├──────────────────────────────────────────────────────────────┤
│ FilterPanel (popover) | ColumnManager (popover)             │
├──────────────────────────────────────────────────────────────┤
│ EnterpriseDataGrid                                          │
│ ┌──┬──────┬─────────┬───────┬────────────────┐              │
│ │☐ │ Cód  │ ...     │ Status│ RowActions ←   │ ← lápis/X/  │
│ │  │      │         │       │ ícones color   │   olho/clipe│
│ └──┴──────┴─────────┴───────┴────────────────┘              │
│ ServerPaginationFooter                                      │
└──────────────────────────────────────────────────────────────┘
```

## Componentes desta onda (D17.UI.1)

### `<RowActions />`

Ações por linha, padrão único. Aceita até N ações + overflow no dropdown ⋯.

```tsx
<RowActions
  rowId={r.id}
  permissions={perms}
  actions={[
    { kind: "visualizar" },
    { kind: "editar", permissao: "financeiro.editar" },
    { kind: "baixar", label: "Receber", disabled: r.status === "RECEBIDO" },
    { kind: "anexos", badgeCount: r.qtd_anexos },
    { kind: "historico" },
    { kind: "cancelar", overflow: true },
  ]}
  onAction={(kind, id) => /* dispatcher */}
/>
```

### `<ColumnManager />` + `useColumnPrefs`

Livrinho de colunas (mostrar/ocultar/reordenar/restaurar). Persistência LS namespaced.

```tsx
const COLS: ColumnDef[] = [
  { key: "codigo", label: "Código", locked: true },
  { key: "origem", label: "Origem" },
  { key: "documento", label: "Documento", defaultVisible: false },
  { key: "vencimento", label: "Vencimento" },
  { key: "status", label: "Status" },
];
const prefs = useColumnPrefs("titulos_financeiros", COLS, user?.email);

<ColumnManager entity="titulos_financeiros" columns={COLS} prefs={prefs} />

{prefs.visibleKeys.map((k) => /* render TH */)}
```

LS key: `ui.cols.{email}.{entity}.v1` (prefixo `ui.cols.` é permitido pelo ls-guard).

### `<FilterPanel />`

Pílula índigo + popover com slots padronizados (busca, status, período, responsável, extra).

```tsx
<FilterPanel
  resumo={resumo} ativos={countAtivos}
  busca={busca} onBuscaChange={setBusca}
  dataInicio={di} dataFim={df} onPeriodoChange={(a, b) => { setDi(a); setDf(b); }}
  statusSlot={<Select>...</Select>}
  responsavelSlot={<Select>...</Select>}
  onAplicar={refetch} onLimpar={resetFiltros}
/>
```

## Processos canônicos por módulo (referência rápida)

| Módulo | Processos típicos |
|--------|-------------------|
| **Financeiro** | baixar · estornar · renegociar · conciliar · gerar cobrança · cancelar |
| **Comercial** | aprovar · revisar · assinar · transferir carteira · cancelar |
| **Estoque** | entrada · saída · reserva · transferência · inventário · ajuste |
| **Engenharia/OS** | iniciar · pausar · finalizar · checklist · anexar fotos |
| **Compras** | cotar · aprovar · emitir pedido · receber · cancelar |
| **Aprovações** | aprovar · reprovar · solicitar mais info · avançar etapa |

Cada processo entra como `EnterpriseProcessItem` no `EnterpriseRecordToolbar` **ou** como `RowActionKind` (aprovar/reprovar/baixar/estornar) quando a operação é registro-a-registro.

## Escopo de adoção (prioridade)

1. **Financeiro** (Títulos, Adiantamentos, Boletos, Conciliação) — D17.UI.1 inicia em `TitulosTabSupabase` ✅
2. **Comercial** (Leads, Propostas, Carteira)
3. **Contratos / Pedidos de Venda**
4. **Compras / Estoque**
5. **Engenharia / OS**
6. **Aprovações / Pós-venda / Configurações / Formulários**

Cada adoção é uma subwave **D17.UI.N** independente.

## Restrições

- Esta onda **não toca** backend, RLS, RPCs, workflow, auditoria, perms — apenas casca visual e ergonomia.
- Persistência de pref de UI: LS com prefixo `ui.` apenas. Nunca dado operacional.
- Permissões: continuam roteadas via `usePermissoes` / `GovernedActionButton`. `RowActions` só esconde botão; gating real continua server-side.

## Critério de aceite

- Componentes compilam ✅
- Barrel atualizado ✅
- TitulosTabSupabase usa `RowActions` na coluna de ações (visualizar/baixar/anexos/histórico/cancelar) ✅
- Doc oficial publicado (este arquivo) ✅
- Memory `mem://design/d17-ui-enterprise-rm` ✅
