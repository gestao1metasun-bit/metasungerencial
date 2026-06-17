# Auditoria — Módulo Comercial (read-only)

Data: 2026-06-17
Escopo: rotas `/comercial*`, `/leads`, `/propostas`, `/dashboards/comercial`, `/analytics/comercial`, módulos `src/modules/{comercial,leads,propostas}`, componentes `src/components/app/{comercial,contratos,comissoes,universal}`, repositórios `src/lib/repositories/{comercial-*,contratos*,propostas*,leads-repo,aditivos-repo,oportunidades-repo,timeline-repo,anexos-repo}` e migrações `rpc_*` comerciais.
Método: estática (rg/grep/leitura). Nada foi modificado.

---

## 0. Sumário executivo

| Indicador | Valor |
|---|---|
| Telas comerciais auditadas | 13 rotas (`comercial.tsx` + 8 sub-rotas + leads/propostas + 2 dashboards) |
| Linhas em `comercial.tsx` | **5.793** (monólito — maior risco do módulo) |
| Imports LS legados em código transacional | **8 módulos** (críticos: `contratos-store`, `clientes-store`, `aditivos-store`, `fin-titulos-store`, `fin-pendencias`, `contrato-base-store`, `leads/store`, `propostas/store`) |
| RPCs comerciais criadas em migrações | 30 |
| RPCs comerciais efetivamente consumidas pela UI | **9** (30%) |
| Permissões comerciais declaradas no enum | 54 |
| Permissões comerciais referenciadas pela UI | ~10 (`useHasPermission`) |
| Hooks Supabase exportados sem consumo | 12+ |
| Componentes duplicados (LS vs Supabase) | 3 pares confirmados |
| Rotas órfãs | 3 (`/leads`, `/propostas`, `/dashboards/comercial`) |
| TODO/placeholder explícito ("chega em D27.x") | **10 ocorrências** em `comercial.tsx` |
| `console.warn` em fluxo de salvar | 1 (`LeadsPage.tsx:410`) |
| Maturidade real do módulo | **~55–60%** (vs ~95% declarado nas memórias C-ENT) |

**Tese central:** as ondas C-ENT.1..10 entregaram a **fundação Supabase paralela** (oportunidades + propostas/contratos/projetos/aditivos/comissões + timeline/anexos universais), mas a tela operacional `comercial.tsx` continua **100% LS** e ninguém migrou os fluxos antigos. O resultado é um módulo bifurcado, com dois universos de dados, dois componentes para cada coisa, ~70% de RPCs ociosas e UX inconsistente. O Workspace Supabase (`/comercial/contratos/$id`, `/comercial/comissoes/$id`, `/comercial/projetos/$id`) é a única parte aderente à arquitetura oficial.

---

## 1. CRÍTICOS — bloqueiam fechamento da Onda Comercial

### 1.1 `comercial.tsx` opera 100% em LS (5.793 linhas, fonte legada)
Arquivo `src/routes/comercial.tsx` é o módulo principal exibido em `/comercial#tab=*` (Dashboard/Orçamentos/Contratos/Aditivos/Carteira/Comissões/Vendedores/Análise). Importa e consome:

- `useContratos`, `upsertContrato`, `cancelarContrato`, `reativarContrato`, `aprovarContratoAssinado`, `aprovarProjeto`, `liberarContratoParaGerar`, `revogarLiberacaoContrato`, `retornarContratoParaGerado`, `retornarContratoParaARedigir`, `solicitarAlteracaoContrato`, `validateContratoCompleto` — todos de `@/lib/contratos-store` (LS).
- `addClienteFull`, `findClienteByDoc`, `updateClienteFull` — `@/lib/clientes-store` (LS).
- `useAditivos`, `useAditivosByContrato`, `AditivosPanel` — `@/lib/aditivos-store` (LS).
- `gerarAPdeComissao`, `getTitulos` — `@/lib/fin-titulos-store` (LS, fere `D15` charter — financeiro fora do Supabase).
- `addPendencia` — `@/lib/fin-pendencias` (LS).
- `useContratoBase`, `setContratoBase`, `getContratoBase` — `@/lib/contrato-base-store` (LS).
- `useLeads` — `@/modules/leads/store` (LS).
- Seeds de mock: `contratos`, `vendedores`, `propostas` de `@/lib/mock-data` (`vendedoresList` é state local com seed mock).
- 3 acessos `localStorage` diretos (linhas 5641, 5643, 5787) — viola charter D15 (`localStorage` fora de repo).

