
# Plano Mestre D15 → ~90% Maturidade Enterprise

Objetivo: levar Meta Sun de **~68/100** para **88–92/100**, eliminando dependência operacional de localStorage e consolidando Supabase como fonte única. 11 ondas reversíveis com flags. Sem refator cego, sem tocar no Shell D6.

---

## Charter D15 (oficial — 2026-05-28) — diretrizes-pedra

**F1 — Congelamento arquitetural (vigente JÁ):**
- PROIBIDO nova store LS operacional.
- PROIBIDO nova entidade crítica fora do Supabase.
- Todo fluxo novo nasce com: tabela + RPC + RLS + auditoria + repository. Sem `localStorage` direto.
- LS permitido só para: cache, draft, preferências UI, feature flags, fallback temporário.

**F2 — Supabase = única verdade.** Dashboards leem views/RPCs/MVs, nunca stores.

**F3 — Ordem obrigatória por domínio:** Financeiro → Comercial → Contratos → Engenharia → Estoque → Compras → Pós-venda → Analytics.

**F5 — Repository layer:** `localStorage.getItem/setItem` proibido fora da camada de persistência.

**F6 — Dual write / read / shadow:** flags `D15_SUPABASE_READ_*`, `D15_SUPABASE_WRITE_*`, `D15_LS_FALLBACK_*` (Onda 0). Toda virada incremental e reversível.

**F7 — Auditoria enterprise universal:** Onda 5 **promovida** para imediatamente após Onda 1.B (risco `ms.audit.v1` em LS).

**F8 — Concorrência:** `row_version` + optimistic lock + realtime + invalidation granular.

**F9 — Governança/RLS/Actions matrix:** nada via UPDATE direto; tudo via RPC governada.

**F10 — Morte controlada do LS** só após estabilização.

**F11 — Testes:** multiusuário, concorrência, fechamento, rollback, permissão.

**F12 — Meta:** ERP multiusuário real, backend autoritativo, transacional, auditável, escalável. UX RM/Sankhya preservada.

**Regras absolutas:** não quebrar UX, não reescrever telas sem motivo, não destruir stores existentes, não big-bang, toda migração sob flag.

---

## Visão geral das ondas

| # | Onda | Objetivo | Bloqueia próxima? | Esforço | Risco |
|---|------|----------|-------------------|---------|-------|
| 0 | Congelamento + baseline | Inventário + snapshot + rollback | **SIM** | P | Baixo |
| 1 | D15 Financeiro LS→Supabase | `v_lancamentos_derivados` + `rpc_lancamento_criar` + corte | **SIM** | GG | Alto |
| 2 | Cadastros canônicos | Naturezas/CR/contas/bancos/fornecedores no banco | SIM (p/ 3) | M | Médio |
| 3 | Comercial + Contratos | Leads/propostas/contratos/RPCs cascade | SIM (p/ 4–10) | G | Alto |
| 4 | Anexo universal | `entity_attachments` em 18 entidades críticas | Não | M | Baixo |
| 5 | Auditoria diária | Cobertura `audit_log` em todas operações | Não | M | Baixo |
| 6 | Concorrência + idempotência | `row_version` + `idempotency_key` | Não | M | Médio |
| 7 | Segurança + rotas | Privadas, RLS, grants, HIBP, search_path | Não | P | Baixo |
| 8 | Saúde + integridade | Painel `/admin/saude-sistema` | Não | M | Baixo |
| 9 | Testes + gates | Vitest + scripts integridade + CI | Não | M | Baixo |
| 10 | Corte definitivo LS | Remover stores operacionais legadas | **Last** | P | Médio |

Esforço: P=1–2 dias · M=3–5 · G=1–2 sem · GG=2–3 sem. Ordem **obrigatória** para 0→3; 4–9 podem paralelizar após 3; 10 só após todas.

---

## Escopo fiscal/contábil — diretriz oficial (2026-05-28)

Meta Sun **NÃO** implementa módulo fiscal/contábil completo. Fica gerencial/operacional. Fiscal+contábil = sistema externo (Domínio/Alterdata/Sankhya/TOTVS) — definição futura.

