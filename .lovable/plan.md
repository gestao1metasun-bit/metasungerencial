
# Estoque operacional + Cronograma + Engenharia

Objetivo: criar um módulo de Estoque que funcione como **controle operacional de entrega + necessidade visual de compra**, sem movimentação automática, alimentado pelas obras quando entram no **Cronograma**, e que reaja automaticamente a alterações técnicas da Engenharia.

## 1. Estrutura de dados (store local `localStorage`, igual ao restante do ERP)

Arquivo novo `src/lib/estoque-store.ts`:

- **EstoqueItem** (catálogo): `id`, `nome`, `unidade` ("un" | "m" | "kg" | "pç"), `categoria` ("Módulo" | "Inversor" | "Cabo" | "Disjuntor" | "Estrutura" | "Outro"), `qtdAtual` (informada manual), `atualizadoEm`, `atualizadoPor`.
- **NecessidadeObraItem**: `obraId`, `itemId`, `qtdNecessaria` (derivada da obra/engenharia), `qtdEntregue`, `entregaCompleta` (bool), `obs`.
- **NecessidadeObra**: `obraId`, `contratoId`, `cliente`, `selecionadaCompra` (bool — seleção manual), `materialEntregueTotal` (derivado: todos itens completos), `itens: NecessidadeObraItem[]`.
- Catálogo seed: módulo 550W, inversor padrão, cabo 6mm², disjuntor CC, estrutura cerâmico, etc.

Helpers:
- `sugerirItensDaObra(obra)` — gera itens baseados em `modulos`, `inversores`, `kwp`, `telhado` (regra simples: cabo = `modulos * 2 m`, estrutura = `modulos`, etc).
- `recalcularNecessidade(obraId)` — re-deriva `qtdNecessaria` quando engenharia muda; preserva `qtdEntregue`. Item já entregue + aumento ⇒ falta só a diferença.
- `marcarEntrega(obraId, itemId, qtd, completo?)` — apenas atualiza `qtdEntregue/entregaCompleta`, **não** mexe em `qtdAtual` do catálogo.
- `setEstoqueAtual(itemId, qtd)` — atualização manual periódica.
- `setSelecionadaCompra(obraId, bool)` — seleção manual para entrar no cálculo de compra.
- `calcularNecessidadeCompra()` — soma das obras selecionadas, descontando entregas e estoque atual: `compra = max(0, Σ(necessidade - entregue) - estoqueAtual)`.

## 2. Integração com Cronograma / Engenharia

Em `src/routes/engenharia.tsx`:

- Quando obra entra na fase elegível ao Cronograma (mesmo filtro `elegivelCronograma`), chamar `garantirNecessidadeObra(obra)` — cria entry de necessidade se não existir, com itens sugeridos.
- Hook `useEffect` que observa alterações técnicas das obras (`modulos`, `inversores`, `potencia`, `telhadoTipo`) → dispara `recalcularNecessidade(obraId)`.
- Obras **Finalizadas** ou retornadas ao Comercial → marcar necessidade como `arquivada` (sai da lista).

## 3. UI — novo módulo `/estoque`

Rota `src/routes/estoque.tsx` + entrada na sidebar e em `route-tabs.ts`.

Abas:
1. **Painel** — KPIs: obras no cronograma, obras selecionadas, itens pendentes, valor estimado de compra (opcional).
2. **Obras no cronograma** — tabela das obras elegíveis. Checkbox "Incluir na compra". Botão "Material entregue" colapsa itens. Badge **MATERIAL ENTREGUE** quando 100% ok.
3. **Necessidade de compra** — agrega itens das obras selecionadas: `Necessidade total | Já entregue | Estoque atual | A comprar`. Coluna "A comprar" em destaque âmbar/vermelho.
4. **Estoque atual** — catálogo editável (qtd manual, atualizado em/por).
5. **Histórico de entregas** — log das ações de entrega.

Dialogs:
- `EntregaItemDialog` — entrada de qtd entregue (completa ou parcial com restante calculado).
- `EditarEstoqueDialog` — atualiza `qtdAtual` manual.

## 4. Permissões

- `usePodeEditarEstoque()` — só perfis com flag `estoque` (admin master + setor Estoque). Outros perfis: leitura.
- Botões de entrega/edição desabilitados para outros.

## 5. Sinalização cruzada

- Card da obra no Kanban da Engenharia ganha micro-badge **"Material OK"** (verde) quando `materialEntregueTotal`.
- Em Gestão de projetos (Comercial), apenas leitura — sem alterações.

## 6. Detalhes técnicos

- Tudo via `useSyncExternalStore` com cache `SERVER_SNAPSHOT` (mesmo padrão dos outros stores) para evitar loop.
- Persistência `localStorage` key `ms.estoque.v1` + `ms.estoque.necessidades.v1`.
- Sem migrations Supabase nesta entrega (mantém o padrão atual de stores locais).
- Validações: qtd nunca negativa, entrega parcial não pode exceder necessidade (avisa, mas permite para casos de re-engenharia).

## 7. Arquivos a criar/editar

- novo: `src/lib/estoque-store.ts`
- novo: `src/routes/estoque.tsx`
- novo: `src/modules/estoque/components/EntregaItemDialog.tsx`
- novo: `src/modules/estoque/components/EditarEstoqueDialog.tsx`
- edit: `src/lib/route-tabs.ts` (entrada Estoque)
- edit: `src/components/app/AppLayout.tsx` (sidebar)
- edit: `src/routes/engenharia.tsx` (gatilhos: garantir necessidade ao entrar no cronograma; recalcular ao editar; arquivar ao finalizar/retornar; badge material)
- edit: `src/lib/perfis-store.ts` (módulo `estoque` nas permissões)

Sem mudanças em Comercial/Contratos/Aditivos/Financiamentos.
