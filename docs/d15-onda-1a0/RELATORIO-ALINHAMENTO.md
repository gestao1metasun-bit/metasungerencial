# D15 — Onda 1.A.0 — Alinhamento Estrutural Financeiro

**Modo:** estrutura apenas. Sem dados, sem flags, sem UI, sem corte LS.
**Pré-requisito:** aprovação explícita antes de aplicar `MIGRATION.sql`.
**Sucessor:** Onda 1.A (reescrita) só roda após esta onda validada.

---

## 1. Diagnóstico — Charter D15 × Schema Real

### 1.1 Estruturas que **JÁ EXISTEM** no banco (descoberta principal)

A memória D15.1.a.0.i+ está correta — o grosso da fundação financeira oficial **já está no Supabase**:

| Categoria | Item | Estado |
|---|---|---|
| Cadastro | `fornecedores` | ✅ existe |
| Cadastro | `naturezas_financeiras` | ✅ existe |
| Cadastro | `centros_resultado` | ✅ existe |
| Cadastro | `contas_financeiras` | ✅ existe |
| Núcleo | `titulos_financeiros`, `parcelas_financeiras`, `movimentacoes_financeiras` | ✅ existem |
| Complementar | `titulos_taxas`, `boletos`, `adiantamentos`, `adiantamento_abatimentos`, `rescisoes_contrato`, `extrato_banco` | ✅ existem |
| Permissões | `financeiro.movimentar`, `.editar`, `.visualizar`, `.conciliar`, `.renegociar`, `.fechar_periodo`, `.reabrir_periodo`, `.excluir` | ✅ todas no enum `app_permission` |
| Hardening | triggers `tg_mf_aplica_movimento`, `tg_tf_bloqueia_baixa_manual`, `tg_em_bloqueia_saldo_negativo`, `tg_tf_guard_periodo`, `tg_audit_row` | ✅ ativos |

**Conclusão:** não é preciso criar a "estrutura financeira oficial" do zero — ela existe. O gap é cirúrgico.

### 1.2 Mismatches do MIGRATION.sql original × schema real

A `docs/d15-onda-1a/MIGRATION.sql` foi escrita contra um modelo **hipotético** divergente do schema real:

| MIGRATION.sql (errado) | Schema real (correto) |
|---|---|
| `valor_total` | `valor_bruto`, `valor_liquido`, `saldo` |
| `data_emissao` | `competencia` (date) |
| `data_vencimento` | `vencimento` |
| `descricao` | `observacoes` (não há campo `descricao`) |
| `observacao` | `observacoes` |
| `centro_resultado_id` | `centro_id` (mantido — decisão do operador) |
| `pv_id`, `obra_id`, `fornecedor_id` (colunas dedicadas) | `origem_tipo` + `origem_id` (padrão polimórfico já validado por CHECK) |
| `created_by` | (ausente — usar `dados->>'created_by'` ou criar coluna) |
| `tipo IN ('AR','AP')` | `tipo IN ('receber','pagar')` |
| `status ABERTO/BAIXADO` | `status PENDENTE/PARCIAL/RECEBIDO/ATRASADO/CANCELADO/RENEGOCIADO` |
| `movimentacoes.tipo BAIXA/ESTORNO/CONCILIACAO` | `tipo recebimento/baixa/estorno/juros/multa/desconto` |

### 1.3 Gaps REAIS de schema (o que esta onda corrige)

**G1. Vínculos faltantes em `titulos_financeiros`:**
- ❌ `natureza_id uuid` — exigido pelo charter (toda RPC oficial obriga natureza).
- ❌ `fornecedor_id uuid` — útil como FK direta em AP (hoje só via `origem_tipo='fornecedor'`).
- ❌ `created_by uuid` — auditoria mais barata que parsing `dados->>'created_by'`.

**G2. Vínculos faltantes em `parcelas_financeiras`:**
- ❌ `created_by uuid` — paridade com títulos.

**G3. FKs declaradas no núcleo financeiro = ZERO.**
Hoje **nenhuma** FK existe em `titulos_financeiros`, `parcelas_financeiras` ou `movimentacoes_financeiras`. Risco real de órfãos. Esta onda declara as FKs.

**G4. Índices de leitura para a view derivada e RPCs.**
Faltam índices em `parcelas_financeiras.titulo_id`, `movimentacoes_financeiras.titulo_id/parcela_id`, `titulos_financeiros.natureza_id`, `.centro_id`, `.conta_id`, `.origem_tipo+origem_id`.

**G5. Triggers `updated_at`.**
`titulos_financeiros`, `parcelas_financeiras` têm coluna `updated_at` mas não há trigger que a atualize (verificar).

---

## 2. Decisões arquiteturais desta onda