**Impacto:** dados criados/aprovados/assinados/cancelados na tela `/comercial` **não chegam ao Supabase**; o Workspace `/comercial/contratos/$id` lê outra base. O usuário tem duas verdades.

**Sub-rotas Supabase já funcionais (mas ilhadas):** `/comercial/contratos`, `/comercial/contratos/$id`, `/comercial/projetos/$id`, `/comercial/comissoes`, `/comercial/comissoes/$id`, `/comercial/clientes`, `/comercial/clientes/$id`.

### 1.2 Comissão duplicada: `comercial.tsx` chama `gerarAPdeComissao` LS, ignorando motor C-ENT.10
Linha 688 de `comercial.tsx` ao aprovar contrato gera **AP de comissão direto em `fin-titulos-store` (LS)**. Em paralelo, o trigger Supabase `tg_comercial_comissao_criar_de_assinatura` (C5+C6) já cria comissão PREVISTA na tabela `comercial_comissoes`. Resultado:
- Comissão duplicada (uma em LS, outra em Supabase).
- Motor RPC oficial (`rpc_comissao_aprovar/liberar/marcar_paga/...`) nunca é acionado pela tela principal.
- `ComissoesTab` (em `/comercial#tab=comissoes`) lê Supabase, mas a comissão criada pela aprovação na mesma tela vai pro LS. Inconsistência garantida.

### 1.3 RPCs comerciais ociosas (sem chamador na UI)
30 RPCs criadas, **9 consumidas**. Não chamadas em nenhum lugar do frontend (verificadas via grep `rpc(`):

| RPC | Onda | Status |
|---|---|---|
| `rpc_contrato_assinar` | C5 | órfã (assinatura é simulada na UI LS) |
| `rpc_contrato_enviar_assinatura` | C2 | órfã |
| `rpc_contrato_enviar_engenharia` | C5 | órfã |
| `rpc_contrato_enviar_financiamento` | C5 | órfã |
| `rpc_contrato_marcar_engenharia_liberada` | C5 | órfã |
| `rpc_contrato_marcar_financeiro_liberado` | C5 | órfã |
| `rpc_contrato_gerar_aditivo` | C8(antiga) | órfã (substituída por `rpc_aditivo_aplicar`) |
| `rpc_proposta_aprovar` | C2 | órfã |
| `rpc_proposta_reprovar` | C2 | órfã |
| `rpc_proposta_reabrir` | C2 | órfã |
| `rpc_proposta_gerar_contrato` | C3 | órfã (UI usa `rpc_contrato_gerar_de_propostas` via Workspace) |
| `rpc_proposta_solicitar_aprovacao_excecao` | C3 | órfã |
| `rpc_proposta_decidir_aprovacao_excecao` | C3 | órfã |
| `rpc_carteira_transferir_individual` | C4 | órfã |
| `rpc_carteira_transferir_lote` | C4 | órfã |
| `rpc_comissao_gerar_de_contrato` | C6 | órfã (existe trigger automático equivalente) |
| `rpc_comissao_reabrir` | C6 | hook exportado, mas nenhum botão na UI |

Risco: superfície de ataque/manutenção sem retorno; sinaliza que o design foi pensado, mas a UI nunca foi recableada.

### 1.4 Hooks Supabase exportados e nunca consumidos
- `useAssinarContrato`, `useMarcarEngenhariaLiberada`, `useMarcarFinanceiroLiberado` (`comercial-assinatura-repo.ts`) — nenhum import na UI.
- `useSolicitarAprovacaoExcecao`, `useDecidirAprovacaoExcecao`, `useAprovacoesExcecaoPendentes`, `useTransferirCarteiraIndividual`, `useTransferirCarteiraLote`, `useHistoricoCarteira` (`comercial-c3-c4-repo.ts`) — nenhum import.
- `useReabrirComissao` (`comercial-comissao-repo.ts`) — nenhum import.
- `useGerarNovaVersaoProposta` (`propostas-supabase-repo.ts`) — nenhum import.

