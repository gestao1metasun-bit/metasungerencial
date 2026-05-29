# D17.UI Fase 2b — Comercial Complementar — Relatório Executivo

**Data:** 2026-05-29  
**Escopo:** Aditivos, Vendedores, Carteira, Comissões  
**Restrições respeitadas:** ZERO alteração em banco/RLS/RPC/permissões/workflow/regra de negócio.

---

## 1. Telas convertidas

| Tela | Arquivo | Componentes D17 aplicados | Status |
|---|---|---|---|
| **Aditivos** (`AditivosTab`) | `src/routes/comercial.tsx` (~L5518) | `EnterpriseRecordToolbar` + `RowActions` (visualizar/anexos/historico) | ✅ Convertida |
| **Vendedores** (`VendedoresTab`) | `src/routes/comercial.tsx` (~L4800) | `EnterpriseRecordToolbar` + busca canônica + filtro reativo | ✅ Convertida |
| **Carteira Comercial** | — | — | ⚠️ Não existe como tela separada (ver §3) |
| **Comissões** | — | — | ⚠️ Não existe como tela separada (ver §3) |

### Aditivos — detalhes
- Toolbar Enterprise no topo (search canônico, atualizar, filtroAvancado, colunas, exportar, imprimir).
- Coluna **Ações** convertida de `<Button>Abrir</Button>` para `RowActions` canônico com:
  - **visualizar** (azul) → abre painel de aditivos do contrato
  - **anexos** (azul, com `badgeCount` = total de aditivos)
  - **histórico** (índigo, overflow ⋯)
- Filtros existentes (Pendentes/Aprovados/Todos) preservados como segmento de subgrupos.
- Stat cards (Pendentes/Aprovados/Reprovados) mantidos.

### Vendedores — detalhes
- Toolbar Enterprise no topo (search por nome/e-mail, atualizar, filtroAvancado, colunas, exportar, imprimir).
- Busca reativa filtra os cards de vendedor (`filtrados` ↔ `vendedoresList`).
- Contador `X de Y vendedor(es)` substitui texto estático.
- Botão **Novo Vendedor** preservado (única ação de mutação existente).
- Cards mantêm: indicadores rápidos (contratos/assinados/vendido/conversão), barra de meta, `HistoricoVendedorDialog` (vínculo com contratos).

---

## 2. Arquivos alterados

```
src/routes/comercial.tsx       — import RowActions + 2 toolbars + RowActions em Aditivos + filtro Vendedores
docs/d17-ui-fase2b-relatorio.md (novo)
```

Zero migração, zero edge function, zero alteração em store/RPC/permissão.

---

## 3. Carteira Comercial e Comissões — situação real

Auditoria do código mostra que **nem Carteira nem Comissões existem como abas ou rotas dedicadas** no Comercial atual:

- **Carteira Comercial:** o conceito existe no backend (RPCs `comercial.carteira.*`, tabela `comercial_carteira_transferencias` — wave C4) mas **não tem UI dedicada**. Hoje a "carteira" é vista indiretamente pelos cards de Vendedores (contratos por vendedor) e pelos grids de Propostas/Contratos com coluna Vendedor.
- **Comissões:** o backend (wave C6, tabela `comercial_comissoes` + 6 RPCs) está fechado, mas a UI **não tem grid próprio**. Hoje a comissão aparece embutida:
  - Como **coluna** em `OrcamentosTab` e `ContratosTab` (R$ Comissão, %).
  - Como **botão "Liberar comissão"** no menu de ações de cada contrato assinado (gera AP via `gerarAPdeComissao`).

**Construir grids dedicados de Carteira e Comissões exige criar UI nova**, o que extrapola o escopo desta fase (que é padronização visual de telas existentes). Recomendado tratar em fase própria — ver §6.

---

## 4. Percentuais atualizados

| Camada | Antes (pós Fase 2) | Depois (pós Fase 2b) |
|---|---|---|
| **Comercial** | ~70% | **~76%** |
| **ERP global** | ~52% | **~54%** |

Ganhos:
- Aditivos: 0 → 100% no padrão Enterprise (toolbar + RowActions canônicos).
- Vendedores: ~30% → ~80% (toolbar + busca canônica; cards mantidos por opção de design).
- Carteira/Comissões: sem ganho (sem tela própria — exige construção nova).

---

## 5. Critério de aceite

| Critério | Status |
|---|---|
| Aditivos no padrão Enterprise/RM | ✅ |
| Vendedores no padrão Enterprise/RM | ✅ |
| Carteira no padrão Enterprise/RM | ⚠️ Bloqueado — não há tela existente para padronizar |
| Comissões no padrão Enterprise/RM | ⚠️ Bloqueado — não há tela existente para padronizar |
| Toolbar, busca canônica, ações de linha aplicadas | ✅ onde aplicável |
| Zero alteração em banco/RLS/RPC/permissão/workflow | ✅ |

---

## 6. Próximos passos recomendados

**Antes de avançar para Compras/Estoque (Fase 3):**

1. **D17.UI Fase 2c — Construir telas dedicadas:**
   - `CarteiraTab` em `/comercial` — grid de carteira (cliente/vendedor/origem/status), com ações em lote (transferir lote ≤ 1000, já suportado por `rpc_carteira_transferir_lote`).
   - `ComissoesTab` em `/comercial` — grid com status PREVISTA/LIBERADA/PAGA/CANCELADA/ESTORNADA, processos liberar/baixar/cancelar/estornar (já suportados pelas 6 RPCs C6).
   - Ambas reusam os componentes D17 já consolidados.

2. **OU** seguir direto para **Fase 3 (Compras/Estoque)** se o foco for cobrir todos os módulos antes de aprofundar Comercial — e tratar Carteira/Comissões em uma janela específica depois.

**Recomendação:** seguir para **Fase 3 (Compras/Estoque)** primeiro, porque:
- Compras/Estoque tem telas existentes com mais usuários ativos.
- Carteira/Comissões exigem construção de UI nova (não é "padronização"), o que mistura escopo D17 com escopo funcional.

---

## 7. Estimativa final D17.UI

Após Fase 2b: Comercial ~76% / ERP global ~54%.  
Para atingir meta de 98% global ainda faltam: Compras, Estoque, Engenharia, Pós-venda, Cadastros, Aprovações (segundo nível), Saved Views universais, AttachmentEngine universal, HistoricoDrawer universal, ColumnManager universal.

Estimativa: **6 a 8 ondas adicionais** (D17.UI.3..D17.UI.10) para alcançar 98%.
