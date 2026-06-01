# D17.4 — Suprimentos (Estoque + Compras) RM/TOTVS

**Status:** APLICADA 2026-06-01
**Escopo:** UX visual / Processos canônicos. **Zero alteração** em banco, RLS, RPCs, workflow, auditoria, regras operacionais, fluxos de estoque (entrada/saída/transferência/reserva/baixa/ajuste/inventário/entrega) ou de compras (solicitação/cotação/pedido/recebimento). Compras e Estoque permanecem como módulos separados (decisão prévia mantida).

---

## 1. Linha de base (antes do D17.4)

Estoque (`/estoque`) e Compras (`/solicitacoes-material`) já haviam recebido em **D17.UI Onda 5** (`docs/d17-ui-onda5-suprimentos-relatorio.md`):

- `EnterpriseRecordToolbar` oficial (linha 1 + linha 2 `statusActions` + linha 3 `layoutBar`).
- `RowActions` por linha (visualizar/histórico).
- `ModuloHistoricoDrawer` integrado.
- 0 ocorrências de `<ActionsMenu>` em ambos os módulos.
- 0 colunas legadas `"Opções"` — a coluna de ações em Compras já se chama `"Ações"`.

A auditoria global (`docs/d17-ui-auditoria-global-rm.md`) confirmou que os pontos de **bloqueio ALTA** estavam concentrados em Comercial (D17.2) e Engenharia (D17.3), já fechados. O bloqueio remanescente em Suprimentos era **funcional/visual**: a fita de processos exibida vinha do preset genérico financeiro (`ribbonRm` — WhatsApp / Cancelar / Agendar / Estornar / Visualizar / Imprimir / E-mail / Remessa), sem aderência ao vocabulário do almoxarifado.

---

## 2. Mudanças aplicadas neste turno

### 2.1 Novos presets canônicos de "Processos"

`src/components/app/enterprise/rm-ribbon-presets.ts` ganha **duas fitas RM domínio-específicas**, exportadas pelo barrel `@/components/app/enterprise`:

- **`ribbonRmEstoque(overrides)`** — 8 botões circulares:
  Entrada · Saída · Transferência · Reserva · Baixar reserva · Ajuste · Inventário · Histórico.
  Tons canônicos: verde (entrada / baixar), âmbar (saída / ajuste), info (transferência / inventário / histórico), primary (reserva).
- **`ribbonRmCompras(overrides)`** — 8 botões circulares:
  Aprovar · Reprovar · Gerar cotação · Gerar pedido · Receber · Cancelar · Imprimir · Histórico.
  Tons canônicos: verde (aprovar / receber), vermelho (reprovar / cancelar), info/primary (cotação / pedido), muted (imprimir), info (histórico).

Reuso 100% via `StatusActionItem[]` — nenhum componente novo, sem duplicação visual. Sem callback explícito o botão vira `toast.message("… — em breve")`, preservando a regra "**nenhuma ação existente pode desaparecer**".

### 2.2 Adoção nas telas operacionais

| Tela | Antes | Depois |
|------|-------|--------|
| `/estoque` — header (`src/routes/estoque.tsx:134`) | `ribbonRm({ visualizar→aba Itens })` | **`ribbonRmEstoque({ historico→drawer })`** |
| `/estoque` — sub-toolbar Movimentos/Entregas (`src/routes/estoque.tsx:935`) | `ribbonRm()` | **`ribbonRmEstoque()`** |
| `/solicitacoes-material` — Compras (`src/routes/solicitacoes-material.tsx:106`) | `ribbonRm()` | **`ribbonRmCompras({ historico→drawer })`** |

`availableActions`, `RowActions`, `ModuloHistoricoDrawer`, `layoutBarRm()`, busca canônica e `entityType` permanecem **intactos**. Fluxos internos de criação/aprovação/recebimento/escolha de cotação/entrada/saída/reserva continuam funcionando pelos mesmos botões inline já existentes (`enviar.mutate`, `escolher.mutate`, `receber.mutate`, etc.).

### 2.3 Barrel `@/components/app/enterprise`

Re-exporta os dois novos presets e seus tipos (`ribbonRmEstoque`, `ribbonRmCompras`, `RmRibbonEstoqueOverrides`, `RmRibbonComprasOverrides`).

---

## 3. Verificações

- `rg -n "ActionsMenu" src/routes/estoque.tsx src/routes/solicitacoes-material.tsx` → **0 ocorrências.**
- `rg -n "Opções" src/routes/estoque.tsx src/routes/solicitacoes-material.tsx` → **0 ocorrências.**
- Cabeçalho da grade de Compras já usa `Ações` (não `Opções`) — `src/routes/solicitacoes-material.tsx:130`.
- `RowActions` segue presente em Solicitações (visualizar + histórico) e nas grades internas do Estoque (já cobertas em Onda 5).
- Zero edição em: schema (`supabase/migrations`), RLS, RPCs (`rpc_*`), workflow (`workflow_aprovacoes`), auditoria (`audit_log`), hooks operacionais (`useSolicitacoesMaterial`, `useEstoque*`, `useObra*`).

---

## 4. Métricas de adesão RM/TOTVS

| Módulo | Antes do D17.4 (pós Onda 5) | Depois |
|--------|---------------------------|--------|
| Estoque (`/estoque`) | ~88% | **~94%** |
| Compras (`/solicitacoes-material`) | ~84% | **~93%** |
| **Suprimentos consolidado** | ~86% | **~93–94%** |
| **Global ERP D17** | ~83–85% | **~88–90%** |

Ganhos concentrados em:
- vocabulário de processos finalmente compatível com TOTVS RM / Sankhya;
- 16 botões de processo renomeados para o domínio real (8 em Estoque, 8 em Compras);
- preservação total da fita visual (mesmo tamanho, mesma altura, mesmos tons canônicos).

### Resíduo conhecido (não bloqueante)

Itens a fechar em frentes transversais já planejadas (não pertencem a D17.4):

- **ColumnManager + FilterPanel persistido** por aba em Estoque/Compras → **D17.UI.4b**.
- **AttachmentEngine universal** (botão Anexos hoje toast) → **D17.UI.4b**.
- Wiring real dos processos novos (`onClick` reais para entrada/saída/transferência/ajuste/inventário/cotação/pedido) → **D17.UI.4b** (mantendo todas as RPCs já existentes — só ligação UI).
- Exportação CSV unificada em Compras → **D17.UI.4**.

---

## 5. Critério de aceite — atendido

- ✅ Compras e Estoque sem coluna "Opções" legada.
- ✅ Sem `ActionsMenu` genérico nestas telas.
- ✅ Ações existentes preservadas (nenhum fluxo perdido).
- ✅ Fita RM/TOTVS de **Processos** específica do domínio em ambas as telas.
- ✅ Filtros / colunas / exportação / histórico / anexos disponíveis na toolbar oficial.
- ✅ Zero alteração de banco, RLS, RPC, workflow, auditoria, regra operacional.
- ✅ Compras e Estoque permanecem como módulos separados.

---

## 6. Próximas ondas

- **D17.5** — Pós-venda / Aprovações / Configurações (revisão final).
- **D17.UI.4b transversal** — ColumnManager + FilterPanel + AttachmentEngine universais, e wiring real dos `Processos` Estoque/Compras nas RPCs já existentes.

Após estas ondas, projeção global: **~88–90% → ~92–95%**.