### 1.5 Permissões comerciais declaradas sem uso
54 declaradas no enum; apenas ~10 referenciadas via `useHasPermission` na UI. Exemplos de declaradas e não verificadas:
- `comercial.contrato.assinar`, `assinar_excecao`, `enviar_assinatura`, `editar_cadastro`
- `comercial.proposta.aprovar`, `reprovar`, `reabrir`, `revisar`, `aprovar_excecao`, `gerar_contrato`
- `comercial.comissao.aprovar`, `liberar`, `marcar_paga`, `pagar`, `substituir`, `editar`, `estornar`, `alterar_percentual`, `ver`, `gerar`
- `comercial.carteira.transferir`, `transferir_lote`, `ver_historico`
- `comercial.pipeline.configurar`, `comercial.parametro.configurar`
- `comercial.projeto.editar_cadastro`
- `comercial.lead.editar`, `cancelar`, `converter`

Há também **redundância semântica**:
- `comercial.comissao.ver` vs `comercial.comissao.visualizar` (ambas existem)
- `comercial.comissao.marcar_paga` vs `comercial.comissao.pagar` (ambas existem)

---

## 2. ALTOS — UX inconsistente, débito imediato

### 2.1 Componentes duplicados (LS vs Supabase) coexistindo
| Função | Versão LS | Versão Supabase |
|---|---|---|
| Aditivos panel | `src/components/app/AditivosPanel.tsx` + `AditivoDialog.tsx` + `AditivoBadge.tsx` | `src/components/app/contratos/AditivosListPanel.tsx` + `NovoAditivoDialog.tsx` |
| Comissões listing | `comercial.tsx` inline (LS via `gerarAPdeComissao`) | `src/modules/comercial/ComissoesTab.tsx` (Supabase) + `ComissoesContratoPanel.tsx` |
| Cliente form | `comercial.tsx` (`addClienteFull/updateClienteFull`) | `ClienteCadastroSupabaseDialog.tsx` + `ClienteAutocompleteSupabase.tsx` |

`AditivosPanel` (LS) e `AditivosListPanel` (Supabase) renderizam dados de tabelas distintas; ambos visíveis na mesma sessão se o usuário trocar de aba.

### 2.2 Aba `projetos_db` ("4. Projetos DB") exposta ao usuário
`comercial.tsx:4072` — uma aba chamada literalmente `"4. Projetos DB"` no editor de contrato. Nome técnico vazado para UX; indica que coexistem "Projetos (LS)" e "Projetos DB (Supabase)" lado a lado na mesma tela.

### 2.3 Rotas órfãs / duplicidade de macros
- `/leads` (`src/routes/leads.tsx`) e `/propostas` (`src/routes/propostas.tsx`) são wrappers de 7 linhas que renderizam `LeadsPage`/`PropostasPage`. As mesmas páginas são montadas dentro de `/comercial#tab=orcamentos`. Resultado: 3 URLs renderizam o mesmo conteúdo; SEO/navegação inconsistente.
- `/dashboards/comercial` e `/analytics/comercial` coexistem com `/comercial#tab=dashboard` e `/comercial#tab=analise` — quatro entradas para "dashboard comercial".

### 2.4 Placeholders explícitos visíveis ao usuário
10 toasts dizem `"chega em D27.x"` em `comercial.tsx` (linhas 438–451). Botões visíveis com função real ausente:
- Editar contrato (Processos)
- Gerar aditivo (do menu Processos — apesar de a aba Aditivos funcionar)
- Enviar para Financiamentos
- Enviar para assinatura digital
- Recalcular / cancelar comissão (do menu Processos)
- Alterações em lote (consultor/cidade/canal/origem)
- 5+ relatórios (`rel_*`)
- Exportação CSV em lote
- Outras ações `_lote`

UX: o usuário clica, recebe `toast.info` e fica sem ação — clássica "ação fantasma".

### 2.5 Timeline universal: cobertura parcial e sem emissores
`timeline-repo.ts` declara 15 tipos de objeto. UI consome apenas em 3 workspaces (`contrato`, `projeto`, `comissao`). Não há:
- Painel de timeline em `cliente`, `lead`, `proposta`, `aditivo`, `oportunidade` (apesar dos workspaces existirem para alguns).
- Emissores manuais (todos os eventos hoje vêm de triggers das ondas C5/C6/C8/C9). Telas legadas (cancelar contrato, aprovar projeto, gerar AP) **não emitem timeline** — silenciosas.

