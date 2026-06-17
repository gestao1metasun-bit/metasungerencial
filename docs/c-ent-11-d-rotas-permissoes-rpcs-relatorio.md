# C-ENT.11.d — Limpeza de Rotas, Permissões e RPCs Comerciais

Data: 2026-06-17
Onda: C-ENT.11.d (Sequencial com gate após 11.c)
Escopo: **classificação + redirecionamento seguro + documentação**. Zero remoção destrutiva.

---

## 1. Rotas Comerciais — Mapa e Classificação

Legenda: **A** Oficial e manter · **B** Legada e redirecionar · **C** Usada internamente · **D** Órfã para remoção futura

| Rota | Arquivo | Classe | Decisão / Observação |
|---|---|---|---|
| `/comercial` | `src/routes/comercial.tsx` | **A** | Hub oficial Comercial (abas Dashboard/Propostas/Contratos/Aditivos/Carteira/Comissões/Vendedores/Análise). Verdade de UI. |
| `/comercial/clientes` | `comercial.clientes.index.tsx` | **A** | Lista Supabase oficial. |
| `/comercial/clientes/$clienteId` | `comercial.clientes.$clienteId.tsx` | **A** | Workspace 360º cliente (C-ENT.1.b). |
| `/comercial/clientes/backfill` | `comercial.clientes.backfill.tsx` | **C** | Ferramenta operacional pontual (backfill LS→Supabase). Manter, restrita a admin. |
| `/comercial/contratos` | `comercial.contratos.index.tsx` | **A** | Lista oficial Supabase (C-ENT.11.b). |
| `/comercial/contratos/$contratoId` | `comercial.contratos.$contratoId.tsx` | **A** | Workspace oficial contrato + aditivos. |
| `/comercial/comissoes` | `comercial.comissoes.index.tsx` | **A** | Lista oficial Supabase (C-ENT.11.b). |
| `/comercial/comissoes/$comissaoId` | `comercial.comissoes.$comissaoId.tsx` | **A** | Workspace oficial comissão. |
| `/comercial/projetos/$projetoId` | `comercial.projetos.$projetoId.tsx` | **A** | Workspace projeto (corrigido em C-ENT.11 build-fix). |
| `/leads` | `leads.tsx` | **A** | Página oficial de Leads (não há aba "Leads" em `/comercial`). Mantida como rota standalone. |
| `/propostas` | `propostas.tsx` | **B → redirect** | **DUPLICA** a aba `orcamentos` de `/comercial` (que já renderiza `<PropostasPage embedded />`). Convertida em redirect `→ /comercial?tab=orcamentos` para preservar bookmarks sem manter tela duplicada como fonte alternativa. |
| `/analytics/comercial` | `analytics.comercial.tsx` | **A** | Painel Comercial oficial (DashboardShellStub). |
| `/dashboards/comercial` | `dashboards.comercial.tsx` | **B** (já redirect) | Redireciona `→ /analytics/comercial`. Mantido. |
| `/paineis/comercial` | absorvido por `paineis.$.tsx` | **B** (já redirect) | Splat `/paineis/*` → `/analytics/*`. Mantido. |
| `/paineis` | `paineis.tsx` | **B** (já redirect) | `→ /analytics`. Mantido. |

### Alterações de rota nesta onda

- **`src/routes/propostas.tsx`** — substituído `component: PropostasPage` por `beforeLoad → redirect({ to: "/comercial", search: { tab: "orcamentos" } })`.
- **`src/lib/route-tabs.ts`** — removida a entrada `/propostas` para não mostrar tab bar duplicada antes do redirect.
- **`src/lib/nav-structure.ts`** — comentário explicativo no `matches` do macro Comercial (mantém highlight ao chegar via link antigo).
- Nenhuma rota oficial alterada. Nenhuma rota apagada.

---

## 2. Permissões Comerciais — Matriz

Fonte: `enum_range(NULL::app_permission)` filtrado pelos prefixos comerciais. 65 permissões inventariadas.

### 2.1 Permissões oficiais consolidadas (manter)

