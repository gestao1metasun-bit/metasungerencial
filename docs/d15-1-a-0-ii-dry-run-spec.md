# D15.1.a.0.ii — Spec do Dry-Run Financeiro Enterprise

> Documento técnico oficial do dry-run. Read-only, zero escrita, zero UI.
> Consome o snapshot canônico (manifesto §6) e produz relatório enterprise auditável.

---

## 1. Baseline Supabase (capturada antes do dry-run)

Snapshot da fotografia do banco **antes** de qualquer comparação:

| Entidade | Linhas | Observação |
|---|---:|---|
| `titulos_financeiros` | **0** | Tabela vazia. Toda operação financeira vive em LS. |
| `titulos_financeiros` ativos | 0 | — |
| Contas a receber | 0 | — |
| Contas a pagar | 0 | — |
| `parcelas_financeiras` | 0 | — |
| `movimentacoes_financeiras` | 0 | — |
| `titulos_renegociacoes` | 0 | — |
| `titulos_renegociacao_itens` | 0 | — |
| `titulos_taxas` | 0 | Estrutura D15.1.a.0.i+ pronta, sem dados |
| `adiantamentos` | 0 | Estrutura D15.1.a.0.i+ pronta, sem dados |
| `adiantamento_abatimentos` | 0 | — |
| `boletos` / `boletos_itens` | 0 / 0 | — |
| `fornecedores` | 0 | — |
| `extrato_banco` | 0 | — |
| `rescisoes_contrato` | 0 | — |
| `anexos` (titulo) | 0 | — |

**Consequência arquitetural:** o dry-run **não é** comparativo prod-vs-prod. É **validação de migrabilidade** do snapshot LS contra o esquema oficial Supabase. O "lado direito" da comparação é a *forma do esquema*, não dados.

---

## 2. Natureza correta deste dry-run

Por baseline = zero, o dry-run executa **três camadas** de análise sobre o snapshot:

### Camada 1 — Integridade do snapshot
- arquivo lido sem erro de parse
- hash SHA-256 confere com `integrity.hash_full`
- `stores_ausentes` documentado (não é erro, é fato)
- `manifest.operador.nome === 'Renan Barcelos'` (fonte canônica)

### Camada 2 — Paridade interna do snapshot (consistência LS↔LS)
- todo `parcela.titulo_id` aponta para `titulo.id` existente
- todo `movimentacao.titulo_id`/`parcela_id` aponta para registro existente
- todo `renegociacao.titulo_id` existente
- todo `abatimento.adiantamento_id` existente
- todo `boleto.titulo_id` existente
- todo `anexo.entidade_id` existente
- soma de `mf.valor` por título ≤ `titulo.valor` (sem baixa fantasma)
- `adiantamento.saldo = valor - sum(abatimentos não estornados)`

### Camada 3 — Mapeabilidade para o esquema oficial
Para cada registro de cada store, marcar com uma das **17 categorias** (§4)
indicando se migra direto, com normalização, com perda, ou se órfão.

---

## 3. Stores esperadas (6 oficiais)

| Store LS | Tabela oficial alvo | Notas |
|---|---|---|
| `fin-titulos` | `titulos_financeiros` + `parcelas_financeiras` + `movimentacoes_financeiras` | núcleo |
| `fin-renegociacao` | `titulos_renegociacoes` + `titulos_renegociacao_itens` | preserva histórico |
| `fin-estornos` | `movimentacoes_financeiras` (tipo=ESTORNO) | append-only |
| `fin-adiantamentos` | `adiantamentos` + `adiantamento_abatimentos` | saldo GENERATED |
| `fin-compras` | `boletos` + `boletos_itens` + `fornecedores` | requer dedup fornecedor |
| `fin-conciliacao` | `extrato_banco` | hash_linha previne duplicidade |

---

## 4. Categorias do relatório (canônicas)

Cada registro analisado recebe **uma** categoria:

| Categoria | Significado | Ação D15.1.a.0.iv |
|---|---|---|
| `OK` | mapeia 1:1 sem ajuste | migra direto |
| `CONVERTIDO` | mapeia com normalização determinística (ex: status legado → canônico) | migra com transform |
| `DIVERGENTE` | mapeia parcial, divergência conhecida e justificada | migra + flag |
| `ORFAO` | sem FK destino válido (cliente/contrato/PV/fornecedor ausente) | bloqueia migração até resolver |
| `INCOMPATIVEL` | esquema LS incompatível com oficial (campo obrigatório ausente) | exige normalização manual |
| `DUPLICIDADE` | aparece >1x no snapshot ou colide com outro registro | dedup obrigatório |
| `STATUS_INVALIDO` | status fora do enum oficial e sem mapeamento | exige decisão |
| `NATUREZA_INVALIDA` | natureza_financeira_id ausente / inválida | exige cadastro |
| `CENTRO_RESULTADO_INVALIDO` | CR ausente / inválido | exige cadastro |
| `ANEXO_QUEBRADO` | referência de anexo sem storage_path válido | perda controlada |
| `VINCULO_AUSENTE` | título sem PV/contrato/obra esperado | bloqueia rastreabilidade |
| `SEM_DESTINO` | store sem tabela oficial mapeada | dívida documentada |
| `TRUNCADO` | campo excede limite do esquema oficial | exige decisão |
| `INVALIDO` | parse falhou / campo obrigatório nulo | bloqueia migração |
| `PERDA_POTENCIAL` | dado existe em LS mas não tem coluna oficial onde caber | risco arquitetural |
| `SALDO_DIVERGENTE` | sum(movimentações) inconsistente com saldo aparente | exige reconciliação |
| `RENEGOCIACAO_INCONSISTENTE` | itens de renegociação não fecham com título origem | exige decisão |

---

## 5. Procedimento de execução

### Pré-requisitos
- arquivo `docs/d15-1-a-0-ii-snapshot-{YYYYMMDD-HHmm}-{hash8}.json` presente
- hash registrado no §6 do manifesto
- operador canônico confirmado (`Renan Barcelos`)

### Comando
```bash
bun run scripts/d15-dry-run-compare.ts docs/d15-1-a-0-ii-snapshot-<arquivo>.json
```

### Saída
- relatório markdown: `docs/d15-1-a-0-ii-dry-run-report-{YYYYMMDD-HHmm}.md`
- relatório JSON detalhado: `docs/d15-1-a-0-ii-dry-run-detail-{YYYYMMDD-HHmm}.json`
- exit code: `0` se readiness ≥ 95% e zero `INVALIDO`/`ORFAO`; `1` caso contrário

### Garantias
- **read-only** sobre Supabase (apenas SELECT em information_schema + counts)
- **read-only** sobre snapshot
- **nenhuma** chamada de RPC transacional
- **nenhuma** escrita no LS
- **nenhuma** alteração de UI

---

## 6. Estrutura do relatório enterprise

```
## D15.1.a.0.ii — Dry-Run Report
- Snapshot: <arquivo> (hash: <hash>)
- Operador: Renan Barcelos
- Executado: <timestamp>
- Baseline Supabase: TODAS as tabelas financeiras em ZERO

### Camada 1 — Integridade do snapshot
- ✅/❌ parse OK
- ✅/❌ hash confere
- ✅/❌ fonte canônica
- stores presentes: X/6

### Camada 2 — Paridade interna (LS↔LS)
- títulos: X total / Y órfãos de parcela / Z saldo divergente
- renegociações: X / Y inconsistentes
- abatimentos: X / Y sem adiantamento
- (etc)

### Camada 3 — Mapeabilidade ao esquema oficial
Tabela por store × categoria, com contagens.

### Sumário enterprise
- Total migrável (OK + CONVERTIDO):    X (Y%)
- Total com ajuste (DIVERGENTE + STATUS_INVALIDO + ...): X (Y%)
- Total bloqueado (ORFAO + INVALIDO + INCOMPATIVEL): X (Y%)
- Perda potencial: X (Y%)
- Paridade percentual: Y%
- Readiness para dual-read: SIM/NÃO

### Decisões pendentes
Lista exigida antes de a.0.iii (cadastros faltantes, mapeamentos de status, etc).
```

---

## 7. Critério de aceite para D15.1.a.0.iii (Dual Read + Feature Flag)

- [ ] readiness ≥ 95%
- [ ] zero `INVALIDO` não justificado
- [ ] zero `ORFAO` ou todos resolvidos / aceitos
- [ ] `PERDA_POTENCIAL` documentada e aprovada
- [ ] todas as decisões pendentes (cadastros, status, naturezas) resolvidas
- [ ] rollback garantido (snapshot íntegro + nenhum write em Supabase)

---

## 8. Restrições absolutas desta sub-onda

- ❌ swap de fonte
- ❌ corte do localStorage
- ❌ alteração de UI
- ❌ escrita em tabela financeira
- ❌ alteração de fluxo transacional
- ❌ alteração de governança/RLS
- ✅ apenas leitura, parse, comparação estrutural, relatório