### 2.6 Documentos universais: cobertura parcial
`DocumentosObjetoPanel` aparece em 3 workspaces (`contrato`, `projeto`, `comissao`). Faltam em `cliente` ($clienteId), `proposta`, `aditivo`, `oportunidade`, `lead`. Buckets RLS aplicados, mas UI ausente.

### 2.7 `localStorage` direto na rota (charter D15)
`src/routes/comercial.tsx:5641,5643,5787` usa `localStorage.getItem/setItem` cru fora de repositório — proibido pelo charter D15. `src/modules/propostas/components/PropostaList.tsx` tem 8 ocorrências similares (ordem/larguras de coluna — caem no permitido `ui.*` desde que migrem para `useColumnPrefs`).

---

## 3. MÉDIOS — manutenção / risco médio

### 3.1 `comercial.tsx` é um monólito de 5.793 linhas
Inclui Dashboard, lista de contratos, editor de contrato, aba comissões, aba carteira, aba vendedores, aba análise executiva, dialogs de cliente, dialogs de cláusulas, dialogs de aditivo legado, impressão e mais. Risco de regressão a cada toque.

Recomendação: extrair por aba para `src/modules/comercial/<aba>.tsx` (como já foi feito com `CarteiraTab` e `ComissoesTab`).

### 3.2 `CarteiraTab` lê LS e Supabase ao mesmo tempo
`src/modules/comercial/CarteiraTab.tsx:39-87` usa `useLeads()` (LS) **e** `useContratos()` (LS), ignorando `useContratosSupabase()`. Aba "Carteira" mostra dados LS, mas a carteira real (`comercial_carteira_transferencias`) tem 0 leitores no frontend.

### 3.3 Vendedores 100% mock
`vendedoresList = useState(vendedoresSeed)` (`comercial.tsx:171`) — seeds estáticos de `mock-data.ts`. Aba "Vendedores" não tem tabela Supabase nem CRUD real. Nenhuma onda C-ENT cobriu vendedores.

### 3.4 `console.warn` em fluxo de salvar lead
`src/modules/leads/LeadsPage.tsx:410` — `console.warn("[lead-save] abortado…")`. Pertence a `error_log` ou `logError`, não a console.

### 3.5 `propostas/store.ts` permanece LS canônico
Apesar de `propostas-supabase-repo.ts` + `propostas-revisao-repo.ts` existirem, `PropostasPage` e `PropostaList` continuam lendo `useContratos()` LS e `propostas/store.ts` LS. Só os fluxos Lead→Proposta e Cancelar/Revisão tocam Supabase.

### 3.6 Permissões usadas com 2 sintaxes
`useHasPermission("comercial.aditivo.compensar")` (camelCase scope `aditivo`) coexiste com permissões duplicadas (`ver` vs `visualizar`, `pagar` vs `marcar_paga`). Definir canon e remover duplicatas.

---

## 4. BAIXOS — polimento

- `oportunidades`: workspace de oportunidade não existe (`/comercial/oportunidades/$id` ausente); só há criação/edição embutidas em `comercial.clientes.$clienteId.tsx`. Listagem global também ausente.
- `propostas-revisao-repo.ts` exporta `useMarcarPropostasVencidas` — útil em cron/automação; documentar uso esperado ou remover.
- `useGerarComissaoDeAditivo` referenciada no relatório C-ENT.10 mas sem botão "Gerar comissão complementar" na UI de Aditivo.
- `comercial.clientes.backfill.tsx` é uma rota administrativa visível no link "Backfill" em `comercial.clientes.index.tsx:99`; sem gate de permissão visível.
- Comentário em `comercial.tsx:72`: `"LEGADO LS — write-back de contrato (1808) e check sync de duplicidade (3523) ainda dependem do store local."` — débito autodeclarado, sem ticket.
- `pedidos-venda.tsx` está fora do macro Comercial mas é parte do fluxo comercial (PV) — coerência de navegação a discutir.

---

## 5. Inventário rápido

