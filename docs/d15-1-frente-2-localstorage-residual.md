# D15.1 Frente 2 — Relatório de Dependências Residuais de LocalStorage

**Data:** 2026-05-28
**Status:** somente leitura/diagnóstico, nenhuma remoção executada.

## 1. Resumo numérico

| Métrica | Valor |
|---|---|
| Arquivos que tocam `localStorage` | **57** |
| Chamadas a `getItem` | **66** |
| Chamadas a `setItem` | **81** |
| Chaves literais identificadas | apenas 2 (`ff:enterprise-shell-full`, `ff:<NAME>`); restantes são chaves dinâmicas computadas dentro das stores. |

> Observação: a maior parte das stores LS utiliza prefixos dinâmicos
> (`ms.fin.*`, `ms.cad.*`, `ms.ui.*`), por isso o grep retorna poucas
> literais. A classificação abaixo é feita por arquivo/responsabilidade.

## 2. Classificação por criticidade

### 2.1 CRÍTICA (impede corte LS hoje)
Stores ainda referenciadas por telas operacionais; precisam ser substituídas
por repositórios Supabase antes do corte físico.

| Arquivo | Função | Substituto oficial | Bloqueio |
|---|---|---|---|
| `src/lib/fin-titulos-store.ts` | títulos legados | `lancamentos-repo` + `v_lancamentos_derivados` | `TitulosTab` ainda lê LS |
| `src/lib/fin-adiantamentos-store.ts` | adiantamentos | tabela `adiantamentos` | UI ainda não refatorada |
| `src/lib/fin-renegociacao-store.ts` | renegociação | `rpc_lancamento_criar` + view | UI ainda não refatorada |
| `src/lib/fin-compras-store.ts` | compras (lote) | tabela `boletos`/`adiantamentos` | UI ainda não refatorada |
| `src/lib/fin-rescisao-store.ts` | rescisões | tabela `rescisoes_contrato` | UI ainda não refatorada |
| `src/lib/fin-conciliacao-store.ts` | conciliação | tabela `extrato_banco` | UI ainda não refatorada |
| `src/modules/financeiro/TitulosTab.tsx` | tela financeiro | view derivada | refator pendente |
| `src/lib/financeiro-store.ts` | hub financeiro | repositórios oficiais | hub legado |
| `src/lib/repositories/financeiro-repository.local.ts` | fallback LS | desativar via flag D15 | mantido como cache |

### 2.2 OPERACIONAL (substituível, baixo risco)
Já existem tabelas oficiais; basta migrar UI quando tocar no módulo.

| Arquivo | Substituto |
|---|---|
| `src/lib/clientes-store.ts` | `useClientesOficiais` (cadastros-repo) |
| `src/lib/fin-fornecedores-store.ts` | `useFornecedoresOficiais` |
| `src/lib/fin-grupos-store.ts` | `useGruposFin` |
| `src/lib/fin-naturezas-store.ts` | tabela `naturezas_financeiras` |
| `src/lib/fin-centros-custo-store.ts` | tabela `centros_resultado` |
| `src/lib/fin-meios-pagamento-store.ts` | `useMeiosPagamento` |
| `src/lib/fin-tipos-aplicacao-store.ts` | `useTiposAplicacao` |
| `src/lib/fin-contas-store.ts` | tabela `contas_bancarias` |
| `src/lib/fin-parametros-financeiros-store.ts` | parâmetros via Supabase |
| `src/lib/bancos-store.ts` | tabela `bancos` |
| `src/lib/contratos-store.ts` | `contratos-repo` |
| `src/lib/contrato-base-store.ts` | repositório oficial |
| `src/lib/aditivos-store.ts` | repositório oficial |
| `src/lib/equipes-store.ts` / `consultores-store.ts` / `gerentes-store.ts` / `perfis-store.ts` / `usuarios-store.ts` | cadastros oficiais |
| `src/lib/estoque-store.ts` | tabelas estoque (D10) |
| `src/lib/compras-transito-store.ts` | tabelas estoque |
| `src/lib/obras-snapshot-store.ts` / `obras-finalizacao-store.ts` | repositório obras (D11) |
| `src/lib/posvenda-store.ts` | repositório pós-venda |
| `src/modules/propostas/store.ts` + `proposta-config-store.ts` | repositório comercial |
| `src/lib/audit-store.ts` | tabela `audit_log` (já existe) |
| `src/lib/fin-pendencias.ts` | view de pendências |
| `src/lib/fin-fechamento-store.ts` | rotina fechamento Supabase |

### 2.3 PREFERÊNCIA VISUAL (manter em LS — OK)
São preferências de UI, **não devem migrar**.

- `src/components/app/grid/useGridDensity.ts` — densidade de grid
- `src/lib/favoritos-store.ts` — favoritos do usuário
- `src/components/app/ContextualSidebar.tsx` — estado do drawer
- `src/components/app/KanbanColumns.tsx` — preferências de kanban
- `src/components/app/EnhancedTable.tsx` / `OperacionalFinTable.tsx` — col widths
- `src/modules/propostas/components/PropostaList.tsx` — filtros UI
- `src/components/app/contratos/ProjetosContratoSupabaseTab.tsx` — abas ativas
- `src/lib/feature-flags.ts` + `src/config/featureFlags.ts` — flags D15
- `src/lib/identidade.ts` — preferência tema/marca

### 2.4 CACHE / INFRA (não migrar)
- `src/integrations/supabase/client.ts` — sessão Supabase (obrigatório)
- `src/lib/dev-seed.ts` — utilitário dev
- `src/hooks/useRepoFinanceiro.ts` — wrapper de fallback (lê flags)
- `src/lib/repositories/projetos-contrato-repo.ts` / `obras-repo.ts` — cache opcional
- `src/lib/anexos.functions.ts` — cache local de URLs assinadas

## 3. O que ainda impede a remoção física total do legado LS

1. **Telas financeiras ainda dependem das stores LS críticas** (TitulosTab,
   conciliação, rescisão, renegociação, compras). Refator UI = pré-requisito.
2. **Hub `financeiro-store.ts`** ainda é importado por dezenas de componentes;
   precisa virar fachada do `lancamentos-repo`.
3. **Repositório fallback** (`financeiro-repository.local.ts`) sustenta a flag
   D15 de dual-read; só pode ser removido quando todas as telas usarem
   `lancamentos-repo`.
4. **Stores de cadastros legados** (gerentes/consultores/equipes/perfis) não
   têm repositório oficial — precisam ser criados na sequência da Onda 2.
5. **Módulos ainda não migrados** (estoque, obras, pós-venda, propostas)
   serão tratados na D16 e nas ondas D10/D11.

### Caminho final sugerido (sem nova onda grande)

1. Refatorar `TitulosTab` para `lancamentos-repo` (corte real do principal LS crítico).
2. Substituir hub `financeiro-store.ts` por fachada repo.
3. Marcar `financeiro-repository.local.ts` como deprecated; flag D15 default false.
4. Deletar fisicamente stores 2.1 após confirmação por painel saúde (`v_saude_sistema`).
5. Cadastros legados (2.2) caem naturalmente ao migrar telas.
6. Preferências visuais (2.3) e infra (2.4) permanecem.

## 4. Conclusão

Não há bloqueador estrutural — todas as tabelas e repositórios oficiais já
existem após Ondas 1.A → 8. O que resta é **refator de UI**, executado de
forma incremental por módulo, sem necessidade de nova onda transversal.
