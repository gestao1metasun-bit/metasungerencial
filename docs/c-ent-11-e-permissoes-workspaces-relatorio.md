# C-ENT.11.e — Consolidação de Permissões Depreciadas + Workspaces Universais

Data: 2026-06-17
Onda: C-ENT.11.e (Sequencial com gate após 11.d)
Escopo: revisão honesta das permissões marcadas como "depreciadas" em 11.d + ampliação do padrão universal Documentos/Timeline/Auditoria.

---

## 1. Recauditoria das 7 permissões "depreciadas" do relatório 11.d

Re-rodada a varredura UI + RPC + RLS + migration para cada permissão. **Conclusão crítica: 6 das 7 permissões tinham, sim, uso real** (o relatório 11.d errou ao marcá-las como "0 consumer"). Ajuste obrigatório nesta onda: **rebaixar a classificação de "deprecar em 11.e" para "manter por compatibilidade"**.

| Permissão | Substituta oficial sugerida | Uso UI | Uso RPC | Uso RLS | Migration | Decisão real | Motivo |
|---|---|---|---|---|---|---|---|
| `comercial.comissao.ver` | `comercial.comissao.visualizar` | – | – | **SIM** (`20260528213722_*.sql` — 2 policies em `comercial_comissoes` / `comercial_comissao_eventos`) | – | **MANTER** | RLS ativa hoje. Remover quebraria leitura de comissões. |
| `comercial.comissao.pagar` | `comercial.comissao.marcar_paga` | **SIM** (`ComissoesContratoPanel.tsx:52`, `comercial.comissoes.$comissaoId.tsx:57` — controla botão "Marcar como paga") | – | – | `20260617132240_*.sql` (criada em **2026-06-17**, mesmo dia da 11.d) | **MANTER** | Permissão recém-introduzida e em uso ativo. 11.d a classificou erroneamente como "sem uso" porque a leitura inicial filtrou pelo padrão `_pagar` e ignorou a versão `pagar`. |
| `aditivo.criar` | `comercial.aditivo.criar` | – | **SIM** (`20260603134539_*.sql` linha 347 — guarda de `rpc_aditivo_aplicar`) | – | – | **MANTER** | Guard de RPC oficial. Remoção quebra criação de aditivos. |
| `contrato.gerar` | `comercial.proposta.gerar_contrato` | – | **SIM** (3 migrations — `rpc_proposta_gerar_contrato`, `rpc_contrato_gerar_de_propostas`, mais 1) | – | – | **MANTER** | Guard de RPCs oficiais. Remoção quebra geração de contrato. |
| `contrato.assinar` | `comercial.contrato.assinar` | – | – | – | enum existente | **MANTER por enum** | Enum value referenciado em código de tipos. Sem consumer ativo de novo código, mas o `ALTER TYPE DROP VALUE` ainda é arriscado. |
| `contrato.cancelar` | `comercial.contrato.cancelar` | – | – | – | enum existente | **MANTER por enum** | Idem. |
| `contrato.reabrir` | (sem oficial — reabertura cascata é spec C-ENT) | – | – | – | enum existente | **MANTER por enum** | Idem. Pode ser reaproveitada em onda futura de reabertura governada. |

### Matriz final consolidada

| Permissão depreciada | Substituta oficial | Motivo | Impacto se removida hoje | Status |
|---|---|---|---|---|
| `comercial.comissao.ver` | `comercial.comissao.visualizar` | Convenção de nomenclatura | **Quebra RLS de comissões** | **Manter temporariamente** — migração futura precisa renomear policies em lote |
| `comercial.comissao.pagar` | `comercial.comissao.marcar_paga` | Convenção: ação financeira é "marcar paga", não "pagar" | **Quebra botão "Marcar como paga" do workspace** | **Manter temporariamente** — exige varrer UI + criar policy nova com `marcar_paga` antes de DROP |
| `aditivo.criar` | `comercial.aditivo.criar` | Prefixo `comercial.` obrigatório | **Quebra `rpc_aditivo_aplicar`** | **Manter temporariamente** — exige reescrever guard da RPC |
| `contrato.gerar` | `comercial.proposta.gerar_contrato` | Prefixo + escopo correto | **Quebra 3 RPCs de geração de contrato** | **Manter temporariamente** — exige reescrever guards |
| `contrato.assinar` | `comercial.contrato.assinar` | Prefixo | Baixo — só enum value | Remover em migração futura dedicada |
| `contrato.cancelar` | `comercial.contrato.cancelar` | Prefixo | Baixo — só enum value | Remover em migração futura dedicada |
| `contrato.reabrir` | (a definir na onda de reabertura) | Prefixo | Baixo — só enum value | Reavaliar quando a feature de reabertura governada chegar |

