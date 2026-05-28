# D15.3.c — Rescisões / Renegociações / Edição de Taxa 100% Supabase

**Status:** APLICADA — 2026-05-28
**Subwave:** 3 de 4 da D15.3 (UI Financeira)
**Maturidade:** ~98,2% → **~98,4%**

## Backend
- **2 permissões novas:** `financeiro.rescindir`, `financeiro.taxa.editar`.
- **3 RPCs SECURITY DEFINER:**
  - `rpc_rescisao_executar(_contrato_id, _multa_tipo, _multa_valor, _motivo, _vencimento_devolucao, _conta_devolucao_id, _observacoes, _request_id)`
    Cancela títulos AR ativos do contrato + parcelas, calcula multa, gera AP de devolução,
    registra `rescisoes_contrato` + `rescisoes_itens`, audit e idempotente.
  - `rpc_taxa_aplicar(...)` — insert auditado em `titulos_taxas` (motivo ≥ 5).
  - `rpc_taxa_estornar(_taxa_id, _motivo, _request_id)` — soft delete auditado.
- **3 views (security_invoker):**
  - `v_rescisoes_enriquecido`
  - `v_renegociacoes_enriquecido`
  - `v_taxas_titulo`
- `EXECUTE` revogado de `anon`; concedido apenas a `authenticated`.

## Frontend
- `src/lib/repositories/rescisoes-repo.ts` — hooks `useRescisoes`, `useContratosElegiveisRescisao`, `useExecutarRescisao`.
- `src/lib/repositories/renegociacoes-repo.ts` — hook `useRenegociacoes`.
- `src/lib/repositories/taxas-repo.ts` — hooks `useTaxasTitulo`, `useAplicarTaxa`, `useEstornarTaxa`.
- `src/components/app/financeiro/RescisoesTabSupabase.tsx` — 100% Supabase.
- `src/components/app/financeiro/RenegociacaoHistoricoListSupabase.tsx` — 100% Supabase.
- `src/components/app/financeiro/EditarTaxaDialog.tsx` — aplicar + estornar via RPC.
- `src/routes/financeiro.tsx` — switches por flag.

## Feature flags (default `true`)
- `D15_RESCISOES_SUPABASE`
- `D15_RENEGOCIACAO_HIST_SUPABASE`
- `D15_TAXAS_SUPABASE`

LS legado segue como rollback (override `ff:<flag>=false`).

## LocalStorage
**Removidas operacionais:**
- `ms.fin.rescisoes.v1` — zero leitura/escrita em RescisoesTabSupabase.
- `ms.fin.renegociacoes.v1` — zero leitura em RenegociacaoHistoricoListSupabase.
- Edição de taxa nunca mais grava em LS — sempre via RPC.

**Mantidas (UI-only, whitelistadas):**
- `ui.fin.rescisoes.v1` — filtro de busca.
- `ui.fin.renegociacoes.v1` — busca textual.

## Auditoria
Toda operação grava em `audit_log` via `fn_audit_lancamento`:
- Rescisão: 1 evento raiz + 1 por título cancelado.
- Taxa: APLICAR / ESTORNAR com payload completo.

## Erros
Falhas Supabase emitem `toast` + `errorLogRepo.log` (`modulo='financeiro'`). Sem fallback silencioso.

## Critério de aceite ✅
Nenhum dos três fluxos depende de LocalStorage para leitura ou gravação operacional.
Restam apenas filtros de UI sob prefixo `ui.fin.*` (permitido pelo ls-guard).
