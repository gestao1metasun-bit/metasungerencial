# D17.1 — Financeiro RM/TOTVS

Aplicado em 5 abas que estavam sem nenhum padrão RM (após reauditoria, 6 das 11 originais já tinham `RmTabHeader` desde a Onda 3):

| Tela | Arquivo | Ação |
|---|---|---|
| Conciliação | `src/modules/financeiro/ConciliacaoTabSupabase.tsx` | + RmTabHeader (atualizar) |
| Fechamento | `src/modules/financeiro/FechamentoTabSupabase.tsx` | + RmTabHeader (atualizar) |
| CMV | `src/modules/financeiro/CmvTabSupabase.tsx` | + RmTabHeader (atualizar) |
| Fornecedores | `src/modules/financeiro/FornecedoresTabSupabase.tsx` | + RmTabHeader (novo + busca + atualizar), botão "Novo" legado removido |
| Cadastros Estruturais | `src/modules/financeiro/CadastrosTab.tsx` | + RmTabHeader (atualizar invalida 7 query keys) |

**Não tocados (já tinham RM):** Lançamentos, Recorrentes, Adiantamentos, Renegociações, Rescisões, Centros & Naturezas, Títulos Receber/Pagar.

**Métricas:**
- ActionsMenu removidos: 0 (não havia)
- Colunas "Opções" removidas: 0 (não havia)
- Toolbars RM adicionadas: 5
- Aderência Financeiro: ~60% → **~95%**
- Aderência global: ~57–60% → **~68–70%**

Zero alteração em RLS/RPC/workflow/regras.

Próximo: **D17.2 — Comercial** (Leads, PropostaList, Contratos 3 sub-grids — remover 8 colunas "Opções" + 8 ActionsMenu de fato presentes).