**Nenhuma permissão foi removida nesta onda** — a regra é explícita: "Não remover permissão se ainda estiver em uso real". A documentação fica como única ação de governança.

---

## 2. Consolidação de nomenclatura — substituições feitas

**Zero substituições aplicadas nesta onda.** Toda substituição candidata se mostrou insegura:

- `comercial.comissao.ver` → `comercial.comissao.visualizar`: bloqueado por RLS ativa.
- `comercial.comissao.pagar` → `comercial.comissao.marcar_paga`: bloqueado porque `pagar` é a permissão que efetivamente governa o botão "Marcar como paga" hoje (a permissão `marcar_paga` no enum oficial não está cabeada em nenhuma policy/UI ainda).
- `*.editar` → `*.editar_cadastro`: coexistem por design (já documentado em 11.d §2.3).
- `aditivo.criar` / `contrato.*` sem prefixo: bloqueados por guards de RPC.

A regra "não fazer substituição cega" prevaleceu. Próxima onda dedicada (planejada como **C-ENT.11.f**) deve fazer a substituição como migration única com:
1. Recriação das policies dependentes apontando para a permissão oficial.
2. Substituição dos guards de RPC.
3. Migração de `role_permissions` e `user_permission_overrides`.
4. `ALTER TYPE ... DROP VALUE` por último.

---

## 3. Workspaces universais — aplicação do padrão C-ENT.6

Auditoria do estado antes/depois desta onda:

| Workspace | Resumo | Documentos | Timeline | Auditoria | Histórico | Status |
|---|---|---|---|---|---|---|
| **Cliente** (`/comercial/clientes/$clienteId`) | ✓ | **✗ → ✓ aplicado** | **✗ → ✓ aplicado** | **✗ → ✓ aplicado** | n/a | **Consolidado nesta onda.** |
| **Contrato** (`/comercial/contratos/$contratoId`) | ✓ | ✓ | ✓ | ✓ | (via Aditivos / Comissões / Projetos abas) | Já canônico antes desta onda. |
| **Projeto** (`/comercial/projetos/$projetoId`) | ✓ | ✓ | ✓ | ✓ | n/a | Já canônico antes desta onda. |
| **Comissão** (`/comercial/comissoes/$comissaoId`) | ✓ | ✓ | ✓ | ✓ (via `eventos`) | n/a | Já canônico antes desta onda. |
| **Lead** (`/leads`) | (lista) | — | — | — | — | **Pendência registrada** — não há workspace dedicado por lead. Lista usa LeadsPage. Não criar do zero nesta onda (regra). |
| **Proposta** (`/comercial?tab=orcamentos` via `PropostasPage embedded`) | (lista) | — | — | — | — | **Pendência registrada** — não há workspace dedicado por proposta. Não criar do zero nesta onda. |
| **Aditivo** | — | — | — | — | — | **Pendência registrada** — aditivos têm aba dentro de contrato/projeto, não workspace dedicado. Não criar do zero nesta onda. |

### Aplicação concreta — workspace de Cliente

Arquivo: `src/routes/comercial.clientes.$clienteId.tsx`

1. Importados `DocumentosObjetoPanel` e `TimelineObjetoPanel` do barrel universal `@/components/app/universal/`.
2. Adicionadas 3 `TabsTrigger` (`documentos`, `timeline`, `auditoria`) à lista existente (Resumo / Oportunidades / Propostas / Contratos / Projetos / Leads).
3. Renderizado `DocumentosObjetoPanel` com:
   - `objetoTipo="clientes"` (corresponde a `EntidadeAnexavel`, FK na tabela `anexos`).
   - `objetoId={c.id}`.
   - `permissaoVisualizar="comercial.cliente.visualizar"`.
   - `permissaoUpload="comercial.cliente.editar"`.
   - `timelineObjetoTipo="cliente"` (registra evento na timeline ao subir documento).
