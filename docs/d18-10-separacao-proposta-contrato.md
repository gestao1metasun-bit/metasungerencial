# D18.10 — Separação Definitiva das Camadas Proposta x Contrato

Data: 2026-06-18
Escopo: navegação, rotas e UI. Sem alteração de regra de negócio, sem
toque em Financeiro, Engenharia, Estoque ou Compras.

## 1. Princípio aplicado

- **Proposta** = fotografia comercial / orçamento (preço, escopo,
  potência, negociação, aprovação comercial, geração de contrato
  pendente). Não edita cláusula nem minuta.
- **Contrato** = documento jurídico/operacional (minuta, cláusulas,
  projetos, aditivos, comissões). Não é orçamento.

A partir desta onda as duas camadas vivem em **rotas, grids, toolbars
e workspaces distintos**.

## 2. Rotas oficiais

| Camada     | Listagem                                         | Workspace                                |
| ---------- | ------------------------------------------------ | ---------------------------------------- |
| Propostas  | `/comercial/propostas` (redirect canônico) →     | `/comercial#tab=orcamentos` (embedded)   |
|            | `/comercial#tab=orcamentos` (workspace atual)    |                                          |
| Contratos  | `/comercial/contratos`                           | `/comercial/contratos/$contratoId`       |

`/comercial/propostas` foi adicionado como rota oficial estável que
redireciona para o workspace embarcado (PropostasPage) enquanto a
migração final do workspace dedicado não ocorre.

`/comercial/contratos` e `/comercial/contratos/$contratoId` já existiam
desde D18.8 — esta onda apenas remove o atalho confuso que mantinha o
mesmo destino acessível por dentro do `/comercial`.

## 3. Ribbon do Comercial

`src/lib/route-tabs.ts → ROUTE_TABS["/comercial"]`

- Aba **Propostas** (`value: "orcamentos"`) continua resolvendo o
  workspace embarcado em `/comercial`.
- Aba **Contratos** agora declara `to: "/comercial/contratos"`. Ao
  clicar, o ribbon navega cross-route diretamente para a tela dedicada
  de contratos (não mostra mais o card genérico de "tela movida").

O `Ribbon` (`src/components/app/Ribbon.tsx`) já tratava `t.to` como
cross-route — bastou marcar a aba. A tab `Contratos` permanece visível
e ativa quando o usuário está em `/comercial/contratos`.

## 4. Workspaces

- **Proposta**: `PropostasPage` (embedded em `/comercial`) com sua
  própria toolbar Enterprise RM (ações: abrir, aprovar, reprovar,
  cancelar, gerar contrato pendente, abrir contrato pendente/ativo).
- **Contrato**: rota dedicada `/comercial/contratos/$contratoId` com
  abas próprias (Resumo, Minuta/Dados Contratuais, Cláusulas, Projetos,
  Aditivos, Comissões, Documentos, Timeline, Auditoria) — entregue na
  D18.8 e mantida intacta.

Nenhum botão de contrato (Aprovar Contrato, Cancelar Minuta, Criar
Aditivo, Comissões do contrato) aparece na toolbar da proposta, e
nenhum botão de proposta (Aprovar Proposta, Reprovar, Gerar Nova
Proposta) aparece na toolbar do contrato. As duas toolbars já eram
fisicamente diferentes; a separação por rota torna essa garantia
estrutural.

## 5. Status (sem mistura)

- Proposta: RASCUNHO · ATIVA · APROVADA · CONTRATO_PENDENTE ·
  CONTRATADA · SUBSTITUIDA · CANCELADA.
- Contrato: MINUTA · PENDENTE_REVISAO · ATIVO · CANCELADO · ARQUIVADO.

O tipo `StatusProposta` (`src/modules/propostas/store.ts`) e os badges
da grid de propostas (`PropostaList.tsx`) já refletem CONTRATO_PENDENTE
e CONTRATADA desde D18.9. Não há renderização de etapa de contrato
("MINUTA", "ATIVO") dentro da grid de propostas.

## 6. Redirecionamentos antigos

| URL antiga                      | Destino atual                                |
| ------------------------------- | -------------------------------------------- |
| `/propostas`                    | `/comercial#tab=orcamentos` (redirect)       |
| `/comercial/propostas`          | `/comercial#tab=orcamentos` (redirect oficial novo) |
| `/comercial#tab=contratos`      | `ContratosRedirectCard` (card informativo → `/comercial/contratos`) |

Bookmarks legados de `/comercial#tab=contratos` continuam abrindo um
card explicativo que leva o usuário ao endereço oficial — não há rota
órfã. Nenhuma rota mistura mais Proposta e Contrato no mesmo destino
sem contexto.

## 7. Arquivos alterados

- `src/lib/route-tabs.ts` — aba "Contratos" do /comercial passa a
  navegar cross-route via `to: "/comercial/contratos"`.
- `src/routes/comercial.propostas.tsx` — nova rota oficial (redirect
  estável para o workspace embarcado).

Nenhuma migração de banco, nenhuma RPC, nenhuma policy, nenhum
workflow ou auditoria foram alterados.

## 8. Testes executados

- Clique em "Propostas" no ribbon → permanece em `/comercial`, aba
  `orcamentos`, exibindo `PropostasPage` (grid de propostas).
- Clique em "Contratos" no ribbon → navega para `/comercial/contratos`
  (grid de contratos dedicada).
- Acesso direto a `/comercial/propostas` → redireciona para
  `/comercial#tab=orcamentos` sem flash.
- Acesso a bookmark legado `/comercial#tab=contratos` → card
  informativo com botão "Abrir Contratos (oficial)" leva ao endereço
  novo.
- `tsc --noEmit`: sem novos erros introduzidos por D18.10.

## 9. Riscos e pendências

- O workspace **dedicado** de proposta (`/comercial/propostas/$id`)
  ainda não é uma rota física. Hoje a edição de proposta usa o modal
  embarcado da PropostasPage. Fica como pendência futura (D18.11)
  promover o workspace para rota própria, espelhando o de contratos.
- A aba `aditivos` continua dentro do /comercial; quando o módulo de
  Aditivos migrar para Supabase, será movido para
  `/comercial/contratos/$id` (workspace do contrato) — alinhado a este
  princípio.
- Nenhuma quebra de back-link interna identificada: todas as menções a
  `/comercial/contratos` em `comercial.tsx`, `comercial.projetos`,
  `AditivosTab` e `ContratosRedirectCard` continuam válidas.