| Decisão | Direção tomada | Justificativa |
|---|---|---|
| Nome do centro de resultado | **Manter `centro_id`** (não renomear) | Zero impacto em código existente. RPCs novas usam `centro_id`. |
| Vínculo PV/Obra/Fornecedor | **Manter `origem_tipo`+`origem_id` como canônico** | Padrão já implementado, com CHECK, com 10 origens semeadas. Adicionar `fornecedor_id` apenas como conveniência opcional para AP. |
| Status `tipo` | **Manter `receber`/`pagar`** | Convenção do projeto inteiro. RPCs do D15 se adaptam. |
| Status `status` | **Manter `PENDENTE/PARCIAL/RECEBIDO/ATRASADO/CANCELADO/RENEGOCIADO`** | Triggers de hardening dependem destes valores. |
| `descricao` | **Não criar coluna nova** — usar `observacoes` | Evita renomeação massiva. |
| Tabela `lancamentos` | **Não criar** — Lançamento é VISÃO derivada (decisão oficial D15) | Memória `d15-lancamentos-derivado`. |

---

## 3. Escopo da `MIGRATION.sql` desta onda (1.A.0)

1. `ALTER TABLE titulos_financeiros ADD COLUMN natureza_id uuid;`
2. `ALTER TABLE titulos_financeiros ADD COLUMN fornecedor_id uuid;`
3. `ALTER TABLE titulos_financeiros ADD COLUMN created_by uuid;`
4. `ALTER TABLE parcelas_financeiras ADD COLUMN created_by uuid;`
5. Declarar FKs em `titulos_financeiros`: `cliente_id → clientes`, `consultor_id → auth.users`, `centro_id → centros_resultado`, `conta_id → contas_financeiras`, `contrato_id → contratos`, `titulo_substituto_id → titulos_financeiros`, `natureza_id → naturezas_financeiras`, `fornecedor_id → fornecedores`, `created_by → auth.users`. Todas `ON DELETE RESTRICT` (proteção) exceto `consultor_id`/`created_by` (`SET NULL`).
6. Declarar FKs em `parcelas_financeiras`: `titulo_id → titulos_financeiros ON DELETE CASCADE`, `created_by → auth.users SET NULL`.
7. Declarar FKs em `movimentacoes_financeiras`: `titulo_id → titulos_financeiros ON DELETE RESTRICT`, `parcela_id → parcelas_financeiras ON DELETE RESTRICT`, `conta_id → contas_financeiras`, `user_id → auth.users`.
8. Índices: `idx_tf_natureza`, `idx_tf_centro`, `idx_tf_conta`, `idx_tf_fornecedor`, `idx_tf_origem (origem_tipo,origem_id)`, `idx_pf_titulo`, `idx_mf_titulo`, `idx_mf_parcela`. Todos `WHERE deleted_at IS NULL` quando aplicável.
9. Triggers `updated_at`: adicionar `tg_set_updated_at_generic` em `titulos_financeiros`, `parcelas_financeiras` se ausentes.
10. **Nenhuma RPC, nenhuma view, nenhum dado.** RPCs e `v_lancamentos_derivados` ficam para a Onda 1.A reescrita.

---

## 4. Validações §5 (rodam após o `ALTER`)

| # | Validação | SQL |
|---|---|---|
| V1 | Colunas adicionadas | `SELECT column_name FROM information_schema.columns WHERE table_name='titulos_financeiros' AND column_name IN ('natureza_id','fornecedor_id','created_by');` → 3 linhas |
| V2 | FKs declaradas | `SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_name IN ('titulos_financeiros','parcelas_financeiras','movimentacoes_financeiras');` → ≥ 14 |
| V3 | Índices novos | `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_tf_%' OR indexname LIKE 'idx_pf_titulo' OR indexname LIKE 'idx_mf_%';` → ≥ 8 |
| V4 | Linhas operacionais inalteradas | `SELECT count(*) FROM titulos_financeiros;` antes/depois → idênticos (0) |
| V5 | Nenhuma flag D15 ativada | `grep "DEFAULT_FLAGS" src/config/featureFlags.ts` → todas `false` |
| V6 | Linter Supabase | `supabase--linter` → não aumenta # de WARNs (baseline 75) |

---

## 5. Rollback completo