**Proibido neste plano:** SPED/ECD/ECF/EFD, apuração tributária, escrituração contábil, partidas dobradas, fechamento contábil, obrigações acessórias, NF-e como motor fiscal.

**Obrigatório desde já — toda entidade nasce integrável:**
- Campos universais: `codigo_interno`, `codigo_externo`, `sistema_origem`, `sistema_destino`, `status_integracao` (pendente/exportado/integrado/erro/reprocessar/ignorado), `data_integracao`, `erro_integracao`, `hash_remessa`, `lote_integracao_id`, `conta_contabil_mapeavel`, `tipo_documento`, `numero_documento`, `competencia`, `valor_bruto`, `desconto`, `acrescimo`, `valor_liquido`, `observacoes`, anexos.
- Camada de **mapeamento de-para** (não gera contabilidade agora): natureza→conta contábil, CR→CC, conta financeira→conta bancária/contábil, cliente/fornecedor→cadastro externo, tipo lançamento→evento contábil, tipo doc→doc fiscal, operação comercial→classificação, obra→CC/projeto externo, material→categoria externa, forma pgto→meio pgto externo.
- Tabelas estruturais: `mapeamentos_externos`, `lotes_integracao`, `eventos_pendentes_integracao`, `logs_integracao` + auditoria de exportação/reprocessamento.

**Regras de pedra no operacional:** nenhum lançamento sem natureza+competência+conta+tipo+origem; CR obrigatório quando aplicável; contratos/obras/movimentações sempre com vínculos rastreáveis; integração futura rastreável/auditável/reversível.

**Impacto nas ondas:**
- **Onda 1.A.0** (alinhamento pré-migração): adiciona os campos de integrabilidade em titulos/parcelas/mov/adiantamentos/boletos/rescisões/extrato + cria `mapeamentos_externos` e `lotes_integracao` **vazias**.
- **Onda 2** (cadastros): nascem com `codigo_externo` + `sistema_destino` + status integração.
- **Onda 3** (comercial): idem em contratos/propostas/PVs.
- **Não implementar agora:** motor de exportação, conector, parser fiscal — apenas estrutura.

**Critério de aceite global:** quando o sistema fiscal/contábil externo for definido, basta preencher mapeamentos e ligar exportador — sem refazer o núcleo financeiro.

Memória oficial: `mem://constraints/erp-escopo-fiscal-contabil`.

---

## Onda 0 — Congelamento e baseline

**Diagnóstico curto.** Sem alterar código. Tudo é leitura e exportação.

**Arquivos afetados.** Nenhum (apenas geração em `docs/d15-onda-0/`).

**Entregas.**
- `docs/d15-onda-0/inventario-localstorage.md` — varredura `rg -n "localStorage|metasun\.|ms\." src/` com classificação **operacional vs preferência**.
- `docs/d15-onda-0/inventario-supabase.md` — tabelas + count, RPCs (88), views (incluindo `v_kpis_*_oficial`, `v_reconciliacao_*`, `v_titulos_enriquecido`), triggers (201), policies RLS, funções SECURITY DEFINER, índices D14.5.
- `docs/d15-onda-0/snapshot-operador-{hash}.json` — re-rodar `scripts/d15-snapshot-export.js` (já existe `658dff81`, basta re-validar).
- `docs/d15-onda-0/baseline-volumetria.md` — count linha a linha de todas as 66 tabelas.
- `docs/d15-onda-0/rollback-plan.md` — por onda.
- **Feature flags em `src/config/featureFlags.ts`**: `D15_DUAL_READ_FINANCEIRO`, `D15_SUPABASE_READ_FINANCEIRO`, `D15_LS_FINANCEIRO_DISABLED`, idem para cadastros/comercial.

**Critério de aceite.** Relatório baseline salvo. Nenhum código funcional alterado. Flags default = `false` (modo atual preservado).

**Rollback.** N/A (somente leitura).

---

## Onda 1 — D15 Financeiro LS → Supabase (CRÍTICA)

