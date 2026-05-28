# D15 Onda 1.A — Pacote de Entrega (pré-aplicação)

**Modo:** estrutural. **Nenhum** dado migrado, **nenhuma** flag ativada, **nenhuma** UI alterada.
**Snapshot de referência:** `658dff81` (operação canônica em `metasun.fin.lancamentos.v1`).
**Arquivo SQL:** [`MIGRATION.sql`](./MIGRATION.sql)

---

## 1. O que é criado

### 1.1 Infraestrutura de migração / idempotência
| Objeto | Tipo | Finalidade |
|---|---|---|
| `public.migracao_d15_log` | tabela | Log append-only de toda operação Onda 1.x: onda, origem (LS/SNAPSHOT/MANUAL), origem_ref, snapshot_hash, correlation_id, entidade, ação, status, payload_in/out, erro. RLS: admin OU dono vê. |
| `public.chaves_de_idempotencia` | tabela | `idempotency_key` PK + escopo + resultado persistido + TTL 30d. Garante que retry de RPC não duplica. |
| `_d15_check_idem / _d15_store_idem` | funções helper | SECURITY DEFINER, search_path=public. Lookup e gravação da chave. EXECUTE só authenticated. |

### 1.2 View canônica
| Objeto | Tipo | Finalidade |
|---|---|---|
| `public.v_lancamentos_derivados` | view `security_invoker=on` | Verdade derivada de `titulos_financeiros` ∪ `parcelas_financeiras` ∪ `movimentacoes_financeiras`, enriquecida com conta/banco/CR/cliente/fornecedor. **Não é tabela** — confirma a decisão oficial "Lançamentos = visão derivada". |

### 1.3 RPCs atômicas (todas `LANGUAGE plpgsql`, SECURITY INVOKER por padrão → RLS aplica)
| RPC | Permissão exigida | Validações | Auditoria |
|---|---|---|---|
| `rpc_lancamento_criar(_payload, _idem)` | `financeiro.movimentar` ou admin | tipo AR/AP, natureza+CR+conta obrigatórios, ≥1 parcela | audit_log + migracao_d15_log |
| `rpc_lancamento_editar(_titulo_id, _patch, _idem)` | `financeiro.editar` ou admin | bloqueia CANCELADO/BAIXADO | audit_log valor_anterior/novo |
| `rpc_lancamento_cancelar(_titulo_id, _motivo, _idem)` | `financeiro.editar` ou admin | motivo ≥3 chars, bloqueia BAIXADO (exige estorno) | audit_log motivo |
| `rpc_baixar_em_lote(_baixas, _idem)` | `financeiro.movimentar` ou admin | array não-vazio, `FOR UPDATE` na parcela, set `app.via_movimentacao=true` p/ triggers D4.1 | audit_log baixar_lote |
| `rpc_estornar(_movimentacao_id, _motivo, _idem)` | `financeiro.movimentar` ou admin | bloqueia ESTORNO de ESTORNO, valor invertido, set `app.via_movimentacao=true` | audit_log estornar |
| `rpc_conciliar(_extrato_id, _movimentacao_id, _idem)` | `financeiro.movimentar` ou admin | linha extrato existe e ativa | audit_log conciliar |
| `rpc_desconciliar(_extrato_id, _motivo, _idem)` | `financeiro.movimentar` ou admin | motivo ≥3 chars | audit_log desconciliar |

Todas devolvem `jsonb` padronizado: `{ ok, lancamento_id?, titulo_id?, parcela_ids?, movimentacao_id?, correlation_id, idempotent_hit }`.

---

## 2. Por que assim

- **View `security_invoker=on`** → respeita `<rls>` herdada de titulos/parcelas/movs sem expor dados além do que o usuário já enxerga.
- **Idempotência fora da RPC** (tabela própria, escopo por nome) → permite retry seguro de redes flutuantes sem CHECK/UNIQUE em payload.
- **`migracao_d15_log`** independente de `audit_log` → audit_log é o log oficial transversal, `migracao_d15_log` é específico da onda, descartável após corte.
- **Flag `app.via_movimentacao=true`** dentro das RPCs de baixa/estorno → mantém compatibilidade com hardening D4.1 (bloqueio de UPDATE direto em status).
- **RPCs SECURITY INVOKER** (não DEFINER) → mesmo se vazar EXECUTE, RLS bloqueia. EXECUTE revogado de `anon` em todas.

