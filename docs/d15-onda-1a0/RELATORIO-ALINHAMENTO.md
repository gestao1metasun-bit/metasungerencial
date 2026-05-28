# D15 — Onda 1.A.0 (REV2) — Alinhamento Financeiro + Integrabilidade

**Modo:** DDL puro. Sem dados, sem flags, sem UI, sem corte LS.
**Diretriz oficial:** Meta Sun NÃO é sistema fiscal/contábil. Esta onda
prepara o financeiro gerencial para ser fonte operacional confiável **e**
deixa estruturas para integrar futuramente com sistema externo
(Domínio/Alterdata/Sankhya/TOTVS) sem refazer o núcleo.

---

## 1. Diagnóstico — charter × schema real × integrabilidade

### 1.1 Já existe no banco

| Categoria | Itens |
|---|---|
| Cadastros | `fornecedores`, `naturezas_financeiras`, `centros_resultado`, `contas_financeiras` ✅ |
| Núcleo financeiro | `titulos_financeiros`, `parcelas_financeiras`, `movimentacoes_financeiras` ✅ |
| Complementar | `titulos_taxas` (enterprise), `boletos`+`boletos_itens`, `adiantamentos`+`adiantamento_abatimentos`, `rescisoes_contrato`, `extrato_banco` ✅ |
| Permissões | `financeiro.{visualizar,movimentar,editar,conciliar,renegociar,fechar_periodo,reabrir_periodo,excluir}` ✅ |
| Hardening | `tg_mf_aplica_movimento`, `tg_tf_bloqueia_baixa_manual`, `tg_em_bloqueia_saldo_negativo`, `tg_tf_guard_periodo`, `tg_audit_row` ✅ |

### 1.2 Gaps reais (corrigidos nesta onda)

| # | Gap | Tratamento |
|---|---|---|
| G1 | `titulos_financeiros` sem `natureza_id`, `fornecedor_id`, `created_by` | adicionar |
| G2 | `parcelas_financeiras` sem `created_by` | adicionar |
| G3 | **Zero FKs** declaradas no núcleo financeiro | declarar 14 FKs |
| G4 | Faltam índices para a view derivada e RPCs da Onda 1.A | criar 8 índices financeiros + 7 de integração |
| G5 | `updated_at` sem trigger em `titulos`/`parcelas` | criar 2 triggers |
| G6 | **Sem camada de integrabilidade** — ERP não tem como exportar/marcar status para sistema fiscal externo | adicionar 13 campos universais em 7 tabelas + 4 tabelas estruturais novas + 4 permissões |

### 1.3 Decisões mantidas (do REV1)

- `centro_id` preservado (não renomear para `centro_resultado_id`).
- `origem_tipo`+`origem_id` continua canônico (PV/Obra/Contrato/Fornecedor).
- `fornecedor_id` é **conveniência** para AP, convive com `origem_tipo='fornecedor'`.
- `tipo IN ('receber','pagar')` e status `PENDENTE/PARCIAL/RECEBIDO/ATRASADO/CANCELADO/RENEGOCIADO` mantidos.
- Tabela `lancamentos` **não** existe — lançamentos são VIEW derivada (Onda 1.A).

---

## 2. Diretriz fiscal/contábil — escopo desta onda

| Faz nesta onda | NÃO faz (e não fará no Meta Sun) |
|---|---|
| Campos de integrabilidade em 7 tabelas financeiras | Apuração de impostos, escrituração contábil |
| Tabela `lotes_integracao` (estrutural, vazia) | SPED/ECD/ECF/EFD |
| Tabela `mapeamentos_externos` (de-para genérico) | Motor de NF-e/NFS-e |
| Tabela `eventos_pendentes_integracao` (fila lógica vazia) | Fechamento contábil / partidas dobradas |
| Tabela `logs_integracao` (append-only, vazia) | Conector externo / chamada de API fiscal |
| Permissões `integracao.{visualizar,mapear,exportar,reprocessar}` | Exportação real de remessa (vai para uma onda futura sob flag) |
| FKs `lote_integracao_id` em todas as 7 tabelas financeiras | UI de integração / motor de despacho |

---

## 3. Escopo da `MIGRATION.sql` (REV2)