Já validada em D15.1.a.0.ii+ (dry-run 100% paridade, 0 bloqueantes, snapshot `658dff81`).

**Tabelas afetadas.** `titulos_financeiros`, `parcelas_financeiras`, `movimentacoes_financeiras`, `naturezas_financeiras`, `centros_resultado`, `contas_financeiras`, `bancos`, `fornecedores`.

**Sub-ondas.**

### 1.A — View derivada + RPC atômica (Migration)
- `v_lancamentos_derivados` (security_invoker=on) unindo títulos + parcelas + mov + adiantamentos + abatimentos + extrato + boletos + renegociações com colunas canônicas: `origem_tipo`, `entidade_id`, `data_evento`, `competencia`, `valor`, `natureza_id`, `centro_resultado_id`, `conta_id`, `status_derivado`, `tipo (RECEBER|PAGAR|REALIZADO|PREVISTO)`.
- `rpc_lancamento_criar(payload jsonb) RETURNS uuid` SECURITY DEFINER:
  - Valida natureza + CR + conta + competência + valor + tipo.
  - Cria título → parcela(s) → movimentação (se realizado), em transação única.
  - Aplica `idempotency_key` (UNIQUE) calculado de `(data, valor, natureza, conta, descricao_hash, user_id)`.
  - Auditoria automática.
  - Setando `app.via_movimentacao='true'` para passar pelos triggers existentes.
- `rpc_lancamento_editar`, `rpc_lancamento_cancelar`, `rpc_lancamento_baixar_em_lote`, `rpc_lancamento_estornar`, `rpc_lancamento_conciliar`, `rpc_lancamento_desconciliar`.
- Grants: `EXECUTE TO authenticated`.

### 1.B — Importer de migração
- Script `scripts/d15-import-lancamentos.ts` lê snapshot `658dff81`, chama `rpc_lancamento_criar` com `idempotency_key` derivado. Re-executável.
- Tabela `migracao_d15_log` (origem, lancamento_ls_id, titulo_id, status, erro).
- Relatório de paridade vs dry-run (esperado: 13 títulos, 8 movimentações realizadas, saldo +R$ 120.467).

### 1.C — Dual-read
- Hook `useLancamentos` lê **ambas** as fontes quando `D15_DUAL_READ_FINANCEIRO=true`, exibe banner de divergência. Bloqueia corte se diff > 0.

### 1.D — Corte
- Ativar `D15_SUPABASE_READ_FINANCEIRO=true`, desligar dual-read. Stores `metasun.fin.*` ficam apenas como **backup read-only** marcado.
- Substituir handlers de criar/editar/baixar/estornar/conciliar pelas RPCs.

**Critério de aceite.** Nenhum lançamento crítico em LS. Migração bate com snapshot. Dashboard financeiro e tela de Lançamentos leem `v_lancamentos_derivados`. Clique duplo em "Criar" bloqueado pela `idempotency_key`. Auditoria povoada.

**Rollback.** Flag `D15_SUPABASE_READ_FINANCEIRO=false` volta ao LS. `migracao_d15_log` permite re-rodar. View e RPCs são aditivos.

---

## Onda 2 — Cadastros canônicos no banco

**Tabelas afetadas.** `naturezas_financeiras`, `centros_resultado`, `contas_financeiras`, `bancos`, `fornecedores`, `clientes`, `consultores`, `equipes`, `parametros_financeiros`, nova `recorrencias_financeiras`.

**Entregas.**
- Migration: índices `UNIQUE LOWER(nome)` por tipo, `deleted_at`, triggers de auditoria, soft-delete.
- Hooks `useNaturezas`, `useCentrosResultado`, `useContas`, `useBancos`, `useFornecedores` substituem stores LS.
- Importer de cadastros LS (snapshot D15) com dedupe por nome normalizado.
- LS guarda **apenas filtros visuais** dessas telas.

**Critério.** Telas de cadastro criam/editam no banco. Duplicidade bloqueada por índice. Dashboards e Lançamentos usam a mesma lista.

**Rollback.** Soft-delete preserva tudo; flag de origem permite voltar a ler LS por 1 ciclo.