| Permissão | Entidade | Ação | UI | RPC | RLS | Status | Obs |
|---|---|---|---|---|---|---|---|
| `comercial.visualizar` | módulo | ver | ✓ | – | ✓ | **Manter** | Gate de acesso ao macro Comercial. |
| `comercial.editar` | módulo | editar | ✓ | – | ✓ | **Manter** | Gate macro escrita. |
| `comercial.aprovar` | módulo | aprovar | ✓ | – | – | **Manter** | Gate macro aprovação. |
| `comercial.cancelar` | módulo | cancelar | ✓ | – | – | **Manter** | Gate macro cancelamento. |
| `comercial.cliente.{visualizar,criar,editar}` | cliente | CRUD | ✓ | ✓ | ✓ | **Manter** | Padrão canônico. |
| `comercial.lead.{visualizar,criar,editar,cancelar,converter}` | lead | CRUD+convert | ✓ | ✓ | ✓ | **Manter** | C-ENT.2. |
| `comercial.oportunidade.{visualizar,criar,editar,cancelar}` | oportunidade | CRUD | ✓ | ✓ | ✓ | **Manter** | C-ENT.1.a. |
| `comercial.proposta.{visualizar,criar,editar,cancelar,aprovar,reprovar,reabrir,revisar,gerar_nova,gerar_contrato,aprovar_excecao}` | proposta | ciclo | ✓ | ✓ | ✓ | **Manter** | C-ENT.2/C2/C3/C-ENT.3. |
| `comercial.contrato.{visualizar,criar,cancelar,editar_cadastro,assinar,assinar_excecao,enviar_assinatura,ver_assinatura}` | contrato | ciclo | ✓ | ✓ | ✓ | **Manter** | C5/C-ENT.5. |
| `comercial.projeto.{visualizar,editar_cadastro}` | projeto | ver/editar | ✓ | – | ✓ | **Manter** | Workspace projeto. |
| `comercial.aditivo.{visualizar,criar,cancelar,compensar}` | aditivo | ciclo | ✓ | ✓ | ✓ | **Manter** | C-ENT.8/9. |
| `comercial.carteira.{transferir,transferir_lote,ver_historico}` | carteira | governança | ✓ | ✓ | ✓ | **Manter** | C4. |
| `comercial.comissao.{visualizar,criar,editar,cancelar,liberar,marcar_paga,estornar,alterar_percentual,aprovar,substituir,gerar}` | comissão | ciclo | ✓ | ✓ | ✓ | **Manter** | C6/C-ENT.6. |
| `comercial.pipeline.configurar` | catálogo | admin | ✓ | – | ✓ | **Manter** | C1. |
| `comercial.parametro.configurar` | parâmetro | admin | ✓ | – | ✓ | **Manter** | C1. |

### 2.2 Duplicatas semânticas — **deprecação documentada (sem remoção nesta onda)**

| Permissão depreciada | Substituta oficial | Uso atual | Plano |
|---|---|---|---|
| `comercial.comissao.ver` | `comercial.comissao.visualizar` | nenhum | **Deprecar** — remover em C-ENT.11.e após varredura final. |
| `comercial.comissao.pagar` | `comercial.comissao.marcar_paga` | nenhum (UI/RPC usam `marcar_paga`) | **Deprecar** — remover em C-ENT.11.e. |
| `aditivo.criar` (sem prefixo) | `comercial.aditivo.criar` | resíduo legado | **Deprecar** — remover em C-ENT.11.e. |
| `contrato.assinar` (sem prefixo) | `comercial.contrato.assinar` | resíduo legado | **Deprecar** — remover em C-ENT.11.e. |
| `contrato.cancelar` (sem prefixo) | `comercial.contrato.cancelar` | resíduo legado | **Deprecar** — remover em C-ENT.11.e. |
| `contrato.gerar` (sem prefixo) | `comercial.proposta.gerar_contrato` | resíduo legado | **Deprecar** — remover em C-ENT.11.e. |
| `contrato.reabrir` (sem prefixo) | (não implementado oficialmente) | resíduo legado | **Deprecar** — remover em C-ENT.11.e. Reabertura de contrato segue spec C-ENT (cascata) — permissão a ser repensada nessa onda. |

> Política: **não remover enum value nesta onda** (operação `ALTER TYPE DROP VALUE` requer rebuild de todas as policies referenciadoras). Remoção planejada para **C-ENT.11.e**, após:
> 1. `grep` global confirmando zero uso em UI/RPC/RLS;
> 2. backup das policies dependentes;
> 3. migration única com DROP DEFAULT + DROP VALUE + recriação se necessário.

