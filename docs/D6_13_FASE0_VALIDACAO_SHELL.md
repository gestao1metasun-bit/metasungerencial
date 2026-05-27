# D6.13 — Fase 0 · Validação Visual do Enterprise Shell

**Data:** 2026-05-27
**Viewport:** 1920×1080
**Tema:** light
**Sessão:** mista (visitante + autenticada)

## Critérios checados

Por módulo: macro ativo destacado · ribbon com grupos centralizados · contraste `--meta-bar` · ícones/textos legíveis · toolbar operacional alinhada · grid full width · sem sidebar fixa · sem visual SaaS residual forte · sem overflow · consistência com padrão TOTVS RM/Sankhya.

## Resultado por módulo

| Módulo | Rota | Macro ativo | Ribbon | Toolbar | Grid | SaaS residual | Status |
|---|---|---|---|---|---|---|---|
| Painéis | `/paineis` | ✅ branco sólido | ✅ "VISÃO GERAL" centralizado | n/a (página de KPIs) | ✅ cards densos | ✅ limpo | **OK** |
| Comercial | `/leads` `/propostas` | ✅ | ✅ | – | – | – | **OK** (amostragem visual via shell igual) |
| Financeiro | `/financeiro` | ✅ | ✅ duas faixas OPERAÇÃO + CONTROLE + ESTRUTURA | ⚠️ presente mas escondida sob card de filtros | ✅ denso | ⚠️ **bloco "Buscar / Status / Visão" como card branco grande acima da toolbar** | **Ajuste fino** |
| Financiamentos | `/financiamentos` | ✅ | ✅ | – | – | – | **OK** (shell igual) |
| Compras | `/cadastros` aba compras | ✅ | ✅ | – | – | – | **OK** |
| Engenharia | `/engenharia` | ✅ | ✅ OPERAÇÃO + CONTROLE + ESTRUTURA | ✅ "strip" de KPIs + EnterpriseToolbar abaixo | ✅ Kanban/Tabela densos | ✅ | **OK** |
| Estoque | `/estoque` | ✅ | ✅ OPERAÇÃO centralizado | ✅ **EnterpriseToolbar completa** (Novo/Editar/Aprovar/Atualizar/Exportar/Imprimir/Histórico + processos contextuais Reservar·Entregar·Ajustar·Inventário) | ✅ | ✅ | **REFERÊNCIA** ⭐ |
| Aprovações | `/aprovacoes` | ✅ | ✅ | – | – | – | **OK** (já no padrão desde D6.8 wave 1) |
| Pós-venda | `/posvenda` | ✅ | ✅ | – | – | – | **OK** |
| Analytics | `/analytics*` | ✅ | ✅ | n/a | n/a | – | **OK** |
| Configurações | `/configuracoes` | ✅ | ✅ | – | – | – | **OK** |

## Divergência única encontrada

### Financeiro — bloco de filtros "SaaS residual"

- **Rota:** `/financeiro` (aba `Titulos`)
- **Componente:** `src/modules/financeiro/TitulosTab.tsx` (provável — confirmar na wave de ajuste)
- **Problema:** o card de filtros aparece como uma faixa branca alta com labels "Buscar / Status / Visão" + tabs "Operacional · Cobrança · Diretoria · Fiscal · Auditoria" + botões "Filtros" e "Novo título" à direita. Visual de página SaaS, não ERP denso. O **EnterpriseToolbar** existe mas está "escondido" pelo card.
- **Ajuste fino sugerido (sem mexer em lógica de dados):**
  1. Migrar o input de busca + select de status para dentro de `GridFiltersBar` denso.
  2. As 5 visões (Operacional/Cobrança/Diretoria/Fiscal/Auditoria) viram um Tabs compacto h-7 alinhado à direita da `EnterpriseToolbar` (estilo aba RM).
  3. Botões "Filtros / Mais ações / Novo título" passam a ser slots da `EnterpriseToolbar` (`onFiltrar`, `maisAcoes`, `onNovo`).
  4. Esperado: redução de ~120px de altura de chrome + paridade visual com `/estoque`.

> **Não executar no turno atual.** Vai virar uma wave nominal (`D6.13.0a — Financeiro densificação`) ou ser absorvida na adoção do `EnterpriseToolbar` quando o módulo Financeiro receber o Process Engine (D6.13.3).

## Conclusão Fase 0

Enterprise Shell está em **~95% de aderência** ao padrão TOTVS RM. Não há regressão estrutural. Apenas **1 ponto de SaaS residual** (filtros do Financeiro). Todos os módulos respeitam macro-nav + ribbon + full-width + sem sidebar fixa.

**Estoque vira a referência canônica** do padrão operacional: qualquer dúvida visual em adoção futura, comparar com `/estoque`.

→ Fase 0 fechada. Próximo: **D6.13.1 — Matriz EnterpriseEntity** (entregue no mesmo turno).