---

## Onda 3 — Comercial e Contratos no Supabase

**Tabelas afetadas.** `leads`, `clientes`, `propostas`, `contratos`, `contratos_aditivos`, `contrato_status_historico` (já existe ou criar).

**RPCs novas/consolidadas.**
`rpc_lead_criar`, `rpc_cliente_criar_ou_vincular` (match por CPF/CNPJ), `rpc_proposta_criar`, `rpc_proposta_aprovar`, `rpc_contrato_criar`, `rpc_contrato_assinar`, `rpc_contrato_cancelar`, **`rpc_cancelar_contrato_cascade`** (cancela propostas, PVs, libera reservas, cancela títulos não baixados, bloqueia se há baixa irreversível sem fluxo de estorno).

**Critério.** Leads/propostas/contratos sem LS. Cancelamento cascade não deixa órfãos (validado pelas 4 views `v_origem_*` da Onda D4.4). Status via state machine (triggers `tg_*_valida_transicao`).

**Rollback.** Tabelas existem; flag dual-read permite voltar.

---

## Onda 4 — Anexo universal

**Tabela afetada.** `entity_attachments` (já existe) + storage bucket `anexos`.

**Aplicar em 18 entidades.** cliente, lead, proposta, contrato, projeto, obra, pv, título, parcela, movimentação, financiamento, compra, cotação, ordem_compra, entrega_estoque, pendência, solicitação, aprovação.

**Entregas.**
- Componente `<AttachmentEngine entityType=... entityId=... />` universal.
- Função `pode_acessar_entidade(_user, _entidade, _id)` SECURITY DEFINER usada pelas policies do bucket.
- Migração de anexos legados paralelos para `entity_attachments`.

**Critério.** 18 entidades suportam anexos. RLS bloqueia acesso indevido. Auditoria em upload/delete/download.

---

## Onda 5 — Auditoria real

**Tabelas afetadas.** `audit_log` (já existe), trigger `tg_audit_row` (já existe).

**Entregas.**
- Anexar `tg_audit_row` nas tabelas que ainda não têm: `leads`, `propostas`, `clientes`, `fornecedores`, `naturezas_financeiras`, `centros_resultado`, `contas_financeiras`, `recorrencias_financeiras`, `entity_attachments`, `parametros_financeiros`, `user_permission_overrides`, `role_permissions`.
- Padronizar `correlation_id` (UUID por request) propagado nas RPCs via `set_config('app.correlation_id', ...)`.
- Coluna `idempotency_key` no `audit_log` quando aplicável.

**Critério.** Operação diária aparece em `audit_log` com antes/depois, usuário, motivo, correlation_id. Painel `/admin/auditoria` filtrável.

---

## Onda 6 — Concorrência, idempotência, versionamento

**Tabelas afetadas.** Entidades críticas ganham `row_version int NOT NULL DEFAULT 1`.

**Entregas.**
- Trigger `tg_bump_row_version` incrementa em cada UPDATE.
- RPCs aceitam `_expected_version`; raise `42501 'Conflito de versão'` se diverge.
- Tabela `idempotency_keys (key text PK, scope text, response jsonb, created_at)` com TTL 24h.
- UI: hook `useOptimisticMutation` mostra modal "Outro usuário alterou — recarregar?".
- Botões críticos com `useDoubleClickGuard` (300ms + idempotency_key).

**Critério.** Clique duplo não duplica. Edição concorrente abre conflito visível. Retry de RPC não duplica lançamento.

---

## Onda 7 — Segurança, rotas, RLS

**Entregas.**
- Auditar todas rotas em `src/routes/`: garantir que tudo operacional está sob `_authenticated/`.
- Remover qualquer fallback "modo visitante" em rota privada.
- Loading components não vazam dados sensíveis.
- Logout limpa `queryClient` + LS de preferências sensíveis.
- Revisar RLS das tabelas migradas nas ondas 1–3.
- Re-rodar `supabase--linter`, fechar warns possíveis.
- Habilitar HIBP via `configure_auth password_hibp_enabled: true`.
- Matriz `governance_matrix` (D14.3) cobre as novas RPCs.