---

## 3. Riscos

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| R1 | View deriva ≠ KPIs oficiais | Médio | View só lê tabelas oficiais; KPIs já estão em `v_kpis_*_oficial`. Ambos invocam RLS do usuário. Validar paridade em Onda 1.B. |
| R2 | `rpc_baixar_em_lote` em lote grande trava tabela | Médio | `FOR UPDATE` por parcela, sem `FOR UPDATE` no título. Recomendar batch ≤200 no cliente (futuro). |
| R3 | Idempotência cresce sem limpeza | Baixo | `expires_at` 30d + índice. Job de purga em Onda 5. |
| R4 | `ms.audit.v1` (log REAL em LS) ainda fora do banco | **Crítico** | Registrado abaixo (§7). Sobe prioridade de Onda 5. |
| R5 | RPCs assumem trigger D4.6 ativo p/ auto-status | Baixo | Triggers já validados em D4.6. Teste 3 confirma. |
| R6 | Conflito de nomes de status entre módulos | Baixo | View usa string crua de cada tabela; sem normalização agora. Tratar em Onda 1.B. |

---

## 4. Rollback

Tudo isolado em `migracao_d15_log`, `chaves_de_idempotencia`, `v_lancamentos_derivados`, 7 RPCs e 2 helpers. Sem ALTER em tabelas existentes. Sem DROP. Sem dados migrados.

```sql
-- ROLLBACK COMPLETO (em ordem):
DROP FUNCTION IF EXISTS public.rpc_desconciliar(uuid,text,text);
DROP FUNCTION IF EXISTS public.rpc_conciliar(uuid,uuid,text);
DROP FUNCTION IF EXISTS public.rpc_estornar(uuid,text,text);
DROP FUNCTION IF EXISTS public.rpc_baixar_em_lote(jsonb,text);
DROP FUNCTION IF EXISTS public.rpc_lancamento_cancelar(uuid,text,text);
DROP FUNCTION IF EXISTS public.rpc_lancamento_editar(uuid,jsonb,text);
DROP FUNCTION IF EXISTS public.rpc_lancamento_criar(jsonb,text);
DROP FUNCTION IF EXISTS public._d15_store_idem(text,text,jsonb);
DROP FUNCTION IF EXISTS public._d15_check_idem(text,text);
DROP VIEW     IF EXISTS public.v_lancamentos_derivados;
DROP TABLE    IF EXISTS public.chaves_de_idempotencia;
DROP TABLE    IF EXISTS public.migracao_d15_log;
```

Tempo estimado de rollback: <5 s. Nenhum dado produtivo é afetado.

---

## 5. Validações pós-aplicação (modo seguro)

Executar via `read_query`:

```sql
-- 5.1 Estruturas criadas
SELECT relname, relkind FROM pg_class
 WHERE relname IN ('migracao_d15_log','chaves_de_idempotencia','v_lancamentos_derivados')
 ORDER BY relname;

-- 5.2 security_invoker da view
SELECT c.relname, c.reloptions
  FROM pg_class c WHERE c.relname='v_lancamentos_derivados';
-- esperado: {security_invoker=on}

-- 5.3 RLS habilitada
SELECT relname, relrowsecurity FROM pg_class
 WHERE relname IN ('migracao_d15_log','chaves_de_idempotencia');
-- esperado: t / t

-- 5.4 Grants
SELECT grantee, privilege_type, table_name FROM information_schema.role_table_grants
 WHERE table_name IN ('migracao_d15_log','chaves_de_idempotencia')
 ORDER BY table_name, grantee;

-- 5.5 EXECUTE das RPCs apenas para authenticated
SELECT p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_exec
  FROM pg_proc p, pg_roles r
 WHERE p.proname LIKE 'rpc_lancamento_%' OR p.proname IN ('rpc_baixar_em_lote','rpc_estornar','rpc_conciliar','rpc_desconciliar')
   AND r.rolname IN ('anon','authenticated','service_role')
 ORDER BY p.proname, r.rolname;
-- esperado: anon=false em todas

-- 5.6 Volumetria operacional inalterada
SELECT 'titulos' tab, count(*) FROM titulos_financeiros
UNION ALL SELECT 'parcelas', count(*) FROM parcelas_financeiras
UNION ALL SELECT 'movimentacoes', count(*) FROM movimentacoes_financeiras
UNION ALL SELECT 'extrato', count(*) FROM extrato_banco;
-- esperado: todos zero (baseline Onda 0)

-- 5.7 Idempotência conceitual (admin)
SELECT public.rpc_lancamento_cancelar(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'teste',
  'idem-test-1'
);
-- 1ª chamada: erro 'título não encontrado' (esperado, sem idem store)
-- 2ª chamada com mesma key após criar título real: deve retornar idempotent_hit=true
```