### 2.3 Convenções consolidadas

- **`ver` vs `visualizar`** → padrão canônico = **`visualizar`**.
- **`pagar` vs `marcar_paga`** → padrão canônico = **`marcar_paga`** (financeiro é consequência, comissão não paga sozinha).
- **`editar` vs `editar_cadastro`** → coexistem por design: `editar` = workflow de negócio, `editar_cadastro` = campos administrativos.
- **`cancelar` vs `arquivar`** → não há `arquivar` no Comercial; só `cancelar`.
- **`criar` vs `gerar`** → coexistem por design: `criar` = entidade nova manual, `gerar` = derivada via RPC oficial (`gerar_contrato`, `gerar_de_aditivo`).
- **Prefixo obrigatório `comercial.<entidade>.<acao>`** — permissões sem prefixo (`aditivo.criar`, `contrato.*`) são legadas (ver §2.2).

---

## 3. RPCs Comerciais — Inventário

Fonte: `pg_proc` filtrado por `rpc_(proposta|contrato|comissao|aditivo|carteira|cliente|lead|oportunidade)_*`. 34 RPCs inventariadas.

Legenda: **A** Em uso ativo · **B** Próxima onda · **C** Obsoleta · **D** Órfã

### 3.1 Propostas

| RPC | Repo / chamador | Permissão | Classe | Decisão |
|---|---|---|---|---|
| `rpc_proposta_criar_do_lead` | `propostas-supabase-repo.ts` | `proposta.criar` | A | Manter. |
| `rpc_proposta_aprovar` | `comercial-processos-repo.ts` | `proposta.aprovar` | A | Manter. |
| `rpc_proposta_reprovar` | `comercial-processos-repo.ts` | `proposta.reprovar` | A | Manter. |
| `rpc_proposta_cancelar` | `propostas-supabase-repo.ts` + `comercial-processos-repo.ts` | `proposta.cancelar` | A | Manter (duplo consumer OK). |
| `rpc_proposta_reabrir` | `comercial-processos-repo.ts` | `proposta.reabrir` | A | Manter. |
| `rpc_proposta_solicitar_revisao` | `propostas-revisao-repo.ts` + `propostas-supabase-repo.ts` | `proposta.revisar` | A | Manter. |
| `rpc_proposta_renovar_validade` | `propostas-revisao-repo.ts` | `proposta.editar` | A | Manter. |
| `rpc_proposta_marcar_vencidas` | `propostas-revisao-repo.ts` | (job) | A | Manter — batch operacional. |
| `rpc_proposta_solicitar_aprovacao_excecao` | `comercial-c3-c4-repo.ts` | `proposta.aprovar_excecao` | A | Manter (C3). |
| `rpc_proposta_decidir_aprovacao_excecao` | `comercial-c3-c4-repo.ts` | `proposta.aprovar_excecao` | A | Manter (C3). |
| `rpc_proposta_gerar_contrato` | `GerarContratoDialog.tsx` + `comercial-processos-repo.ts` | `proposta.gerar_contrato` | A | Manter. |

### 3.2 Contratos

| RPC | Repo / chamador | Permissão | Classe | Decisão |
|---|---|---|---|---|
| `rpc_contrato_gerar_de_propostas` | `contratos-supabase-repo.ts` | `contrato.criar` | A | Manter. |
| `rpc_contrato_cancelar` | `contratos-supabase-repo.ts` | `contrato.cancelar` | A | Manter. |
| `rpc_contrato_assinar` | `comercial-assinatura-repo.ts` | `contrato.assinar` | A | Manter (C5). |
| `rpc_contrato_marcar_engenharia_liberada` | `comercial-assinatura-repo.ts` | – | A | Manter (C5 paralelo). |
| `rpc_contrato_marcar_financeiro_liberado` | `comercial-assinatura-repo.ts` | – | A | Manter (C5 paralelo). |
| `rpc_contrato_enviar_assinatura` | `comercial-processos-repo.ts` | `contrato.enviar_assinatura` | A | Manter. |
| `rpc_contrato_enviar_engenharia` | `comercial-processos-repo.ts` | – | A | Manter. |
| `rpc_contrato_enviar_financiamento` | `comercial-processos-repo.ts` | – | A | Manter. |
| `rpc_contrato_gerar_aditivo` | `comercial-processos-repo.ts` | `aditivo.criar` | A | Manter (wrapper de `rpc_aditivo_aplicar`). |