**Critério.** Sem sessão, nada operacional renderiza. Sem permissão, RPC retorna 42501. RLS bloqueia mesmo com frontend manipulado.

---

## Onda 8 — Painel de saúde

**Tabelas afetadas.** Nenhuma nova; usa views.

**Entregas.**
- View `v_saude_sistema` (security_invoker=on) agregando 20+ indicadores: contratos órfãos, propostas sem cliente, projetos sem contrato, títulos sem parcela, parcelas sem título, mov sem título, lançamentos sem natureza, estoque negativo, anexos órfãos, aprovações > 7 dias, falhas RPC último mês, conflitos de versão, idempotency hits, último refresh MV, status RLS por tabela, status views oficiais.
- Rota `/admin/saude-sistema` consome a view, agrupa por severidade (CRÍTICO/ALTO/MÉDIO/INFO).

**Critério.** Gestor enxerga saúde real. Inconsistências detectadas antes da crise.

---

## Onda 9 — Testes mínimos + gates

**Entregas.**
- `tests/integration/onda1-financeiro.test.ts` cobre os 20 fluxos críticos listados.
- `scripts/integridade-d15.ts` (executável CLI) replica view `v_saude_sistema` + exit code não-zero se críticos > 0.
- Gate de PR: rodar `bunx vitest run tests/integration` antes do merge.
- Migrations sempre com bloco `-- ROLLBACK` documentado.

**Critério.** Fluxo crítico tem teste. PR sem teste é bloqueado.

---

## Onda 10 — Corte definitivo LocalStorage

Só após ondas 1–9 estáveis (≥ 2 semanas em produção).

**Entregas.**
- `rg -n "localStorage\.(get|set)Item.*\b(metasun\.fin|ms\.contrato|ms\.cliente|ms\.lead|ms\.proposta|ms\.obra|ms\.estoque|ms\.compra|ms\.aprov)" src/` → remover todas ocorrências.
- Manter LS apenas: `theme`, `sidebar-state`, `tabela-filtros-{rota}`, `tabela-ordenacao-{rota}`, `dashboard-layout`.
- Função utilitária `assertNoOperationalLS()` em dev: lista chaves proibidas no console.

**Critério.** Limpar LS no Chrome **não perde nenhuma operação**. Troca de máquina mantém a verdade.

---

## Métrica final esperada

| Camada | Hoje | Alvo | Onda principal |
|--------|------|------|----------------|
| Banco/governança | 9,0 | 9,0 | (mantido) |
| Backend/RPCs | 7,5 | 8,8 | 1, 3 |
| Frontend enterprise | 8,5 | 8,8 | 1–3 |
| Persistência operacional | 4,0 | 9,0 | **1, 2, 3, 10** |
| Fonte única da verdade | 4,5 | 9,0 | **1, 2, 3, 10** |
| Auditoria real | 6,0 | 8,5 | 5 |
| Concorrência | 5,0 | 8,0 | 6 |
| Segurança | 8,5 | 9,0 | 7 |
| Testes/QA | 2,5 | 6,5 | 9 |
| **Maturidade geral** | **~68** | **88–92** | — |

---

## Protocolo por onda

**Antes:** diagnóstico curto + arquivos/tabelas/RPCs/policies + risco + rollback + critério de aceite (este plano já entrega isso para todas as 11).

**Depois:** resumo do que mudou + evidência de teste + evidência de paridade + pendências + próxima onda.

---

## Pedido de aprovação

Aprovação proposta em **3 níveis** para evitar commit cego:

1. **Aprovar o plano mestre** (este documento) — destrava execução sequencial.
2. **Aprovar Onda 0 agora** — somente leitura, gera baseline e flags. Sem risco.
3. Onda 1 (financeiro) só inicia após Onda 0 entregue e revisada.

Se aprovado, começo pela **Onda 0** imediatamente: inventário + snapshot + feature flags + rollback plan. Nenhum código funcional muda nessa primeira execução.
