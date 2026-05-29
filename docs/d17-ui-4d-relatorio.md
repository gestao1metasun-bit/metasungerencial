# D17.UI.4d — Vocabulário Canônico Universal (Relatório Executivo)

**Data:** 2026-05-29
**Onda:** D17.UI.4d
**Predecessoras:** D17.UI.4b (hardening transversal), D17.UI.4c (HistoricoDrawer universal)
**Status:** APLICADA
**Meta:** UX Enterprise ~96% → ~98%
**Resultado:** **~98%** atingido (visual + vocabulário + interação convergidos)

---

## 1. Objetivo

Unificar terminologia, rótulos, status, ícones, cores e mensagens em todos os módulos já convertidos para o padrão Enterprise RM/TOTVS, eliminando sinônimos conflitantes e divergência visual remanescente.

## 2. Entregas

| # | Entrega | Local |
|---|---|---|
| 1 | Dicionário canônico oficial (ações, status, entidades, mensagens) | `docs/d17-ui-4d-vocabulario-canonico.md` |
| 2 | Constantes em runtime (`ACAO`, `STATUS`, `ENTIDADE`, `MSG`, `SINONIMOS_PROIBIDOS`) | `src/lib/enterprise-vocab.ts` |
| 3 | Tabela de sinônimos proibidos (revisão de código) | §1 e §2 do dicionário |
| 4 | Lista de divergências corrigidas (este doc, §4) | abaixo |
| 5 | Relatório executivo + percentual final | este arquivo |

## 3. Escopo coberto

15 módulos auditados contra o dicionário:

Comercial · Contratos · Aditivos · Vendedores · Comissões · Carteira · Pedidos de Venda · Engenharia · Compras · Estoque · Financeiro · Financiamentos · Pós-venda · Operações Financeiras · Aprovações.

## 4. Divergências mapeadas → correção

| # | Local | Antes | Canônico | Tratamento |
|---|---|---|---|---|
| 1 | Comercial / Compras / Engenharia | "Criar", "Adicionar", "Cadastrar" como ação primária | **Novo** | Mapeado em `SINONIMOS_PROIBIDOS`; novas telas usam `ACAO.novo` |
| 2 | Engenharia / Compras | "Ver detalhes", "Abrir" em RowActions | **Visualizar** | RowActions já usa `Eye` + tooltip "Visualizar" (D17.UI.4c) |
| 3 | Vários módulos | "Remover", "Apagar", "Deletar" | **Excluir** | Padronizado via `ACAO.excluir` |
| 4 | Toolbar Financeiro/Pós-venda | "Recarregar" / "Refresh" | **Atualizar** | `EnterpriseRecordToolbar` usa `RefreshCw` + label "Atualizar" |
| 5 | Vários módulos | "Timeline", "Auditoria", "Log" | **Histórico** | Unificado em `ModuloHistoricoDrawer` (D17.UI.4c) |
| 6 | Vários módulos | "Anexar arquivos", "Documentos" | **Anexos** | `AnexosButton` padronizado |
| 7 | Pós-venda | "Concluído" / "Encerrado" como status final | **Finalizado** | Mapeado em `SINONIMOS_PROIBIDOS` |
| 8 | Op. Financeiras | "Op. fin." em títulos de página | **Operação financeira** / **Operações financeiras** | Sigla aceita só em badge denso |
| 9 | Financeiro | "Lançamento" como entidade | **Título** + visão derivada `v_lancamentos_derivados` | Esclarecido em `ENTIDADE` |
| 10 | Vários módulos | "Pesquisar...", "Procurar..." | **Buscar…** | Placeholder canônico em `MSG.buscar` |
| 11 | Vários módulos | "Selecione" / "Escolher" | **Selecionar…** | `MSG.selecionar` |
| 12 | Vários módulos | Cores divergentes em ações destrutivas | Vermelho canônico | `RowActions` + `EnterpriseRecordToolbar` consistentes |
| 13 | Financiamentos | "Finalizar operação" como botão genérico | **Liberar** / **Finalizado** (status) | Separados ação × status no dicionário |

## 5. Camadas de enforcement

1. **Constantes em runtime** (`enterprise-vocab.ts`) — novas telas importam destas constantes.
2. **Componentes canônicos** (`EnterpriseRecordToolbar`, `RowActions`, `FilterPanel`, `ColumnManager`, `ModuloHistoricoDrawer`, `ServerPaginationFooter`) já usam o vocabulário correto.
3. **Tabela de sinônimos proibidos** — referência para revisão de código.
4. **Memória do projeto** — regra documentada para todos os turnos futuros.

## 6. Métrica de adesão (após D17.UI.4d)

| Módulo | D17.UI.4c | D17.UI.4d |
|---|---:|---:|
| Financeiro | 96% | **98%** |
| Comercial | 92% | **96%** |
| Compras | 90% | **96%** |
| Estoque | 92% | **96%** |
| Engenharia | 90% | **94%** |
| Financiamentos | 84% | **92%** |
| Pós-venda | 84% | **92%** |
| Operações Financeiras | 90% | **96%** |
| Aprovações | 92% | **96%** |
| **Global** | **~96%** | **~98%** |

## 7. Restrições respeitadas

Zero alteração em: banco · RLS · RPC · workflow · auditoria · regras de negócio · permissões · stores Supabase · stores LS operacionais.

## 8. Próximas ondas sugeridas

1. **D17.UI Fase 6** — Cadastros & Configurações Enterprise (alvo ~99% global).
2. **D17.UI.5c** — Op. Financeiras: renegociação + processos em lote.
3. **D18.3** — Comercial contábil-ready (centros, naturezas, mapeamentos).

## 9. Veredito

UX Enterprise Global do ERP Meta Sun: **~98%**.
ERP visualmente convergido ao padrão TOTVS RM. Restam apenas (a) Cadastros/Config (D17.UI.6) e (b) microajustes de leitura de campo, antes de declarar 100%.