1. **Enum `app_permission`** — adiciona 4 valores via `ALTER TYPE`:
   `integracao.visualizar`, `integracao.mapear`, `integracao.exportar`, `integracao.reprocessar`.
2. **Vínculos** — `natureza_id`, `fornecedor_id`, `created_by` em `titulos_financeiros`; `created_by` em `parcelas_financeiras`.
3. **Integrabilidade universal (7 tabelas)** — `titulos`, `parcelas`, `movimentações`, `adiantamentos`, `boletos`, `rescisoes_contrato`, `extrato_banco`:
   - `codigo_externo text` — id no sistema fiscal externo.
   - `sistema_origem text` / `sistema_destino text` — rastreio bi-direcional.
   - `status_integracao text DEFAULT 'pendente'` — `pendente|exportado|integrado|erro|reprocessar|ignorado` (CHECK aplicado).
   - `data_integracao timestamptz`, `erro_integracao text`.
   - `hash_remessa text`, `lote_integracao_id uuid` (FK para `lotes_integracao`).
   - Em `titulos_financeiros` também: `conta_contabil_externa`, `tipo_documento`, `numero_documento`, `serie_documento`, `chave_documento`.
4. **FKs do núcleo (14)** — declaração explícita nas 3 tabelas centrais, com `ON DELETE` por intenção (RESTRICT para cadastros, SET NULL para usuários, CASCADE para parcelas→título).
5. **Índices (15)** — leitura financeira (FKs + origem polimórfica) + parciais `WHERE status_integracao <> 'integrado'` para fila de pendentes.
6. **Triggers `updated_at`** em `titulos_financeiros`, `parcelas_financeiras` (reusa `tg_set_updated_at_generic`).
7. **`lotes_integracao`** — agrupador de eventos por sistema/competência/tipo; status `aberto|fechado|exportado|integrado|erro|cancelado`; `hash_remessa`, contadores, `exportado_em/por`. RLS por `integracao.mapear`.
8. **`mapeamentos_externos`** — de-para genérico `(sistema_destino, tipo_mapeamento, chave_interna)` único; cobre natureza→conta, CR→CC, conta→banco, cliente/fornecedor→cadastro externo, tipo lançamento→evento, tipo doc→fiscal, forma pgto→meio pgto, obra→CC, material→categoria, operação→classificação (apenas estrutura, não há seed).
9. **`eventos_pendentes_integracao`** — fila lógica (`tipo_evento`, `entidade`, `entidade_id`, `payload jsonb`, `tentativas`, `proxima_tentativa`, `hash_payload`). Vazia. Sem worker.
10. **`logs_integracao`** — append-only (INSERT permitido a `integracao.exportar`; sem UPDATE/DELETE para `authenticated`).
11. **GRANTs + RLS + policies** em todas as 4 tabelas novas + triggers `updated_at`.

---

## 4. Validações §5 (rodar logo após o ALTER)

| # | Validação | SQL |
|---|---|---|
| V1 | Novas permissões | `SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='app_permission' AND e.enumlabel LIKE 'integracao.%';` → 4 |
| V2 | Colunas vínculo | `SELECT column_name FROM information_schema.columns WHERE table_name='titulos_financeiros' AND column_name IN ('natureza_id','fornecedor_id','created_by');` → 3 |
| V3 | Integrabilidade em 7 tabelas | `SELECT table_name, count(*) FROM information_schema.columns WHERE column_name IN ('codigo_externo','status_integracao','hash_remessa','lote_integracao_id') AND table_name IN ('titulos_financeiros','parcelas_financeiras','movimentacoes_financeiras','adiantamentos','boletos','rescisoes_contrato','extrato_banco') GROUP BY 1;` → 7 linhas, cada com 4 |
| V4 | FKs declaradas | `SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_name IN ('titulos_financeiros','parcelas_financeiras','movimentacoes_financeiras');` → ≥ 18 (14 núcleo + 4 de lote) |
| V5 | Tabelas novas | `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('lotes_integracao','mapeamentos_externos','eventos_pendentes_integracao','logs_integracao');` → 4 |
| V6 | RLS habilitada nas 4 | `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('lotes_integracao','mapeamentos_externos','eventos_pendentes_integracao','logs_integracao');` → 4 com `true` |
| V7 | Volumetria operacional inalterada | `SELECT count(*) FROM titulos_financeiros;` antes/depois → idênticos (0) |
| V8 | Flags D15 | `grep DEFAULT_FLAGS src/config/featureFlags.ts` → todas `false` |
| V9 | Linter Supabase | `supabase--linter` → baseline 75 WARN (não regredir) |

