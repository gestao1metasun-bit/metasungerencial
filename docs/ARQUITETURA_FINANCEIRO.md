# Arquitetura do Módulo Financeiro — Plano de Migração

> Status: **Fase de preparação** (não migrar ainda).
> Camada local = protótipo. Supabase = destino definitivo.

---

## 1. Camada de repositório (já criada)

```
src/lib/repositories/
  financeiro-repository.ts          → interface FinanceiroRepository
  financeiro-repository.local.ts    → adapter localStorage (provisório)
  financeiro-repository.supabase.ts → stub para preencher na homologação
  index.ts                          → factory + switch de fonte
```

**Regra de ouro:** telas (`TitulosTab`, `FluxoCaixaRealTab`, `RenegociarTituloDialog`,
`FechamentoTab`, `RescisoesTab`, etc.) devem evoluir para consumir apenas
`getFinanceiroRepository()`. Quando 100% delas estiverem nesse contrato,
trocar a fábrica para `SupabaseFinanceiroAdapter` é uma mudança de uma linha.

### Migração das telas (incremental, sem big bang)

| Etapa | Telas | Risco |
|------|------|------|
| 1 | `TitulosTab` (CRUD + baixa) | Baixo — fluxo isolado |
| 2 | `FluxoCaixaRealTab` (leitura) | Baixo |
| 3 | `RenegociarTituloDialog` + `RescisoesTab` | Médio — usa múltiplos stores |
| 4 | `FechamentoTab` + `ConciliacaoTab` | Médio |
| 5 | `AdiantamentosTab`, `Compras`, `Cmv` | Médio |

Cada etapa: trocar imports do store para o repo, manter contrato igual,
rodar smoke test, commit.

---

## 2. Modelo de tabelas Supabase

Todas em schema `public`, prefixo `fin_`.

### 2.1 `fin_titulos`

| coluna | tipo | regra |
|--------|------|------|
| `id` | uuid PK | `gen_random_uuid()` |
| `tipo` | text NOT NULL | check `tipo in ('AP','AR')` |
| `origem` | text NOT NULL | enum livre (compra, contrato, …) |
| `status` | text NOT NULL | enum (previsto, parcial, pago, …) |
| `descricao` | text NOT NULL | |
| `valor_original` | numeric(14,2) NOT NULL | > 0 |
| `valor_pago` | numeric(14,2) NOT NULL DEFAULT 0 | derivado por trigger |
| `saldo` | numeric(14,2) NOT NULL | gerado: `valor_original - valor_pago` |
| `vencimento` | date NOT NULL | nominal |
| `vencimento_real` | date | calculado por trigger (próximo dia útil) |
| `competencia` | text | `YYYY-MM` |
| `data_emissao` | date | |
| `data_liquidacao` | date | |
| `natureza_id` | uuid FK fin_naturezas | |
| `centro_custo_id` | uuid FK fin_centros_custo | |
| `meio_pagamento_id` | uuid FK fin_meios_pagamento | |
| `conta_financeira_id` | uuid FK fin_contas | |
| `fornecedor_id` | uuid FK fin_fornecedores | nullable |
| `cliente_id` | uuid FK clientes | nullable |
| `contrato_id` | uuid FK contratos | nullable |
| `obra_id` | uuid FK obras | nullable |
| `documento_tipo` | text | NF / Boleto / Recibo / Contrato |
| `documento_numero` | text | |
| `parcela_label` | text | "3/12" etc. |
| `observacao` | text | |
| `renegociacao_id` | uuid | self-ref via `fin_renegociacoes` |
| `renegociado_em` | timestamptz | |
| `bloqueado_fechamento` | bool NOT NULL DEFAULT false | preenchido por trigger ao fechar mês |
| `created_by` | uuid FK auth.users | |
| `created_at` / `updated_at` | timestamptz | triggers padrão |
| `deleted_at` / `deleted_by` / `deleted_reason` | soft delete | |

Índices: `(tipo, status, vencimento)`, `(contrato_id)`, `(competencia)`,
`(fornecedor_id)`, `(cliente_id)`, parcial onde `deleted_at IS NULL`.

Restrição de duplicidade (não bloqueante, alertar via trigger/log):
mesmo `(fornecedor_id, documento_tipo, documento_numero)` em 60 dias.

### 2.2 `fin_movimentos` (baixas)

| coluna | tipo |
|--------|------|
| `id` | uuid PK |
| `titulo_id` | uuid FK fin_titulos NOT NULL |
| `data` | date NOT NULL |
| `valor` | numeric(14,2) NOT NULL |
| `juros` / `multa` / `desconto` | numeric(14,2) DEFAULT 0 |
| `conta_financeira_id` | uuid FK fin_contas |
| `meio_pagamento_id` | uuid FK fin_meios_pagamento |
| `observacao` | text |
| `estornado` | bool DEFAULT false |
| `estorno_motivo` / `estorno_em` / `estorno_por` | – |
| `created_by` / `created_at` | – |

Trigger `tg_fin_atualiza_saldo` (AFTER INSERT/UPDATE/DELETE) recalcula
`valor_pago` e `status` no título.

### 2.3 `fin_rateios`

`id`, `titulo_id`, `valor`, `centro_custo_id`, `natureza_id`, `tipo_titulo`,
`ordem_servico`, `codigo_projeto`, `observacao`. Constraint: soma de rateios
== valor_original do título (via trigger DEFERRED).

### 2.4 `fin_anexos_titulos`

Já existe (`anexos_titulos`). Apenas renomear lógico — manter bucket
`anexos-titulos` privado. Não migrar bytes; manter `storage_path`.

### 2.5 `fin_renegociacoes` / `fin_rescisoes` / `fin_adiantamentos`

