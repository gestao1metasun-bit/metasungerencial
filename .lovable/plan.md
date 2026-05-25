## Onda 1.5 — Migração `contratos-store` → Supabase

### Diagnóstico

- `src/lib/contratos-store.ts`: 1104 linhas, persistência em `localStorage` (`ms.contratos.v2`).
- Tipo `ContratoFull`: ~70 campos (cliente completo, projetos vinculados, auditoria, composição de pagamento, cláusulas custom, financiamento bancário, cadeia comercial lead→proposta→contrato).
- Tabela `public.contratos` atual: ~15 colunas tipadas + `dados jsonb`. Cobre só núcleo (cliente_id, valor, kwp, status, datas, forma_pagamento).
- 21 arquivos consumidores: rotas (comercial, financiamentos, engenharia, posvenda, dashboard, analytics), módulos (propostas, leads, financeiro), componentes (Aditivos, ContratoImpressao), lib (dev-seed, contrato-template, contrato-base-store, fin-orcamento-obras, aditivos-store, fin-pendencias).
- **Incompatibilidade de ID**: store usa string `"088/2026"`; Supabase usa `uuid`. Os 21 consumidores tratam `id` como string em todo lugar.

### Princípio

Migrar em **3 sub-ondas** preservando a API atual do store. Os consumidores não mudam de assinatura — apenas trocam de fonte de dados. Isso evita refator gigante em 21 arquivos e mantém a UI funcionando durante a transição.

### Sub-onda 1.5.A — Schema (migration)

Estender `public.contratos` para acomodar `ContratoFull`:

- Adicionar coluna `codigo_externo text unique` (recebe os "088/2026" antigos como chave estável legível; `id uuid` continua sendo PK).
- Adicionar colunas tipadas que já são usadas em filtros/joins:
  - `vendedor text`, `comissao_pct numeric`, `comissao_valor numeric`
  - `possui_financiamento boolean default false`, `financiamento_banco text`, `financiamento_valor numeric`, `financiamento_status text`, `financiamento_liberado_eng boolean default false`
  - `proposta_id uuid`, `lead_id uuid`
  - `assinado_aprovado boolean default false`, `assinado_aprovado_em timestamptz`, `assinado_aprovado_por uuid`
  - `liberado_para_contrato boolean default false`, `liberado_em timestamptz`, `liberado_por uuid`
  - `contrato_redigido boolean default false`, `cancelado boolean default false`, `motivo_cancelamento text`
- Manter `dados jsonb` para o resto (clienteFull, auditoria local, parcelasPagto legado, composicaoPagto, clausulasCustom, pagamentoDetalhes, financiamento operacional, projetos legados embarcados).
- Snapshot de versão (`tg_snapshot_version`) e auditoria de linha (`tg_audit_row`) já existem — apenas confirmar attach.
- RLS: consultor enxerga onde `consultor_id = auth.uid()`; admin enxerga tudo; DELETE só admin (soft delete via `deleted_at`).
- Índices: `codigo_externo`, `(consultor_id, status)`, `proposta_id`, `lead_id`.

### Sub-onda 1.5.B — Adapter no store (mesma API, fonte Supabase)

Reescrever internamente `src/lib/contratos-store.ts` mantendo **as mesmas exports**:

- `useContratos()`, `setContratos`, `upsertContrato`, `updateContratoAudit`, `addProjeto`, `updateProjeto`, `removeProjeto`, `getAllProjetos`, `nextProjetoId`, `solicitarAlteracaoContrato`, `validateContratoCompleto`, `buscarCEP` (puros — sem mudança).
- Fonte de verdade passa a ser Supabase via `createServerFn` + `requireSupabaseAuth`. Lista é cacheada com TanStack Query (`['contratos']`).
- `useContratos()` vira wrapper de `useQuery({ queryKey: ['contratos'] })`, mantendo retorno `ContratoFull[]` para zero impacto nos 21 consumidores.
- Mutações chamam serverFns (`upsertContratoFn`, `updateContratoAuditFn`, etc.) e invalidam a query.
- Função `contratoFromRow(row)` reconstrói `ContratoFull` a partir das colunas tipadas + `dados jsonb`. Função inversa `rowFromContrato(c)` serializa.
- `id` continua sendo a string `"088/2026"` na superfície (campo `codigo_externo` no banco). Internamente o adapter resolve `codigo_externo → uuid` quando precisa cruzar com tabelas que referenciam `contratos.id` (ex.: futuros `projetos_contrato`).
- `localStorage` mantido como cache de leitura otimista por 1 sub-onda, com flag `MIGRATION_SOURCE='supabase'|'local'` para rollback rápido se algo quebrar.

### Sub-onda 1.5.C — Seeding e cleanup

- Migrar dados existentes do `localStorage` na primeira carga autenticada via `migrateLocalToSupabase()` (idempotente, marca flag `ms.contratos.migrated=true`).
- `dev-seed.ts` passa a inserir via serverFn em vez de `localStorage`.
- Remover `KEY = "ms.contratos.v2"` e `localStorage.setItem` após 1 versão de convivência.
- Atualizar `contrato-base-store.ts` e `aditivos-store.ts` na mesma linha (eles compartilham padrão).

### Fora de escopo desta onda

- Migrar `propostas`/`leads` (já estão em Supabase).
- Refator dos 21 consumidores (acontece naturalmente conforme adapter cobre tudo).
- Criar `projetos_contrato` UI (Onda 2, já desbloqueada quando `codigo_externo↔uuid` existir).
- Migrar `aditivos-store`, `fin-titulos-store`, `fin-orcamento-obras` (Ondas 3+).

### Riscos

- **Performance**: 1 query por mount de `useContratos()` em 21 lugares. Mitigação: TanStack Query com `staleTime: 30s` e invalidação por mutation.
- **Compatibilidade de tipos**: `ParcelaPagto.id`, `AuditEntry.id` são gerados client-side hoje (`A-${Date.now()}`). Mantemos esse formato no `dados jsonb` — sem schema para sub-coleções nesta onda.
- **Auditoria duplicada**: hoje o store grava `auditoria[]` no objeto; o banco também tem `tg_audit_row`. Mantemos ambos por enquanto (UI lê de `auditoria[]`, banco é fonte forense).

### Entregáveis desta sub-onda (1.5.A apenas, para começar)

1. Migration estendendo `public.contratos` com colunas tipadas + índices.
2. Confirmar triggers `tg_audit_row`, `tg_snapshot_version`, `tg_set_updated_at` ligados.
3. Validar RLS.

Após 1.5.A aprovada e aplicada, abro PR de 1.5.B (adapter no store) sem tocar nos 21 consumidores. 1.5.C entra como housekeeping.

### Pergunta de decisão

Confirmar 3 pontos antes de migrar:

1. **Manter `codigo_externo` (`"088/2026"`) como chave visível** e `id uuid` interno? (recomendado — zero impacto nos 21 consumidores)
2. **Estratégia de dados existentes em `localStorage`**: migrar automaticamente na primeira carga (recomendado) ou descartar (mais limpo, mas perde estado dev)?
3. **Convivência localStorage↔Supabase**: 1 versão de transição com flag de rollback (recomendado) ou cut-over direto?