---

## 5. Rollback completo

```sql
-- Camada de integração
DROP TABLE IF EXISTS public.logs_integracao;
DROP TABLE IF EXISTS public.eventos_pendentes_integracao;
DROP TABLE IF EXISTS public.mapeamentos_externos;

-- FKs de lote antes de dropar lotes_integracao
ALTER TABLE public.titulos_financeiros        DROP CONSTRAINT IF EXISTS fk_tf_lote;
ALTER TABLE public.parcelas_financeiras       DROP CONSTRAINT IF EXISTS fk_pf_lote;
ALTER TABLE public.movimentacoes_financeiras  DROP CONSTRAINT IF EXISTS fk_mf_lote;
ALTER TABLE public.adiantamentos              DROP CONSTRAINT IF EXISTS fk_adi_lote;
ALTER TABLE public.boletos                    DROP CONSTRAINT IF EXISTS fk_bol_lote;
ALTER TABLE public.rescisoes_contrato         DROP CONSTRAINT IF EXISTS fk_res_lote;
ALTER TABLE public.extrato_banco              DROP CONSTRAINT IF EXISTS fk_ext_lote;
DROP TABLE IF EXISTS public.lotes_integracao;

-- Índices e triggers (idempotente: ver MIGRATION REV1)
DROP TRIGGER IF EXISTS tg_pf_updated_at ON public.parcelas_financeiras;
DROP TRIGGER IF EXISTS tg_tf_updated_at ON public.titulos_financeiros;

-- FKs do núcleo
ALTER TABLE public.movimentacoes_financeiras
  DROP CONSTRAINT IF EXISTS fk_mf_titulo, DROP CONSTRAINT IF EXISTS fk_mf_parcela,
  DROP CONSTRAINT IF EXISTS fk_mf_conta,  DROP CONSTRAINT IF EXISTS fk_mf_user;
ALTER TABLE public.parcelas_financeiras
  DROP CONSTRAINT IF EXISTS fk_pf_titulo, DROP CONSTRAINT IF EXISTS fk_pf_created_by;
ALTER TABLE public.titulos_financeiros
  DROP CONSTRAINT IF EXISTS fk_tf_cliente, DROP CONSTRAINT IF EXISTS fk_tf_consultor,
  DROP CONSTRAINT IF EXISTS fk_tf_centro,  DROP CONSTRAINT IF EXISTS fk_tf_conta,
  DROP CONSTRAINT IF EXISTS fk_tf_contrato,DROP CONSTRAINT IF EXISTS fk_tf_titulo_substituto,
  DROP CONSTRAINT IF EXISTS fk_tf_natureza,DROP CONSTRAINT IF EXISTS fk_tf_fornecedor,
  DROP CONSTRAINT IF EXISTS fk_tf_created_by;

-- Campos de integrabilidade (em cada uma das 7 tabelas):
-- ALTER TABLE public.<t> DROP COLUMN IF EXISTS codigo_externo, sistema_origem, sistema_destino,
--   status_integracao, data_integracao, erro_integracao, hash_remessa, lote_integracao_id,
--   conta_contabil_externa, tipo_documento, numero_documento, serie_documento, chave_documento;

-- Campos de vínculo
ALTER TABLE public.parcelas_financeiras DROP COLUMN IF EXISTS created_by;
ALTER TABLE public.titulos_financeiros
  DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS fornecedor_id, DROP COLUMN IF EXISTS natureza_id;

-- Permissões: enum não permite DROP VALUE em Postgres. Permanecem inativas (sem policies que as exijam).
```

> Nota: valores adicionados a `app_permission` não podem ser removidos pelo Postgres. Em rollback as 4 permissões ficam órfãs, sem efeito operacional.

---

## 6. Riscos e mitigações