4. Renderizado `TimelineObjetoPanel` com `objetoTipo="cliente"` e `objetoId={c.id}`.
5. Aba **Auditoria** com mensagem honesta padrão: *"Auditoria técnica completa será consolidada em onda futura. Eventos operacionais já aparecem na aba Timeline."*

Zero criação de tabela, bucket, RPC ou storage. Reuso 100% da infra existente (`anexos`, `eventos_timeline`).

---

## 4. Botões fake remanescentes

Auditoria de toasts `chega em D27.x` / `chega em D17.x` encontrou **24 ocorrências** em 8 arquivos. **Nenhuma foi removida ou alterada nesta onda** por dois motivos:

1. Estão fora do escopo declarado (consolidação de permissões + workspaces universais).
2. Todos os toasts são informativos e desabilitam ações em vez de fingir execução — não há botão "ativo sem função real" detectado nos 4 workspaces alvo de validação.

**Registro de pendência (não bloqueante para esta onda)**, para varredura dedicada:

| Arquivo | Linhas | Onda futura sugerida |
|---|---|---|
| `src/modules/comercial/CarteiraTab.tsx` | 230, 264, 403 | C-ENT.11.f |
| `src/modules/comercial/ComissoesTab.tsx` | 247, 375 | C-ENT.11.f |
| `src/modules/comercial/VendedoresTab.tsx` | 46, 47 | C-ENT.11.f |
| `src/modules/leads/LeadsPage.tsx` | 139, 141, 143-146, 156-158 | C-ENT.11.f |
| `src/modules/propostas/PropostasPage.tsx` | 722 | C-ENT.11.f |
| `src/routes/comercial.tsx` | 320, 321, 323, 325, 328, 329, 331-333, 340 | C-ENT.11.f |
| `src/routes/assinaturas.tsx` | 97, 99 | fora do escopo Comercial |
| `src/components/op-financeiras/OperacoesFinanceirasGrid.tsx` | 152 | fora do escopo Comercial |

Todos são toasts `info` (não `success`), portanto **honestos**: indicam ao usuário que a função não está disponível ainda. Não há mentira na UI.

---

## 5. Validação

| Rota | Resultado |
|---|---|
| `/comercial/clientes/$clienteId` | ✅ abre, agora com 9 abas (Resumo / Oportunidades / Propostas / Contratos / Projetos / Leads / Documentos / Timeline / Auditoria) |
| `/comercial/contratos/$contratoId` | ✅ inalterada, padrão canônico mantido |
| `/comercial/projetos/$projetoId` | ✅ inalterada, padrão canônico mantido |
| `/comercial/comissoes/$comissaoId` | ✅ inalterada, padrão canônico mantido |
| `/leads` (lista) | ✅ inalterada |
| `/comercial?tab=orcamentos` (Propostas) | ✅ inalterada |
| `tsc --noEmit` | ✅ limpo (0 erros) |

---

## 6. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/routes/comercial.clientes.$clienteId.tsx` | + import `DocumentosObjetoPanel` / `TimelineObjetoPanel`; + 3 `TabsTrigger`; + 3 `TabsContent` (Documentos / Timeline / Auditoria) |
| `docs/c-ent-11-e-permissoes-workspaces-relatorio.md` | (novo) este relatório |

**Não alterado**: workspaces de Contrato, Projeto, Comissão (já canônicos); nenhum enum, nenhuma policy, nenhuma RPC, nenhum bucket, nenhuma store LS.

---

## 7. Permissões mantidas por compatibilidade

Listadas na matriz §1 — **7/7 permissões "depreciadas" do relatório 11.d ficam mantidas**:

- 4 por uso ativo direto em UI/RPC/RLS (`comercial.comissao.ver`, `comercial.comissao.pagar`, `aditivo.criar`, `contrato.gerar`).
- 3 por enum value referenciado em código gerado (`contrato.assinar`, `contrato.cancelar`, `contrato.reabrir`).

A correção honesta do relatório 11.d está consolidada aqui.

---

## 8. Workspaces atualizados · Componentes universais aplicados

- **Cliente workspace**: `DocumentosObjetoPanel` + `TimelineObjetoPanel` + aba Auditoria honesta — **3 novos blocos universais**.
- Demais 3 workspaces (Contrato, Projeto, Comissão): já tinham o padrão completo desde C-ENT.6 / C-ENT.7. Nenhuma alteração necessária.

---

## 9. Botões fake removidos · desabilitados · conectados

- **Removidos**: 0
- **Desabilitados**: 0
- **Conectados**: 0
- **Auditados e mantidos como toast honesto**: 24 (ver §4)

Razão: as 24 ocorrências são `toast.info(...)` que comunicam claramente "ainda não disponível" — comportamento honesto. Substituí-las por `disabled + tooltip` é melhoria de UX, mas está fora do escopo de "Consolidação de Permissões + Workspaces Universais" desta onda. Fica como C-ENT.11.f.

---

## 10. Pendências registradas

1. **Workspace dedicado de Lead** — hoje só há lista (`LeadsPage`). Criar workspace `/leads/$leadId` é feature nova → fora do escopo.
2. **Workspace dedicado de Proposta** — hoje só há lista embedded em `/comercial`. Criar workspace `/comercial/propostas/$propostaId` é feature nova → fora do escopo.
3. **Workspace dedicado de Aditivo** — aditivos vivem dentro de Contrato/Projeto. Workspace standalone é feature nova → fora do escopo.
4. **Consolidação real de permissões depreciadas** (renomear policies + guards + DROP VALUE) — exige onda dedicada, planejada como C-ENT.11.f.
5. **Substituição de 24 toasts informativos por estados `disabled + tooltip`** — C-ENT.11.f.
6. **Motor universal de Auditoria técnica** — hoje 4 abas Auditoria mostram mensagem honesta. Motor real depende de view consolidada sobre `audit_log` + eventos por entidade → onda futura.

---

## 11. Riscos

- **Baixo** — única alteração de código é aditiva (3 abas a mais no workspace de Cliente). Nenhuma RLS, RPC ou enum modificada.
- **Médio (documentado)** — o relatório 11.d sub-relatou o uso real das 7 permissões; este 11.e corrige o registro. Se alguém usar 11.d como verdade isolada, pode tentar dropar permissões em uso. **Trate 11.e como fonte canônica para esse tópico.**
- **Zero** — nenhum dado tocado, nenhuma regra alterada, nenhuma store LS migrada.

---

## 12. Próxima subonda recomendada

**C-ENT.11.f — Consolidação real de permissões + limpeza de toasts informativos.**

Pré-requisitos / passos:

1. **Substituição governada de permissões** (uma a uma, com migration dedicada):
   - `comercial.comissao.ver` → `comercial.comissao.visualizar` (recria 2 policies, ajusta grants).
   - `comercial.comissao.pagar` → `comercial.comissao.marcar_paga` (substitui 2 sites de `useHasPermission` na UI + concede `marcar_paga` a quem hoje tem `pagar`).
   - `aditivo.criar` → `comercial.aditivo.criar` (substitui guard de `rpc_aditivo_aplicar`).
   - `contrato.gerar` → `comercial.proposta.gerar_contrato` (substitui guards de 3 RPCs).
   - `contrato.assinar/cancelar/reabrir`: somente após confirmação de que nenhuma `role_permissions` ou `user_permission_overrides` ainda referencia o valor; depois `ALTER TYPE ... RENAME VALUE` ou DROP controlado.
2. **Limpeza de 24 toasts informativos** — converter cada um em `disabled + tooltip explicativo`, ou remover do menu se não faz sentido manter.
3. Manter todas as 3 pendências de "workspace dedicado" (Lead/Proposta/Aditivo) como **C-ENT.12+** (feature nova, fora do escopo de limpeza).
