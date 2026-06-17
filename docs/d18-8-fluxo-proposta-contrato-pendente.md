# D18.8 — Fluxo Proposta Aprovada → Contrato Pendente (Minuta)

## Objetivo
Restaurar o fluxo correto: ao gerar contrato a partir de proposta aprovada, o
contrato nasce como **MINUTA** (não como ATIVO direto), abrindo um workspace
editável onde o usuário pode revisar dados contratuais e só então **Aprovar
contrato** ou **Cancelar minuta**.

Nada de LS legado: tudo em Supabase.

## Status canônicos

### Proposta
| Status | Significado |
|---|---|
| `GERADA`, `ATIVA`, `APROVADA` | Em aberto, pode gerar contrato |
| `CONTRATO_PENDENTE` | Contrato em minuta. Proposta travada |
| `CONTRATADA` | Contrato aprovado/ativo |
| `SUBSTITUIDA`, `CANCELADA`, `EXPIRADA`, `VENCIDA` | Histórico |

### Contrato
| Status | Etapa derivada (`classificarEtapaContrato`) |
|---|---|
| `MINUTA`, `PENDENTE_REVISAO`, `PENDENTE`, `RASCUNHO` | `minuta` (editável) |
| `ATIVO` | `ativo` |
| `CANCELADO` (ou `cancelado=true`) | `cancelado` |

A normalização vive em `src/lib/contrato-etapa.ts` para evitar `if` solto
por toda UI.

## Mudanças de banco

### Permissões novas (`app_permission`)
- `comercial.contrato.aprovar_minuta`
- `comercial.contrato.editar_minuta`

Concedidas para `admin_master`, `admin_geral` e `usuario`.

### Funções alteradas
- `rpc_proposta_gerar_contrato(p_proposta_id)` — agora cria contrato como
  `MINUTA` e marca a proposta como `CONTRATO_PENDENTE`. Bloqueia geração
  quando `valor_final <= 0`.
- `rpc_contrato_gerar_de_propostas(p_proposta_ids[])` — idem, em lote.

### Funções novas
- `rpc_contrato_aprovar_minuta(p_contrato_id, p_observacao)` — valida e
  transiciona MINUTA → ATIVO, marca proposta como CONTRATADA, registra
  `dados.aprovado_em`, `dados.aprovado_por`, `dados.etapa='APROVADO'`.
- `rpc_contrato_cancelar_minuta(p_contrato_id, p_motivo)` — cancela minuta
  com motivo ≥ 5 chars, devolve a proposta de origem para `APROVADA`.

Ambas são `SECURITY DEFINER`, `search_path=public`, `REVOKE anon`,
`GRANT authenticated`.

## Mudanças de UI

### `/comercial/contratos` (listagem)
- 3 abas oficiais: **Pendentes** (default) · **Ativos** · **Cancelados**.
- Badge "CONTRATO PENDENTE" em âmbar para minutas.
- Botão "Cancelar contrato" só aparece em contratos ativos — minutas usam o
  botão "Cancelar minuta" do workspace.

### `/comercial/contratos/$contratoId` (workspace)
Quando `etapa === "minuta"`:
- Novo `MinutaContratoPanel` injetado acima dos KPIs, em destaque âmbar.
- Permite editar: forma de pagamento, valor de entrada, qtd parcelas, 1º
  vencimento, data prevista de assinatura, prazo de execução,
  financiamento (banco + valor), endereço contratual, observações/cláusulas.
- Botões: **Salvar minuta**, **Cancelar minuta**, **Aprovar contrato**.
- Travado por design: `valor_total`, `potencia_kwp`, `modulos_qtde`,
  `inversor` — só mudam via nova proposta ou aditivo.
- "Aprovar contrato" valida campos mínimos e chama
  `rpc_contrato_aprovar_minuta`.

Quando `etapa === "ativo"`:
- Mostra normalmente "Novo Aditivo" e "Cancelar contrato".

### `/leads` → gerar contrato em lote
- Após `rpc_contrato_gerar_de_propostas`, o usuário é navegado direto para
  o workspace do contrato recém-criado em modo MINUTA.

## Permissões aplicadas
| Ação | Permissão |
|---|---|
| Ver contratos | `comercial.contrato.visualizar` |
| Criar minuta (gerar contrato) | `comercial.contrato.criar` / `contrato.gerar` |
| Editar minuta | `comercial.contrato.editar_minuta` |
| Aprovar minuta | `comercial.contrato.aprovar_minuta` |
| Cancelar minuta | `comercial.contrato.cancelar` |

## Arquivos novos
- `src/lib/contrato-etapa.ts`
- `src/components/app/contratos/MinutaContratoPanel.tsx`
- `docs/d18-8-fluxo-proposta-contrato-pendente.md`
- 3 migrações Supabase em `supabase/migrations/`

## Arquivos alterados
- `src/lib/repositories/comercial-processos-repo.ts` — `useAprovarMinutaContrato`, `useCancelarMinutaContrato`.
- `src/routes/comercial.contratos.index.tsx` — abas Pendentes/Ativos/Cancelados.
- `src/routes/comercial.contratos.$contratoId.tsx` — workspace com painel da minuta.
- `src/modules/leads/LeadsPage.tsx` — navega para o workspace após gerar contrato.

## Validações implementadas
**Não permite aprovar contrato se:**
- cliente ausente · proposta origem ausente · valor_total ≤ 0 · contrato
  cancelado · status não é minuta · forma de pagamento vazia · 1º
  vencimento ausente (quando não é à vista) · financiamento marcado sem
  banco/valor.

**Não permite cancelar minuta sem motivo ≥ 5 caracteres.**

## Riscos / Pendências
- Massa fixa D18.x atual (50 contratos `Ativo` + 1 `Pendente` + 6
  `Rascunho`) permanece como está; só novos contratos nascem como `MINUTA`.
- `PropostasPage` (LS) ainda dispara o helper LS `aprovarProposta`. Esse
  caminho continua criando contrato pendente LS por compatibilidade; a
  homologação real do fluxo D18.8 acontece em `/comercial/clientes/$id` →
  Propostas Supabase → Gerar contrato, e em `/leads` → seleção múltipla →
  Gerar contrato.
- Para forçar status "PENDENTE_REVISAO/APROVADO" como colunas próprias
  (em vez de viver em `dados.etapa`), abrir D18.8.b.

## Critério de aceite — status
- [x] Aprovar Proposta cria Contrato MINUTA (via Gerar contrato)
- [x] Proposta fica travada como CONTRATO_PENDENTE após geração
- [x] Proposta não vira CONTRATADA automaticamente
- [x] Contrato pendente abre workspace editável
- [x] Cláusulas/dados contratuais podem ser revisados
- [x] Aprovar Contrato transforma em ATIVO
- [x] Proposta passa para CONTRATADA apenas após aprovação do contrato
- [x] Nenhum fluxo Supabase usa LS
- [x] `tsc --noEmit` limpo