```sql
-- ordem inversa
DROP INDEX IF EXISTS public.idx_mf_parcela;
DROP INDEX IF EXISTS public.idx_mf_titulo;
DROP INDEX IF EXISTS public.idx_pf_titulo;
DROP INDEX IF EXISTS public.idx_tf_origem;
DROP INDEX IF EXISTS public.idx_tf_fornecedor;
DROP INDEX IF EXISTS public.idx_tf_conta;
DROP INDEX IF EXISTS public.idx_tf_centro;
DROP INDEX IF EXISTS public.idx_tf_natureza;

ALTER TABLE public.movimentacoes_financeiras
  DROP CONSTRAINT IF EXISTS fk_mf_titulo,
  DROP CONSTRAINT IF EXISTS fk_mf_parcela,
  DROP CONSTRAINT IF EXISTS fk_mf_conta,
  DROP CONSTRAINT IF EXISTS fk_mf_user;

ALTER TABLE public.parcelas_financeiras
  DROP CONSTRAINT IF EXISTS fk_pf_titulo,
  DROP CONSTRAINT IF EXISTS fk_pf_created_by,
  DROP COLUMN IF EXISTS created_by;

ALTER TABLE public.titulos_financeiros
  DROP CONSTRAINT IF EXISTS fk_tf_cliente,
  DROP CONSTRAINT IF EXISTS fk_tf_consultor,
  DROP CONSTRAINT IF EXISTS fk_tf_centro,
  DROP CONSTRAINT IF EXISTS fk_tf_conta,
  DROP CONSTRAINT IF EXISTS fk_tf_contrato,
  DROP CONSTRAINT IF EXISTS fk_tf_titulo_substituto,
  DROP CONSTRAINT IF EXISTS fk_tf_natureza,
  DROP CONSTRAINT IF EXISTS fk_tf_fornecedor,
  DROP CONSTRAINT IF EXISTS fk_tf_created_by,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS fornecedor_id,
  DROP COLUMN IF EXISTS natureza_id;

DROP TRIGGER IF EXISTS tg_pf_updated_at ON public.parcelas_financeiras;
DROP TRIGGER IF EXISTS tg_tf_updated_at ON public.titulos_financeiros;
```

---

## 6. Riscos e mitigações

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| R1 | FK `cliente_id → clientes RESTRICT` quebra futura exclusão de cliente com título | Médio | Usar `ON DELETE RESTRICT` é o desejado — proteção. Soft-delete de cliente já existe e não dispara. |
| R2 | FK `titulo_id CASCADE` em parcelas deleta parcelas se título for hard-deleted | Baixo | Convenção do ERP é soft-delete; hard-delete só admin via SQL. Aceito. |
| R3 | Adicionar coluna `created_by` NULL em tabela com 0 linhas | Nulo | titulos/parcelas operacionais = 0 linhas hoje. Backfill futuro a partir de `dados->>'created_by'` se houver. |
| R4 | Novos índices aumentam custo de write | Baixo | Volume operacional financeiro = 0; impacto desprezível por meses. |
| R5 | Trigger `tg_set_updated_at_generic` já existir | Baixo | Migration usa `DROP TRIGGER IF EXISTS` antes do `CREATE`. |
| R6 | Operação produtiva em LS depender da ausência das colunas | Nulo | Adicionar coluna nullable é compatível ascendente; nenhum SELECT/INSERT atual quebra. |

---

## 7. Impacto produtivo

- **UI:** 0 mudanças.
- **Stores LS:** 0 mudanças.
- **Comportamento operacional:** 0 mudanças.
- **Volumetria:** 0 linhas afetadas (todas tabelas financeiras = 0).
- **Permissões:** 0 mudanças.
- **Flags D15:** todas continuam `false`.
- **Performance:** apenas ganho (índices novos).

---

## 8. Checklist de aceite

- [ ] V1–V6 todas verdes
- [ ] Linter Supabase não regrediu (baseline ≤ 75 WARN)
- [ ] `count(titulos_financeiros)` antes == depois
- [ ] Build do projeto continua verde
- [ ] Nenhuma flag `D15_*` mudou
- [ ] Nenhum arquivo de UI/store/repository foi tocado
- [ ] Rollback testável (script §5 roda limpo em ambiente vazio)
- [ ] Rastreabilidade: log no `migracao_d15_log` opcional (esta onda é DDL puro, pode-se registrar manualmente entrada com `onda='1.A.0'`)

---

## 9. Recomendação revisada para a Onda 1.A

Após 1.A.0 aprovada e aplicada, a `MIGRATION.sql` da Onda 1.A será **reescrita** com:

- `v_lancamentos_derivados` usando colunas reais: `valor_liquido`, `vencimento`, `competencia`, `observacoes`, `centro_id`, `origem_tipo`+`origem_id`, `tipo IN ('receber','pagar')`, status reais.
- RPCs `rpc_lancamento_*` mapeando payload do operador → schema canônico, exigindo `natureza_id`+`centro_id`+`conta_id`.
- `rpc_lancamento_criar` decide `origem_tipo` a partir do payload (`pv_id` → `'pedido_venda'`, `obra_id` → `'obra'`, `fornecedor_id` → `'fornecedor'`, etc.) e grava `origem_id`.
- Idempotência + auditoria + `migracao_d15_log` mantidos como projetados.
- Infra `migracao_d15_log` + `chaves_de_idempotencia` + helpers `_d15_*` migram para a Onda 1.A reescrita (são pré-requisito das RPCs, não do schema).

---

## 10. Riscos operacionais herdados (registrados, sem ação nesta onda)

- **CRÍTICO** `ms.audit.v1` continua sendo log operacional em LS. Onda 5 já promovida para após 1.B.
- **MÉDIO** 17 stores LS financeiras seguem como fonte única de verdade até a Onda 1.A + 1.B + 1.C concluírem.
- **BAIXO** `dados jsonb` em `titulos_financeiros` segue como saco genérico — limpeza fica para Onda 7.