### 3.3 Aditivos / Carteira / Clientes

| RPC | Repo / chamador | Permissão | Classe | Decisão |
|---|---|---|---|---|
| `rpc_aditivo_aplicar` | `aditivos-repo.ts` + `NovoAditivoDialog.tsx` + `AditivosTab.tsx` | `aditivo.criar` | A | Manter (C-ENT.8/9). |
| `rpc_carteira_transferir_individual` | `comercial-c3-c4-repo.ts` | `carteira.transferir` | A | Manter (C4). |
| `rpc_carteira_transferir_lote` | `comercial-c3-c4-repo.ts` | `carteira.transferir_lote` | A | Manter (C4). |
| `rpc_cliente_buscar_similar` | `oportunidades-repo.ts` + `ClienteCadastroSupabaseDialog.tsx` + `clientes-backfill.ts` + `LeadsPage.tsx` | `cliente.criar` | A | Manter — dedup oficial. |

### 3.4 Comissões

| RPC | Repo / chamador | Permissão | Classe | Decisão |
|---|---|---|---|---|
| `rpc_comissao_liberar` | `comercial-comissao-repo.ts` | `comissao.liberar` | A | Manter (C6). |
| `rpc_comissao_marcar_paga` | `comercial-comissao-repo.ts` | `comissao.marcar_paga` | A | Manter (C6). |
| `rpc_comissao_cancelar` | `comercial-comissao-repo.ts` | `comissao.cancelar` | A | Manter (C6). |
| `rpc_comissao_estornar` | `comercial-comissao-repo.ts` | `comissao.estornar` | A | Manter (C6). |
| `rpc_comissao_reabrir` | `comercial-comissao-repo.ts` | `comissao.editar` | A | Manter (C6). |
| `rpc_comissao_alterar_percentual` | `comercial-comissao-repo.ts` | `comissao.alterar_percentual` | A | Manter. |
| `rpc_comissao_aprovar` | `comercial-comissao-repo.ts` | `comissao.aprovar` | A | Manter. |
| `rpc_comissao_substituir` | `comercial-comissao-repo.ts` | `comissao.substituir` | A | Manter. |
| `rpc_comissao_gerar_de_aditivo` | `comercial-comissao-repo.ts` | `comissao.gerar` | A | Manter (C-ENT.9). |
| `rpc_comissao_gerar_de_contrato` | `comercial-processos-repo.ts` | `comissao.gerar` | A | Manter. |

### 3.5 Resultado

- **0 RPCs órfãs** detectadas no inventário comercial. Todas as 34 RPCs têm pelo menos um consumer ativo no frontend.
- **0 RPCs obsoletas** identificadas.
- **0 RPCs removidas** nesta onda (regra: não remover sem relatório posterior).

---

## 4. Redirecionamentos seguros

| De (legado) | Para (oficial) | Mecanismo | Status |
|---|---|---|---|
| `/propostas` | `/comercial?tab=orcamentos` | `beforeLoad → redirect` | **Aplicado nesta onda.** |
| `/dashboards/comercial` | `/analytics/comercial` | `beforeLoad → redirect` | Pré-existente (D14). |
| `/paineis/*` | `/analytics/*` | splat `beforeLoad → redirect` | Pré-existente (D14). |
| `/paineis` | `/analytics` | `beforeLoad → redirect` | Pré-existente (D14). |
| Aditivos legados → `/comercial/contratos/$id#tab=aditivos` | – | Card de redirecionamento (`AditivosTab` + `ContratoAssinadoRow`) | Aplicado em C-ENT.11.c. |
| Contratos legados LS → `/comercial/contratos` | – | `ContratosRedirectCard` | Aplicado em C-ENT.11.b. |
| Comissões legadas LS → `/comercial/comissoes` | – | `ComissoesTab` redirect | Aplicado em C-ENT.11.b. |

