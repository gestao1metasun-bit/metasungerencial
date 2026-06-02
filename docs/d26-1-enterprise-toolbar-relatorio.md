# D26.1 — Barra Operacional Enterprise Global (RM/TOTVS) — Fase 1 Comercial

**Data:** 2026-06-02 · **Escopo:** UI/UX transversal · **Zero** alteração em banco, RLS, RPC, workflow, auditoria ou regras de negócio.

## Resumo executivo

Foco desta entrega: **eliminar botões mudos** (regra de pedra do briefing) e
**remover duplicações visíveis** na tela de Contratos do Comercial — sem
mexer em backend nem em assinaturas de componente. Como os ajustes foram
feitos nos presets compartilhados (`ribbonRm`, `ribbonRmAprovacao`) e no
componente único `EnterpriseRecordToolbar`, a correção cascateia
automaticamente para **todos os 11 módulos** que adotam o barrel enterprise.

## Mudanças aplicadas

### 1. `ribbonRm()` / `ribbonRmAprovacao()` — sem stubs (regra global)

**Antes:** ambos os presets retornavam **8 botões circulares** com `onClick`
stub que apenas emitia `toast("… — em breve")`. Resultado visual: fileira de
círculos coloridos órfãos abaixo da toolbar, sem função real, em
todas as telas do Comercial, Financeiro, Aprovações, Pós-venda e
Financiamentos que chamavam `statusActions={ribbonRm()}`.

**Depois:** os presets só devolvem itens cujo `onClick` foi explicitamente
passado pelo consumidor via `overrides`. Sem overrides ⇒ array vazio ⇒ a
**Linha 2 deixa de ser renderizada** (`EnterpriseRecordToolbar` já tem essa
condição). Nenhum módulo precisa ser alterado: quem hoje passa stubs vazios
ganha uma toolbar mais limpa; quem passa handlers reais continua igual.

### 2. `EnterpriseRecordToolbar` — Linha 3 (Layout)

Removidos 3 ícones decorativos (`Square`, `BarChart3`, `Mail`) que eram
renderizados **sem `onClick`** dentro do bloco `layoutBar`. Eram botões
mudos por construção. O slot `layoutBar.extra` continua disponível para
módulos que precisarem injetar visões reais. Densidade (compacta/confortável/espaçosa)
e o seletor de preset "Padrão" permanecem intactos.

### 3. Comercial → Contratos (aba `gerados`) — busca duplicada

**Antes:** o card "Contratos aprovados aguardando redação" tinha um campo
de busca próprio (`<Input placeholder="Buscar contrato, cliente, proposta…">`)
ligado ao mesmo `busca` da toolbar Enterprise. O usuário via dois campos
sincronizados na mesma tela (o de cima na toolbar oficial, o de baixo dentro
do card), exatamente como destacado no print enviado.

**Depois:** o campo duplicado dentro do card foi removido. A busca oficial
permanece **uma única vez**, na extrema direita da toolbar Enterprise
(padrão RM já consolidado em D27).

## Arquivos editados

- `src/components/app/enterprise/rm-ribbon-presets.ts` — `ribbonRm` / `ribbonRmAprovacao` só renderizam itens com callback real.
- `src/components/app/enterprise/EnterpriseRecordToolbar.tsx` — Linha 3: removidos 3 ícones sem ação.
- `src/routes/comercial.tsx` — removida busca duplicada do card "Contratos aprovados aguardando redação".

## Impacto por módulo (cascata automática)

| Módulo | Telas afetadas pela remoção dos stubs | Observação |
|---|---|---|
| Comercial | Leads, Propostas, Contratos, Gestão de Projetos, Carteira, Comissões | Linha 2 (círculos) desaparece nas abas que só chamavam `ribbonRm()` sem overrides. |
| Financeiro | Títulos, Adiantamentos, Conciliação, Lançamentos, Renegociações | Idem. Telas que já passam handlers reais continuam exibindo só as ações funcionais. |
| Aprovações | Visão Unificada, Workflow | Idem. |
| Pós-venda | Atendimentos | Idem. |
| Financiamentos | Tela principal | Idem. |
| Suprimentos | Mantém os ribbons específicos (`ribbonRmCompras`, `ribbonRmEstoque`) que **já entregam handlers reais** — sem regressão. |
| O.S./Engenharia/Auditoria/Notificações/Cadastros/Configurações | Sem regressão (não usavam `ribbonRm()` genérico). |

## O que NÃO entrou nesta onda (deferido)

A regra "barra operacional padronizada em 11 módulos" é grande demais para uma
única entrega segura. O briefing reconhece isso ao definir 5 fases sequenciais.
Esta entrega cobre apenas a **fase 1 (regra global anti-mudo + limpeza do
Comercial visível no print)**. As próximas sub-ondas continuam mapeadas:

- **D26.1.2** — Comercial: auditar/anexar handlers reais de Processos nas abas
  Propostas (aprovar/revisar/cancelar), Contratos (gerar aditivo, enviar p/
  assinatura), Carteira (transferir), Comissões (liberar/cancelar).
- **D26.1.3** — Bug "Tabela" não funciona em Gestão de Projetos: investigar
  toggle Tabela/Kanban da aba `projetos` (requer leitura de
  `ProjetosContratoSupabaseTab` e do estado de visão — não tocado nesta onda
  para não arrastar regressão).
- **D26.1.4** — Suprimentos / Financeiro / O.S. / Governança: replicar a
  mesma auditoria anti-mudo + Processos contextuais reais.
- **D26.1.5** — Anexos universais por botão da toolbar: o `AttachmentDialog`
  já existe, falta plugar `onAttach` nas telas que ainda não o fazem.
- **D26.1.6** — Ações em lote: padronizar `BulkActionBar` por módulo.

## Validação de critério de aceite (escopo desta entrega)

- [x] Busca permanece à direita (D27).
- [x] Filtros / Processos / Anexos / Exportar / Colunas na mesma linha (toolbar Enterprise já entrega).
- [x] Nenhum botão **mudo** renderizado: `ribbonRm` sem overrides ⇒ Linha 2 oculta; Linha 3 sem ícones decorativos sem ação.
- [x] Busca duplicada do Comercial → Contratos eliminada (corresponde exatamente ao print enviado).
- [x] Zero alteração em RLS / regras / RPC / workflow / auditoria.
- [x] Zero quebra de assinatura — telas que passam overrides continuam funcionando idênticas.

## Restrições respeitadas
- ✅ Sem migração de banco, sem novas permissões, sem novo motor.
- ✅ Sem perda de função operacional (só removidos botões que já não tinham função).
- ✅ Sem regressão nas telas de Suprimentos (que usam ribbons específicos com handlers reais).
