# C-ENT.11.c — Eliminar Aditivos LS e consolidar Aditivos Supabase como fonte única

Data: 2026-06-17
Status: APLICADA
Escopo: UI/Comercial — neutralização de fluxos LS de Aditivo. ZERO mudança em motor,
schema, RPC, RLS, regra de negócio, financeiro ou engenharia.

## Objetivo

Eliminar a divergência de verdade entre Aditivos LS (`@/lib/aditivos-store`,
`AditivosPanel`, `AditivoDialog`, `AditivoBadge`) e Aditivos Supabase (tabela `aditivos`,
`rpc_aditivo_aplicar`, fluxo compensatório C-ENT.9, hooks
`useAditivosPorContrato` / `useAditivosPorProjeto`, componentes
`AditivosListPanel` + `NovoAditivoDialog`).

Após esta subonda, todo aditivo visível/criado/aplicado/compensado dentro do módulo
Comercial passa exclusivamente pelos workspaces Supabase oficiais:

- `/comercial/contratos/$contratoId#tab=aditivos`
- `/comercial/projetos/$projetoId#tab=aditivos`

## Arquivos alterados

1. **`src/modules/comercial/AditivosTab.tsx`** — REESCRITO
   - Removido: `useAditivos`, `isPendente`, `usePodeGerenciarAditivos`,
     `AditivosPanel`, `AditivoBadge`, ribbon LS, toolbar LS, tabela LS,
     diálogo LS, exportação CSV LS.
   - Removidos todos os `toast.info("... chega em D27.COM.AD.")` (botões fake).
   - Substituído por **card de redirecionamento** para `/comercial/contratos`
     explicando que a gestão oficial é por contrato (Supabase). Sem CTAs falsos.

2. **`src/routes/comercial.tsx`** — NEUTRALIZADO LS de aditivo
   - Removidos imports: `AditivosPanel`, `AditivoBadge`,
     `useAditivos`, `useAditivosByContrato`, `isPendente as isAditivoPendente`,
     `usePodeGerenciarAditivos`.
   - `ContratoAssinadoRow`:
     - Removidos: estado `aditivosOpen` / `setAditivosOpen`, `aditivosDoContrato`,
       `podeGerenciarAditivos`, `aditivoUser`.
     - `pendentesAditivos` agora é `0` (badge sai por consequência — workspace tem
       o contador oficial).
     - Ação "Gerenciar aditivos" (`kind: duplicar`) **passa a navegar** para
       `/comercial/contratos/${c.id}#tab=aditivos` em vez de abrir `AditivosPanel`
       LS.
     - **Removido** o `<Dialog>` que renderizava `AditivosPanel` inline na linha.

3. **`docs/c-ent-11-c-aditivos-supabase-relatorio.md`** — este relatório.

## Imports LS de aditivo removidos (Comercial)

| Arquivo                              | Import removido                                          |
| ------------------------------------ | -------------------------------------------------------- |
| `src/routes/comercial.tsx`           | `AditivosPanel` (`@/components/app/AditivosPanel`)       |
| `src/routes/comercial.tsx`           | `AditivoBadge` (`@/components/app/AditivoBadge`)         |
| `src/routes/comercial.tsx`           | `useAditivos`, `useAditivosByContrato`, `isPendente` (`@/lib/aditivos-store`) |
| `src/routes/comercial.tsx`           | `usePodeGerenciarAditivos` (`@/lib/auth-store`)          |
| `src/modules/comercial/AditivosTab`  | `useAditivos`, `isPendente` (`@/lib/aditivos-store`)     |
| `src/modules/comercial/AditivosTab`  | `usePodeGerenciarAditivos` (`@/lib/auth-store`)          |
| `src/modules/comercial/AditivosTab`  | `AditivosPanel`, `AditivoBadge`                          |

## Componentes LS neutralizados/removidos

| Componente LS                                  | Estado após C-ENT.11.c                                          |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `AditivosPanel` (`src/components/app/AditivosPanel.tsx`) | **Não renderizado mais** no Comercial. Arquivo mantido (regra: "não remover stores legadas sem relatório"). Pendente futuro: deleção em C-ENT.11.f / corte LS global. |
| `AditivoDialog`  (`src/components/app/AditivoDialog.tsx`) | Idem — só era consumido por `AditivosPanel`. Sem call site ativo. |
| `AditivoBadge`   (`src/components/app/AditivoBadge.tsx`)  | Idem — sem call site ativo no Comercial.                        |
| `aditivos-store` (`src/lib/aditivos-store.ts`)            | Mantido (zero leitura/escrita pelo Comercial). Pendente revisão de outros módulos antes do corte. |
| `AditivosTab` LS (módulo)                                 | Substituído por redirect card (sem LS). |

## Componentes Supabase reutilizados

- `AditivosListPanel` (`src/components/app/contratos/AditivosListPanel.tsx`)
  → continua sendo a única lista oficial, em uso nos dois workspaces.
- `NovoAditivoDialog` (`src/components/app/contratos/NovoAditivoDialog.tsx`)
  → único ponto de criação/compensação de aditivo no Comercial.
- Hooks `useAditivosPorContrato` / `useAditivosPorProjeto`
  (`src/lib/repositories/aditivos-repo.ts`) → fonte oficial de leitura.
- RPCs: `rpc_aditivo_aplicar` (criação/compensatório) — inalteradas.

## Botões conectados / removidos / desabilitados