| # | Risco | Sev | Mitigação |
|---|---|---|---|
| R1 | FK `cliente_id → clientes RESTRICT` impede exclusão de cliente com título | Médio | Comportamento desejado; soft-delete de cliente continua funcionando. |
| R2 | `CASCADE` em `parcelas.titulo_id` deleta parcelas se título for hard-deleted | Baixo | Convenção é soft-delete; hard-delete só admin. |
| R3 | Adição de coluna `NOT NULL DEFAULT 'pendente'` em tabela com linhas | Nulo | Todas as 7 tabelas financeiras = 0 linhas operacionais hoje. |
| R4 | `ALTER TYPE app_permission ADD VALUE` exige fora de transação em alguns clientes | Baixo | Cada `ADD VALUE` está em bloco `DO $$` próprio (idempotente). Migrations Supabase rodam em transação implícita; se falhar, usar `ADD VALUE IF NOT EXISTS` em PG ≥ 12 já está coberto pela checagem `IF NOT EXISTS`. |
| R5 | Novos índices oneram write | Baixo | Volume = 0 hoje; índices parciais minimizam custo. |
| R6 | Trigger `tg_set_updated_at_generic` já existir antes | Nulo | Migration usa `DROP TRIGGER IF EXISTS` antes do `CREATE`. |
| R7 | Operação produtiva em LS depender da ausência dos novos campos | Nulo | Colunas nullable / com DEFAULT; nenhum `INSERT` existente quebra. |
| R8 | Rollback do enum impossível | Baixo | Documentado; 4 permissões ficam órfãs sem efeito. |
| R9 | Confundir camada de integração com motor fiscal | Médio | Charter `mem://constraints/erp-escopo-fiscal-contabil` proíbe motor fiscal/contábil. Esta onda **só** cria tabelas vazias + campos. |

---

## 7. Impacto produtivo

| Dimensão | Mudança |
|---|---|
| UI | 0 |
| Stores LS | 0 |
| Comportamento operacional | 0 |
| Volumetria | 0 linhas migradas (todas tabelas alvo = 0) |
| Flags D15 | inalteradas (todas `false`) |
| Performance | apenas ganho (índices novos) |
| Permissões | +4 valores inativos no enum, sem policy que as exija fora das tabelas novas |

---

## 8. Checklist de aceite

- [ ] V1–V9 todas verdes
- [ ] Linter Supabase ≤ 75 WARN (baseline mantido)
- [ ] `count(titulos_financeiros)` antes == depois
- [ ] Build do projeto continua verde
- [ ] Nenhum arquivo de UI/store/repository foi tocado
- [ ] Flags `D15_*` continuam `false`
- [ ] Rollback §5 roda limpo em ambiente vazio
- [ ] Tabelas `lotes_integracao`, `mapeamentos_externos`, `eventos_pendentes_integracao`, `logs_integracao` permanecem **vazias** após aplicar

---

## 9. Recomendação para a reescrita da Onda 1.A

Após esta REV2 aplicada e validada, a `MIGRATION.sql` da Onda 1.A será **reescrita** com:

- View `v_lancamentos_derivados` (`security_invoker=on`) usando colunas reais: `valor_liquido`, `vencimento`, `competencia`, `observacoes`, `centro_id`, `origem_tipo`+`origem_id`, `tipo IN ('receber','pagar')`, status reais; agora **incluindo** `natureza_id`, `fornecedor_id`, `codigo_externo`, `status_integracao` já disponíveis.
- 7 RPCs `rpc_lancamento_*` que exigem `natureza_id`+`centro_id`+`conta_id` (todas FKs já válidas) e mapeiam payload→origem polimórfica.
- Infra `migracao_d15_log` + `chaves_de_idempotencia` + helpers `_d15_*` (pré-requisito das RPCs, não do schema — fica na 1.A).
- Sem alteração de UI; sem flags ativadas; sem corte LS.

A Onda 1.B (migração real do snapshot `658dff81`) recebe lote `sistema_origem='localstorage'` em cada registro, deixando trilha integral para a futura exportação.

---

## 10. Riscos operacionais herdados (registrados, sem ação aqui)

- **CRÍTICO** `ms.audit.v1` continua sendo log operacional em LS. Onda 5 já promovida para após 1.B.
- **MÉDIO** 17 stores LS financeiras seguem fonte única de verdade até 1.A+1.B+1.C concluídas.
- **BAIXO** `dados jsonb` em `titulos_financeiros` segue saco genérico — limpeza fica para Onda 7.
