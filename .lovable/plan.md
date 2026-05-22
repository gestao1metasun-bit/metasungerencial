## Objetivo

Esconder a complexidade do ERP atrás de uma navegação enxuta, sem remover funcionalidades. O mesmo sistema continua robusto; o que muda é **como o menu é exibido**.

## Diagnóstico atual

- Sidebar tem 11 módulos no mesmo nível (Dashboard, Comercial, Financeiro, Financiamentos, Engenharia, Pós-venda, Estoque, Analytics, Cadastros, Relatórios, Configurações).
- Dentro de cada módulo (ex.: `/financeiro` tem 13 abas) tudo aparece achatado, misturando Visão / Operação / Cadastros / Controle.
- Não existe distinção visual entre o que é **dia a dia** e o que é **estrutura/admin**.
- Nomes genéricos ("Cadastros estruturais", "Parâmetros gerais") não comunicam.
- Não há favoritos nem últimos acessos.

## Mudanças propostas (Fase 1 — só UI/navegação, zero impacto em dados)

### 1. Sidebar em 3 camadas visuais

```
┌─ OPERAÇÃO ─────────────┐
│  Dashboard             │
│  Tarefas               │
│  Comercial             │
│  Financeiro            │
│  Financiamentos        │
│  Engenharia            │
│  Pós-venda             │
│  Estoque               │
├─ CONTROLE ─────────────┤
│  Analytics             │
│  Relatórios            │
├─ ESTRUTURA ────────────┤ (recolhido por padrão)
│  Cadastros             │
│  Configurações         │
└────────────────────────┘
```

- Cada camada vira um grupo com label discreto (uppercase, opacidade reduzida).
- **Estrutura** começa **colapsada** — quem usa dia a dia não vê ruído administrativo.
- Visual mais leve: espaçamento maior entre grupos, divisores sutis.

### 2. Reorganização das abas internas (por módulo)

Reescrever `src/lib/route-tabs.ts` agrupando todas as abas em 4 grupos padronizados: **Visão**, **Operação**, **Controle**, **Estrutura**. Nada é removido — apenas reordenado e renomeado.

Exemplo Financeiro (já tem grupos, só ajustar nomes/ordem):
- Visão: Dashboard, Fluxo de Caixa, Visão Gerencial, CMV / Compras
- Operação: Contas a Receber, Contas a Pagar, Lançamentos, Despesas Fixas
- Controle: Conciliação, Fechamento
- Estrutura: Fornecedores, Naturezas & Centros, Parâmetros financeiros

Exemplo Configurações (hoje 17 abas no mesmo nível):
- Empresa: Empresa, Parâmetros gerais
- Acessos: Perfis, Permissões, Usuários, Consultores, Logs de sessão
- Operacional: Dashboard, Comercial, Engenharia, Financeiro (cfg de módulos)
- Orçamentos: Fórmulas, Cadastros
- Sistema: Integrações, Sistema & Flags, Logs, Lixeira

No submenu lateral, grupos de **Estrutura** aparecem com cor mais apagada e ficam **após** Visão/Operação/Controle.

### 3. Renomeações para clareza

- "Cadastros estruturais" → "Plano de Contas & Categorias"
- "Centros & Naturezas (legado)" → remover do menu (mantém rota acessível, mas não exposta)
- "Parâmetros gerais" → "Parâmetros do Sistema"
- "Sistema & Flags" → "Feature Flags"
- "Cadastros" (módulo) → "Cadastros Operacionais"

### 4. Favoritos / acesso rápido (topbar)

- Novo botão **estrela** na topbar abre dropdown com:
  - **Favoritos**: o usuário fixa qualquer aba (botão estrela ao lado do título da página).
  - **Últimos acessos**: 5 últimas rotas/abas visitadas (localStorage por usuário).
- Persistência: localStorage `ms:favs:{userId}` e `ms:recent:{userId}`.

### 5. Menu por perfil (refinamento do que já existe)

Já existe `podeAcessarModulo(perfil, key)`. Adicionar mais granularidade:
- **Financeiro operacional**: não vê grupo "Estrutura" do sidebar nem aba "CFO/Controladoria" do Analytics.
- **Diretoria**: vê tudo, com Analytics em destaque.
- **Engenharia**: só Operação + Estoque + Tarefas.

Implementado adicionando flag `tier?: "operacao" | "controle" | "estrutura"` em cada item e filtrando por perfil.

## Detalhes técnicos

Arquivos tocados (todos frontend, nenhuma migration):

- `src/components/app/AppLayout.tsx` — reorganizar `nav` em 3 grupos, render com section labels, colapsar "Estrutura" por padrão.
- `src/lib/route-tabs.ts` — adicionar `group` em todas as abas, padronizar para Visão/Operação/Controle/Estrutura, renomear labels, esconder abas "legado".
- `src/lib/favoritos-store.ts` (novo) — hook `useFavoritos()` e `useRecentes()` com localStorage.
- `src/components/app/FavoritosMenu.tsx` (novo) — dropdown na topbar.
- `src/components/app/PageHeader.tsx` — adicionar botão "favoritar esta aba".
- `src/lib/perfis-store.ts` — adicionar helper `tierVisivel(perfil, tier)`.

Sem mudança de rotas, sem mudança de banco, sem quebra de URLs existentes (hash `#tab=...` continua igual).

## Fora de escopo desta fase

- Command palette (Ctrl+K) — fica para fase 2 se você quiser.
- Breadcrumbs dinâmicos no header — fase 2.
- Refazer visualmente o sidebar (mudar cores/tema) — só ajustes finos de espaçamento.

Confirma que sigo nessa direção, ou quer ajustar algum agrupamento antes?