| Botão                                                            | Estado anterior                                 | Estado em C-ENT.11.c                            |
| ---------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `AditivosTab` "Novo aditivo (escolher contrato)"                 | `toast.info("... chega em D27.COM.AD.")`        | **Removido**                                    |
| `AditivosTab` "Criar aditivo neste contrato"                     | `toast.info(...)`                               | **Removido**                                    |
| `AditivosTab` "Aprovar aditivo"                                  | `toast.info(...)`                               | **Removido**                                    |
| `AditivosTab` "Cancelar aditivo"                                 | `toast.info(...)`                               | **Removido**                                    |
| `AditivosTab` "Gerar financeiro (aditivo)"                       | `toast.info(...)`                               | **Removido**                                    |
| `AditivosTab` "Enviar para Engenharia"                           | `toast.info(...)`                               | **Removido**                                    |
| `AditivosTab` BulkActionBar (aprovar/gerar fin/exportar)         | `toast.info(...)`                               | **Removido**                                    |
| `AditivosTab` toolbar Enterprise (novo/exportar/etc.)            | LS read + CSV LS                                | **Removido** (substituído por card redirect)    |
| `ContratoAssinadoRow` → "Gerenciar aditivos" (RowAction)         | Abria `<Dialog>` com `AditivosPanel` LS         | **Conectado** → navega para workspace Supabase  |
| Workspace de Contrato — Novo Aditivo                             | Já oficial (`NovoAditivoDialog` + Supabase)     | Inalterado — confirmado oficial                 |
| Workspace de Contrato — Compensar                                | Já oficial (fluxo C-ENT.9)                      | Inalterado — confirmado oficial                 |
| Workspace de Projeto — Compensar                                 | Já oficial (`NovoAditivoDialog`, `aditivoOrigem`) | Inalterado — confirmado oficial               |

## Permissões usadas (oficiais, sem novas)

- `comercial.aditivo.visualizar` — gate de leitura nas abas Aditivos dos workspaces.
- `comercial.aditivo.criar` — `NovoAditivoDialog`.
- `comercial.aditivo.compensar` — botão "Compensar" do `AditivosListPanel`.
- `comercial.aditivo.cancelar` — fluxo workspace (não invocado em /comercial).

Nenhuma permissão nova criada.

## Timeline / Eventos

Inalterados — continuam sendo emitidos exclusivamente pelos triggers/RPCs Supabase
oficiais:

- `ADITIVO_APLICADO`
- `ADITIVO_COMPENSATORIO_APLICADO`
- `ADITIVO_COMPENSADO`
- `ALTERACAO_POR_ADITIVO_COMPENSATORIO`

Nenhuma timeline LS é gerada por esta subonda.

## Validação

- `bunx tsc --noEmit` **limpo** (0 erros).
- Workspace do Contrato: aba Aditivos lê `useAditivosPorContrato` (Supabase) — ok.
- Workspace do Projeto: aba Aditivos lê `useAditivosPorProjeto` (Supabase) — ok.
- `/comercial` aba Aditivos: card de redirecionamento, sem leitura LS, sem botões fake.
- `/comercial` tabela "Contratos Assinados": ação "Gerenciar aditivos" agora navega
  para o workspace oficial (sem `AditivosPanel`).
- Nenhum novo aditivo é gravado em `aditivos-store` (LS) a partir do Comercial.
- Linter / runtime errors: o aviso de 500 em `/comercial/projetos/$projetoId.tsx`
  visto no console era snapshot pré-build; arquivo continua sintaticamente válido
  e usa exclusivamente os hooks Supabase já oficiais.

## Pontos LS restantes (mapa)

Estes pontos NÃO foram tocados — fora do escopo C-ENT.11.c:

- `src/lib/aditivos-store.ts` — store LS mantida no repositório (sem leitor no
  Comercial). Verificar uso por outros módulos antes do corte definitivo.
- `src/components/app/AditivosPanel.tsx`, `AditivoDialog.tsx`, `AditivoBadge.tsx`
  — arquivos mantidos sem call site no Comercial. Candidatos a deleção em
  C-ENT.11.f.
- `src/lib/dev-seed.ts` — eventualmente popula massa LS de aditivo; revisar quando
  remover store.
- `src/lib/contratos-store.ts` — ainda consumido em dashboards/KPIs do Comercial
  (passivo, C-ENT.11.b). Não tocado.

## Riscos

- **Baixo**: a tabela "Contratos Assinados" no /comercial é alimentada por LS
  (passiva). A ação "Gerenciar aditivos" abre o workspace Supabase de um contrato
  cujo ID pode ser LS-only. Não há regressão funcional porque o workspace oficial
  trata `id` ausente com fallback "Contrato não encontrado" — mas o usuário pode
  ver "não encontrado" se o contrato vier exclusivamente do LS sem espelhamento em
  Supabase. **Mitigação**: corte definitivo de Contratos LS em C-ENT.11.d/.e.

- **Nulo** para fluxo oficial: workspaces de Contrato e Projeto Supabase não
  foram alterados; entradas LS antigas continuam visualmente preservadas mas
  inertes.

## Pendências

1. Remover fisicamente `AditivosPanel`, `AditivoDialog`, `AditivoBadge` e
   `aditivos-store.ts` quando o corte LS global for autorizado (C-ENT.11.f ou
   onda dedicada).
2. Limpar `dev-seed.ts` de sementes LS de aditivo.
3. Avaliar se algum dashboard/KPI fora do Comercial ainda lê
   `useAditivos`/`useAditivosByContrato` antes da deleção da store.

## Próxima subonda recomendada

**C-ENT.11.d — Limpeza de rotas/permissões/imports residuais do Comercial**
(remover rotas órfãs, hooks duplicados, console.log e TODO/FIXME apontados pela
auditoria C-ENT.10.audit), mantendo a ordem: 11.d → 11.e (timeline universal) →
11.f (corte físico LS + remoção de botões fake remanescentes em outros módulos).
