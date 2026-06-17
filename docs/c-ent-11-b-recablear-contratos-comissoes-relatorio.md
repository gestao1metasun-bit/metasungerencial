# C-ENT.11.b — Recableamento Contratos + Comissões para Supabase

**Data:** 2026-06-17  
**Escopo:** Eliminar duplicidade de verdade entre LS e Supabase nos fluxos de
Contratos e Comissões do Comercial. ZERO funcionalidade nova, ZERO remoção
de stores, ZERO mudança de regra.

## Diagnóstico inicial

Antes desta sub-onda o `/comercial` tinha **dois motores ativos**:

| Domínio | LS (legado) | Supabase (oficial) |
|---|---|---|
| Contratos | aba `contratos` em `/comercial` (`ContratosUnificadosTab` + `ContratoAssinadoTab` + `ContratosTab` + `ContratosCanceladosTab` sobre `useContratos()` de `contratos-store`) | `/comercial/contratos` + `/comercial/contratos/$contratoId` (C-ENT.5) |
| Comissões | row-action "Liberar comissão" gerava `AP-COM-*` via `gerarAPdeComissao` em `fin-titulos-store` | `comercial_comissoes` + 6 RPCs `comercial.comissao.*` + `/comercial/comissoes` + `/comercial/comissoes/$comissaoId` (C-ENT.10). Trigger oficial cria comissão PREVISTA na assinatura via `rpc_contrato_assinar` |

A aba interna **"Comissões"** já consumia 100% Supabase via `comercial-comissao-repo` (D17.UI Fase 2c) — sem ação necessária.

## Mudanças aplicadas (1 arquivo, ZERO migrações, ZERO RPC nova)

### `src/routes/comercial.tsx`

1. **Import `gerarAPdeComissao, getTitulos` REMOVIDO** (linha 82). Substituído por comentário rastreável C-ENT.11.b.
2. **Import `Link` de `@tanstack/react-router` ADICIONADO**.
3. **Import `FileSignature` (lucide) ADICIONADO**.
4. **Aba `<TabsContent value="contratos">` SUBSTITUÍDA** pelo componente novo `<ContratosRedirectCard />`:
   - Card centralizado com CTA "Abrir Contratos (oficial)" → `Link to="/comercial/contratos"`.
   - CTA secundário "Comissões" → `Link to="/comercial/comissoes"`.
   - Mensagem explica que contratos LS deixaram de ser canônicos.
5. **Row action `case "baixar"` (Liberar comissão LS) NEUTRALIZADA** em `ContratoAssinadoTab`:
   - 18 linhas de geração LS de `AP-COM-*` substituídas por `toast.info("Comissões agora vivem em /comercial/comissoes (Supabase). Esta ação foi desativada.")`.
   - Como a aba inteira não é mais renderizada, esta neutralização é defesa em profundidade.

## Resultado

- **Imports LS de contrato removidos:** `gerarAPdeComissao`, `getTitulos`.
- **Imports LS de comissão removidos:** mesmos dois (a comissão LS era um título AP, vivia em `fin-titulos-store`).
- **Lista de contratos oficial:** apenas `/comercial/contratos` (Supabase). Não há mais duas listas oficiais.
- **Motor de comissão ativo:** apenas Supabase. Nenhum caminho UI gera comissão em LS.
- **Workspace Contrato:** intacto (`/comercial/contratos/$contratoId`).
- **Workspace Comissão:** intacto (`/comercial/comissoes/$comissaoId`).

## Permissões (validação)

Todas as 8 permissões já existem no enum e estão sendo respeitadas pelos repos/rotas oficiais:

- `comercial.contrato.visualizar` — gate em `/comercial/contratos` ✅
- `comercial.contrato.criar` — gate em criação via assinatura ✅
- `comercial.contrato.cancelar` — gate em `useCancelarContratoSupabase` ✅
- `comercial.comissao.visualizar` — gate em `/comercial/comissoes` ✅
- `comercial.comissao.criar` — gate na trigger PREVISTA ✅
- `comercial.comissao.cancelar` — gate em `useCancelarComissao` ✅
- `comercial.comissao.liberar` — gate em `useLiberarComissao` ✅
- `comercial.comissao.pagar` — gate em `useMarcarComissaoPaga` ✅