Nenhuma rota oficial perdeu acesso. Nenhum bookmark conhecido fica órfão.

---

## 5. Decisões da onda

1. **`/propostas` deixou de ser tela alternativa** — agora apenas redirect para `/comercial?tab=orcamentos`. Removida entrada em `route-tabs.ts` para evitar tab bar duplicada antes do redirect. Mantido em `matches` do nav-structure para destacar o macro Comercial ao chegar via link legado.
2. **Permissões legadas (`ver`, `pagar`, `aditivo.criar`, `contrato.*` sem prefixo) ficam marcadas como depreciadas** mas não são removidas nesta onda — `ALTER TYPE DROP VALUE` em enum com policies dependentes exige migration dedicada e rollout controlado, planejado para **C-ENT.11.e**.
3. **Nenhuma RPC removida** — inventário confirmou 100% das 34 RPCs com consumer ativo.
4. **Rotas oficiais inalteradas** — `/comercial`, `/comercial/clientes(/...)`, `/comercial/contratos(/...)`, `/comercial/comissoes(/...)`, `/comercial/projetos/$projetoId`, `/leads`, `/analytics/comercial`.
5. **Backfill (`/comercial/clientes/backfill`) classificado como C (uso interno)** — mantido, sem mexer.

---

## 6. Itens mantidos · depreciados · remoção futura

### 6.1 Mantidos (sem alteração)

- Todas as 13 rotas comerciais oficiais listadas em §1.
- Todas as 34 RPCs comerciais listadas em §3.
- ~58 permissões canônicas listadas em §2.1.

### 6.2 Depreciados (documentação, sem remoção)

- 7 permissões em §2.2 (`comercial.comissao.ver`, `comercial.comissao.pagar`, `aditivo.criar`, `contrato.assinar`, `contrato.cancelar`, `contrato.gerar`, `contrato.reabrir`).

### 6.3 Remoção futura (planejada C-ENT.11.e)

- 7 enum values depreciados (após varredura final + migration controlada).
- Eventual consolidação de `/leads` se vier a ser absorvido em `/comercial` (não decidido).

---

## 7. Validação

| Check | Resultado |
|---|---|
| `tsc --noEmit` | ✅ limpo (0 erros, 0 warnings) |
| Rota `/comercial/clientes` | ✅ inalterada |
| Rota `/comercial/contratos` | ✅ inalterada |
| Rota `/comercial/projetos/$projetoId` | ✅ inalterada |
| Rota `/comercial/comissoes` | ✅ inalterada |
| Rota `/propostas` | ✅ agora redireciona para `/comercial?tab=orcamentos` |
| Navegação `Link to="/propostas"` (não existem call sites) | ✅ nenhum link interno quebra |
| `routeTree.gen.ts` | Regenerado automaticamente pelo plugin |
| LS comercial | Inalterado — onda foi puramente classificatória/redirect |

---

## 8. Riscos

- **Baixo** — redirect `/propostas` é client-side; bookmarks abrem corretamente em `/comercial?tab=orcamentos`. Caso o usuário tenha algum dashboard externo apontando para `/propostas`, o redirect preserva.
- **Médio** — permissões depreciadas continuam concedidas a usuários antigos; podem ser usadas por policy/admin manual. A remoção em C-ENT.11.e deve verificar `role_permissions` e `user_permission_overrides` antes do DROP.
- **Zero** — nenhum dado tocado, nenhum RPC removido, nenhuma regra de negócio alterada.

---

## 9. Próxima subonda recomendada

**C-ENT.11.e — Corte controlado de permissões depreciadas + remoção de tela `/propostas` standalone (apenas o redirect persiste).**

Pré-requisitos:
1. Varredura global confirmando zero uso (UI/RPC/RLS) das 7 permissões legadas;
2. Snapshot das policies e `role_permissions`/`user_permission_overrides` dependentes;
3. Migration única atômica (DROP VALUE + recriação de policies se houver dependência);
4. Mesma onda: pode validar se `/leads` deve ser absorvido em `/comercial` como nova tab (decisão pendente).

Após C-ENT.11.e: **C-ENT.11.f — Corte final de stores LS comerciais residuais** (rescisões/renegociações que ainda vivem em LS, fora do escopo Comercial nuclear).