---

## 6. Plano de teste

| # | Cenário | Esperado |
|---|---|---|
| T1 | Não-admin sem `financeiro.movimentar` chama `rpc_lancamento_criar` | erro permissão |
| T2 | `rpc_lancamento_criar` com `tipo='XX'` | erro tipo inválido |
| T3 | `rpc_lancamento_criar` sem `natureza_id` | erro obrigatório |
| T4 | `rpc_lancamento_criar` válido + mesma `idem_key` 2x | 1ª cria, 2ª retorna `idempotent_hit=true` mesmo `titulo_id` |
| T5 | `rpc_baixar_em_lote` baixa 100% das parcelas | trigger D4.6 muda título para BAIXADO; `v_lancamentos_derivados` mostra 3 linhas (TITULO/PARCELA/MOVIMENTO) |
| T6 | `rpc_estornar` em movimentação existente | nova movimentação com valor invertido; título volta para ABERTO via trigger |
| T7 | `rpc_lancamento_cancelar` em título BAIXADO | erro "use estorno" |
| T8 | `v_lancamentos_derivados` com user normal | só vê o que titulos/parcelas/movs já permitem (security_invoker funciona) |
| T9 | `rpc_conciliar` em extrato inexistente | erro "linha de extrato não encontrada" |
| T10 | UI atual `/financeiro` carrega normalmente | nenhuma diferença visual ou funcional |

Testes T1–T9 só serão executados após aplicação, em Onda 1.B, contra ambiente Test com 1 fixture mínima. Nenhuma alteração de UI antes do aceite.

---

## 7. Risco crítico registrado — `ms.audit.v1`

Confirmado em Onda 0: **`ms.audit.v1` é o log operacional REAL e vive apenas em localStorage**. Implicação:

- Toda operação anterior à Onda 1.A está auditada **só no navegador do operador**.
- Trocar de máquina, navegador ou sessão = **perda permanente** do trilha de auditoria histórica.
- A partir do corte LS → Supabase (Onda 1.B+), operações novas terão auditoria em `audit_log` e `migracao_d15_log`, mas o histórico LS precisa ser exportado e ingerido.

**Reprioritização proposta:** subir **Onda 5 (Auditoria)** para imediatamente após Onda 1.B (antes das Ondas 2/3). Plano mestre atualizado nesta resposta.

---

## 8. Checklist de aceite Onda 1.A

- [ ] SQL revisado e aprovado (este documento)
- [ ] Migração emitida via `supabase--migration` sem erro
- [ ] Linter Supabase sem novos ERROR (WARNs aceitos no padrão D14.2)
- [ ] Validações §5.1–§5.6 OK
- [ ] Volumetria de `titulos/parcelas/movimentacoes/extrato` = 0 (inalterada)
- [ ] Nenhum arquivo de UI modificado nesta onda
- [ ] Todas as flags `D15_*` em `featureFlags.ts` = `false`
- [ ] Risco R4 (`ms.audit.v1`) registrado em memória do projeto
- [ ] Plano mestre atualizado com reprioritização de Onda 5
- [ ] Sinal verde para Onda 1.B (paridade snapshot `658dff81` → Supabase em modo dry-run)

---

**Próximo passo:** aprove explicitamente para eu executar `supabase--migration` com o SQL de `MIGRATION.sql`. Após aplicar, rodo as validações §5 e devolvo o relatório de aceite.