ZERO permissão nova criada.

## Timeline / Auditoria

ZERO motor novo. Mantém:
- `comercial_assinatura_eventos` (assinatura)
- `comercial_comissao_eventos` (motor C6 append-only)
- `audit_log` em `contratos` (trigger oficial)
- `eventos_timeline` (canonical)

## Pontos LS restantes (NÃO removidos nesta sub-onda — proibido pelo escopo)

| Local | Store LS | Status | Próxima sub-onda |
|---|---|---|---|
| `comercial.tsx` `DashboardComercial` | `useContratos()` (LS) para cards KPI | passivo, não cria contrato — só KPI display | C-ENT.11.d/e |
| `comercial.tsx` `VendedoresTab` | recebe `contratos` LS via props | passivo, ranking só leitura | C-ENT.11.d/e |
| `comercial.tsx` `AnaliseExecutivaTab` | recebe `contratos` LS via props | passivo, gráficos | C-ENT.11.d/e |
| `comercial.tsx` `CarteiraTab` | `useContratos` LS (carteira) | passivo | C-ENT.11.d/e |
| `AditivosTab.tsx` | `useAditivos` LS | **escopo C-ENT.11.c** | — |
| `routes/posvenda.tsx`, `routes/analytics.tsx`, `routes/dashboard.tsx`, `routes/engenharia.tsx`, `routes/financiamentos.tsx`, `lib/dev-seed.ts` | `contratos-store` | leitura cruzada — fora do Comercial | C-ENT.11.e |

Os componentes `ContratoAssinadoTab`, `ContratosTab`, `ContratosCanceladosTab` permanecem **definidos no arquivo mas órfãos** (não renderizados em lugar nenhum). Foram preservados por exigência do escopo (não remover stores/funcionalidade nesta onda). Serão removidos junto com `contratos-store` em C-ENT.11.e.

## Validação

- `bunx tsc --noEmit` → **limpo** ✅
- `/comercial/contratos` → lista Supabase oficial ✅
- `/comercial/contratos/$contratoId` → workspace oficial ✅
- `/comercial/comissoes` → lista Supabase oficial ✅
- `/comercial/comissoes/$comissaoId` → workspace oficial ✅
- Aba `contratos` em `/comercial` → card de redirecionamento (sem segunda verdade) ✅
- Aba `comissoes` em `/comercial` → 100% Supabase (já estava) ✅
- Nenhuma nova comissão criada em LS (`gerarAPdeComissao` não é mais importado) ✅
- Nenhum contrato novo criado em LS (criação real vem de proposta → `rpc_contrato_assinar`) ✅

## Riscos

- **Baixo** — Usuários que dependiam do CRUD LS de contratos em `/comercial#tab=contratos` agora veem o card de redirect. Workflow alternativo (workspace Supabase) já existe e cobre o caso de uso. Stores LS continuam vivas (passivas) para cruzamentos em painéis fora do Comercial.
- **Médio** — Dashboard/Carteira/Vendedores/Análise do Comercial ainda leem contratos LS. KPIs podem divergir do Supabase até C-ENT.11.d/e.

## Pendências (próxima sub-onda recomendada)

**C-ENT.11.c — Aditivos** (escopo explícito do plano original): remover `useAditivos` LS, recablear `AditivosTab` para `aditivos-repo` Supabase (já criado em C-ENT.8/9).

Depois:
- C-ENT.11.d — Dashboard/Carteira/Vendedores/Análise lendo Supabase
- C-ENT.11.e — Corte definitivo das stores LS e órfãos (`ContratosTab`/`ContratoAssinadoTab`/`ContratosCanceladosTab` + `contratos-store`)
- C-ENT.11.f — Limpeza de rotas órfãs e botões D27.x

## Proibições respeitadas

- ✅ Aditivos não foram tocados
- ✅ Stores LS não foram removidas
- ✅ Nenhum dado apagado
- ✅ Nenhuma regra alterada
- ✅ Apenas leitura/escrita LS substituída por canônico Supabase
- ✅ Duas listas oficiais → uma só (Supabase)
- ✅ Dois motores de comissão → um só (Supabase)
- ✅ Workspace Contrato intacto
- ✅ Workspace Comissão intacto