Espelham os tipos dos stores atuais. FK para `fin_titulos`. Triggers de
auditoria iguais.

### 2.6 `fin_period_locks`

Reutilizar tabela existente `period_locks` com `modulo='financeiro'`. Função
`is_period_closed('financeiro', data)` já existe.

### 2.7 Cadastros auxiliares

`fin_naturezas`, `fin_grupos`, `fin_subgrupos`, `fin_centros_custo`,
`fin_tipos_aplicacao`, `fin_meios_pagamento`, `fin_contas`, `fin_fornecedores`.
Todos com `id uuid`, `nome text`, `ativo bool`, soft delete, auditoria.

---

## 3. Permissões (app_permission)

Adicionar ao enum:

```
financeiro.ver
financeiro.lancar           -- criar título
financeiro.editar
financeiro.baixar           -- registrar pagamento/recebimento
financeiro.estornar         -- estornar baixa
financeiro.cancelar         -- cancelar título
financeiro.renegociar
financeiro.rescindir
financeiro.fechar_periodo
financeiro.reabrir_periodo  -- apenas admin
financeiro.aprovar_desconto -- > limite parametrizado
financeiro.exportar
```

Gates de UI via `useMyPermissions().can("financeiro.baixar")` —
**não confiar no client**: cada ação espelhada em server function com
`has_permission(auth.uid(), 'financeiro.baixar')`.

---

## 4. RLS

Padrão: `is_admin OR (criou OR está no centro de custo permitido)`.

```sql
-- exemplo fin_titulos
alter table public.fin_titulos enable row level security;

create policy fin_titulos_select on public.fin_titulos
for select to authenticated
using (
  is_admin(auth.uid())
  or has_permission(auth.uid(), 'financeiro.ver')
);

create policy fin_titulos_insert on public.fin_titulos
for insert to authenticated
with check (
  has_permission(auth.uid(), 'financeiro.lancar')
  and created_by = auth.uid()
);

create policy fin_titulos_update on public.fin_titulos
for update to authenticated
using (has_permission(auth.uid(), 'financeiro.editar'))
with check (has_permission(auth.uid(), 'financeiro.editar'));

create policy fin_titulos_delete_admin on public.fin_titulos
for delete to authenticated using (is_admin(auth.uid()));
```

`fin_movimentos`: INSERT exige `financeiro.baixar`; nunca permitir UPDATE
(estorno é UPDATE controlado via RPC `fin_estornar_movimento`).

---

## 5. Auditoria

- Reusar `tg_audit_row` em **todas** as tabelas `fin_*`
  (`CREATE TRIGGER ... EXECUTE FUNCTION tg_audit_row('financeiro', 'titulos')`).
- `entidade_versoes` recebe snapshot em UPDATE de `fin_titulos`.
- Ações sensíveis (baixa, estorno, cancelamento, renegociação, rescisão,
  fechamento, reabertura, override de duplicidade, aprovação de desconto)
  vão para `audit_log` com `motivo` obrigatório (validar via RPC).

---

## 6. Bloqueios de período

- Trigger `tg_fin_guard_periodo` em `fin_titulos` e `fin_movimentos`:
  bloqueia UPDATE/INSERT/DELETE se `is_period_closed('financeiro', competencia)`
  e usuário não tem `financeiro.reabrir_periodo`.
- Fechamento mensal carimba `bloqueado_fechamento = true` nos títulos da
  competência. Reabertura limpa o flag e registra em `audit_log`.

---

## 7. Server functions previstas

`src/lib/financeiro.functions.ts` (a criar quando ativarmos Supabase):

```
listFinTitulos(filtro)           [requireSupabaseAuth]
getFinTitulo(id)                 [requireSupabaseAuth]
createFinTitulo(input)           [requireSupabaseAuth + has_permission lancar]
updateFinTitulo(id, patch, motivo)
cancelFinTitulo(id, motivo)
baixarFinTitulo(input)
estornarFinMovimento(tituloId, movId, motivo)
renegociarFinTitulo(input)
rescindirContratoFin(input)
fecharPeriodoFin(ano, mes)       [admin / fechar_periodo]
reabrirPeriodoFin(ano, mes)      [admin / reabrir_periodo]
```

Todas devolvem DTOs simples (sem instâncias). Erros mapeados:
- `42501` → `FORBIDDEN`
- `PERIODO_FECHADO` → `PERIOD_LOCKED`
- `23505` → `DUPLICATE`

---

## 8. Plano de migração de dados (quando virar a chave)

1. **Snapshot**: exportar `localStorage` de um usuário admin como JSON
   (`ms.fin.titulos.v1`, `ms.fin.movimentos.v1`, …).
2. **Seed controlado**: rodar script que importa para `fin_*` via
   `supabaseAdmin`, mapeando ids para uuid, preservando `created_at` em
   `dados.legacy_created_at`.
3. **Dry run**: ambiente preview, conferir totais (somatórios, saldos,
   conciliações) antes/depois.
4. **Flip da factory**: `setFinanceiroRepositorySource('supabase')`
   guardado por `feature_flags.fin_repository_supabase`.
5. **Read-only no localStorage** por 30 dias (rollback rápido).
6. **Purga** do storage antigo via flag.

---

## 9. Realtime (opcional, pós-migração)

Adicionar `fin_titulos` e `fin_movimentos` em `supabase_realtime`. O
adapter Supabase implementa `subscribe()` via `postgres_changes` e a UI
continua usando `useSyncExternalStore` sem mudar nada.

---

## 10. Itens explicitamente fora de escopo agora

- Não criar tabelas `fin_*` ainda.
- Não escrever server functions financeiras ainda.
- Não migrar dados nem ativar realtime.
- Não tocar nas telas — só preparar a fundação arquitetural.