### 5.1 Rotas comerciais (13)
- `comercial.tsx` (5793 l) — LS
- `comercial.clientes.index.tsx` (297 l) — Supabase ✓
- `comercial.clientes.$clienteId.tsx` (602 l) — Supabase ✓ (Cliente 360º)
- `comercial.clientes.backfill.tsx` (292 l) — admin
- `comercial.contratos.index.tsx` (235 l) — Supabase ✓
- `comercial.contratos.$contratoId.tsx` (435 l) — Supabase ✓
- `comercial.projetos.$projetoId.tsx` (277 l) — Supabase ✓
- `comercial.comissoes.index.tsx` (164 l) — Supabase ✓
- `comercial.comissoes.$comissaoId.tsx` (255 l) — Supabase ✓
- `leads.tsx` — wrapper órfão
- `propostas.tsx` — wrapper órfão
- `dashboards.comercial.tsx` — duplicado
- `analytics.comercial.tsx` — duplicado

### 5.2 Repositórios oficiais (12)
`aditivos-repo`, `clientes-supabase-repo`, `comercial-assinatura-repo`, `comercial-c3-c4-repo`, `comercial-catalogos-repo`, `comercial-comissao-repo`, `comercial-processos-repo`, `contratos-repo`, `contratos-supabase-repo`, `leads-repo`, `oportunidades-repo`, `projetos-contrato-repo`, `propostas-repo`, `propostas-revisao-repo`, `propostas-supabase-repo`, `timeline-repo`, `anexos-repo`. **Boa estrutura**, mau aproveitamento.

### 5.3 Stores LS legadas ainda no caminho transacional
`@/lib/contratos-store`, `@/lib/clientes-store`, `@/lib/aditivos-store`, `@/lib/contrato-base-store`, `@/lib/fin-titulos-store`, `@/lib/fin-pendencias`, `@/modules/leads/store`, `@/modules/propostas/store`.

---

## 6. Recomendação de próxima onda (sem implementar)

Sugestão: **C-ENT.11 — Corte do legado LS no Comercial**, em 4 subondas independentes:

1. **C-ENT.11.a — Quebrar `comercial.tsx`**: extrair `ContratosUnificadosTab`, `DashboardComercial`, `VendedoresTab`, `AnaliseExecutivaTab` para arquivos próprios em `src/modules/comercial/`. Reduz superfície sem mudar comportamento. (Pré-requisito mecânico.)
2. **C-ENT.11.b — Recablear assinatura/cancelar/aprovar contrato**: trocar `cancelarContrato`/`aprovarContratoAssinado`/`liberarContratoParaGerar` (LS) pelos RPCs órfãos `rpc_contrato_*`. Consome 6 RPCs já criadas, ativa 4 permissões já declaradas, mata `gerarAPdeComissao` (deixa o trigger C6 fazer o trabalho).
3. **C-ENT.11.c — Migrar aditivos legados**: remover `AditivosPanel`/`AditivoDialog` LS, manter só `AditivosListPanel`/`NovoAditivoDialog`. Apagar `@/lib/aditivos-store`.
4. **C-ENT.11.d — Limpar duplicidades**: remover `/leads`, `/propostas`, `/dashboards/comercial`, `/analytics/comercial`; renomear aba "4. Projetos DB" → única "Projetos"; deduplicar permissões (`ver`/`visualizar`, `pagar`/`marcar_paga`); plugar `DocumentosObjetoPanel`+`TimelineObjetoPanel` em cliente/proposta/aditivo/oportunidade; remover 10 placeholders "chega em D27.x" (ou implementar).

Alternativamente, **C-ENT.10b — Recableamento de Comissão**: só matar `gerarAPdeComissao` LS e fechar a duplicação de comissão (1 dia, alto valor).

---

## 7. Conclusão

O Comercial Enterprise tem **fundação Supabase sólida e bem desenhada** (oportunidades, propostas, contratos, projetos, aditivos com compensação, comissões versionadas, timeline/anexos universais, 30 RPCs SECURITY DEFINER). O **buraco está na UI**: a tela operacional `/comercial` ainda é a tela antiga (LS), 70% dos RPCs criados nunca foram chamados, hooks ficam ociosos no repositório, permissões idem. A maturidade declarada (~95%) só vale para o backend; a maturidade da experiência operacional é **~55–60%**.

**Próximo passo recomendado:** decidir entre (a) congelar Workspace Supabase como verdade e migrar incrementalmente a tela `/comercial`, ou (b) reescrever `/comercial` em ondas C-ENT.11.a..d. Sem isso, cada nova feature comercial cria mais bifurcação.
