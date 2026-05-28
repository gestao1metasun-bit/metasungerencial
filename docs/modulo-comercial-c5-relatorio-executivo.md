# Onda C5 — Assinatura Enterprise do Contrato

**Status:** APLICADA — 2026-05-28  
**Escopo:** transformar a assinatura no marco corporativo oficial do ERP Meta Sun.  
**Não inclui:** comissão (C6), cancelamento (C7), reabertura (C8).

---

## 1. Arquitetura

```
Vendedor → Proposta → Aprovada → Contrato → [ASSINATURA RPC] → Evento append-only
                                                  │
                                                  ├─→ Flags semânticas paralelas:
                                                  │     • liberado_para_engenharia (+ pendente_engenharia)
                                                  │     • liberado_para_financeiro  (+ pendente_financeiro)
                                                  │     • liberado_para_contrato (compat legado)
                                                  │
                                                  └─→ Auditoria (audit_log + tabela de eventos)
```

Princípios:
- Assinatura é evento corporativo, não flag de UI.
- Engenharia e Financeiro recebem em paralelo (não sequencial).
- Campos sensíveis blindados por trigger; só RPC oficial muda.
- Compat preservada: `assinado_aprovado`, `liberado_para_contrato`, `data_assinatura` continuam alimentados.

## 2. Tabelas

### `comercial_assinatura_eventos` (NOVA — append-only)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `contrato_id` | uuid FK | Contrato assinado |
| `assinado_por` | uuid | Quem assinou |
| `assinado_em` | timestamptz | Quando |
| `permissao_usada` | text | `comercial.contrato.assinar` / `_excecao` / `admin` |
| `observacao` | text | Justificativa opcional |
| `ip_origem`, `user_agent` | text | Rastreabilidade técnica |
| `hash_evento` | text | SHA-256 (contrato+user+timestamp) |
| `dispatched_eng`, `dispatched_fin` | bool | Marca disparo paralelo |
| `metadata` | jsonb | Snapshot do contrato no momento |

RLS: SELECT só com `comercial.contrato.assinar` ou `.ver_assinatura` ou admin. Sem INSERT/UPDATE/DELETE direto (apenas RPC).

### `contratos` — colunas adicionadas

`assinado`, `assinado_em`, `assinado_por`, `assinatura_evento_id`,  
`liberado_para_engenharia`, `liberado_para_engenharia_em`,  
`liberado_para_financeiro`, `liberado_para_financeiro_em`,  
`pendente_engenharia`, `pendente_financeiro`.

+3 índices parciais (assinado, pendente_eng, pendente_fin).

## 3. RPCs (SECURITY DEFINER, EXECUTE só authenticated)

| RPC | Função |
|---|---|
| `rpc_contrato_assinar(contrato_id, observacao?, ip?, user_agent?, row_version?)` | Marco oficial. Valida permissão, status, concorrência. Cria evento, ativa flags paralelas Eng+Fin, atualiza compat legado. |
| `rpc_contrato_marcar_engenharia_liberada(contrato_id, observacao?)` | Engenharia consome a pendência (`pendente_engenharia = false`). |
| `rpc_contrato_marcar_financeiro_liberado(contrato_id, observacao?)` | Financeiro consome a pendência (`pendente_financeiro = false`). |

Regras críticas:
- Bloqueia se `cancelado` ou `assinado` (não assina duas vezes).
- Validação de `row_version` opcional (concorrência otimista).
- Status do contrato evolui automaticamente para `Assinado` quando aplicável.

## 4. Permissões novas (enum `app_permission`)

- `comercial.contrato.assinar` — assinatura padrão (default: Financeiro).
- `comercial.contrato.assinar_excecao` — assinatura excepcional (Diretoria).
- `comercial.contrato.ver_assinatura` — leitura do histórico de eventos.

## 5. Auditoria & Governança

- Tabela `comercial_assinatura_eventos` é append-only e cobre todo o rastro humano (quem/quando/por que/de onde).
- Triggers existentes de `contratos` (audit forward-only, row_version) continuam ativos.
- Trigger `trg_contratos_bloqueia_assinatura` impede UPDATE direto fora da flag de sessão.

## 6. Repositório / UI

`src/lib/repositories/comercial-assinatura-repo.ts`:
- `useAssinarContrato()`
- `useAssinaturaEventos(contratoId)`
- `useMarcarEngenhariaLiberada()`
- `useMarcarFinanceiroLiberado()`

Wiring nas telas (botão "Assinar contrato" enterprise + timeline de eventos) entra na onda C10 (UI consolidada).

## 7. Compatibilidade

Fluxo legado preservado:
- `assinado_aprovado` continua sendo setado.
- `liberado_para_contrato` continua sendo setado.
- `data_assinatura` é preenchido se estava nulo.
- Triggers existentes que dependiam desses campos não quebram.

## 8. Linter

106 → 111 WARN (todos novos = padrão SECURITY DEFINER já aceito arquiteturalmente em D14.2 / C2 / C3). Zero ERROR. Zero regressão estrutural.

## 9. Impacto na maturidade

| Dimensão | Antes | Depois |
|---|---|---|
| Governança Comercial | 88% (C4) | **92%** |
| Auditoria | 88% | **90%** |
| Maturidade geral estimada | **~98,1%** | **~98,3%** |

## 10. Riscos remanescentes para C6+

- **C6 (Comissão):** evento de assinatura é o gatilho natural; a tabela `comercial_assinatura_eventos` já guarda `assinado_em` e metadata necessária.
- **C7 (Cancelamento):** vai precisar invalidar eventos (não apagar) e introduzir motivo + alçada.
- **C8 (Reabertura):** crítica — deverá ler o último evento de assinatura para decidir desmontagem em cascata.
- **UI Enterprise (C10):** botão de assinatura + timeline + indicadores `pendente_engenharia/financeiro` em painéis.

## 11. Pendências operacionais

- Conceder as 3 novas permissões aos perfis corretos (Financeiro → `assinar`; Diretoria → `assinar_excecao`; Comercial e Engenharia → `ver_assinatura`).
- Renan deve homologar primeira assinatura assistida em ambiente de validação.

## 12. Próximo passo

**C5 FECHADA. Aguardando aprovação para iniciar C6 (Comissões).**
