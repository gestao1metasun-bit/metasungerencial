# D18.5 — Engenharia / Projetos / Obras / Consumo Contábil-Ready
**Data:** 2026-05-29 · **Status:** APLICADA · **Onda:** D18.5

## 1. Objetivo
Preparar o pilar de Engenharia (Projetos, Obras, Equipes, Instaladores e Consumo) para integração contábil futura, sem alterar operação, RLS, workflow, auditoria ou regras de negócio. Continua proibido: SPED, fiscal, folha, contabilidade oficial, partidas reais ou integração externa.

## 2. Entregas

### 2.1 Projetos Contábil-Ready
Tabela `projetos` ampliada com:
- `centro_resultado_id` (FK → `centros_resultado`)
- `natureza_operacional`
- `competencia` (date)
- `status_contabil` (default `PENDENTE`, CHECK em PENDENTE/CLASSIFICADO/CONCILIADO/BLOQUEADO/IGNORADO)
- Bloco integrabilidade: `codigo_externo`, `sistema_destino`, `status_integracao` (CHECK canônico), `data_integracao`, `hash_integracao`
- (já existia `centro_custo_id` desde D18.2)
- 3 índices novos (cr, competencia, status_integracao)

### 2.2 Obras Contábil-Ready
Tabela `obras` ampliada com:
- `competencia`
- `status_contabil` (CHECK canônico)
- `conta_contabil_referencia`
- `natureza_operacional`
- Bloco integrabilidade (5 campos + CHECK)
- (já existiam `centro_resultado_id`, `centro_custo_id`, `custo_previsto` desde D18.2)
- 2 índices novos (competencia, status_integracao)

### 2.3 Consumo Contábil-Ready (Estoque ↔ Engenharia)
`estoque_movimentos` já dispõe (desde D18.2/D18.4) de `origem_tipo`, `origem_id`, `obra_id`, `projeto_id`, `centro_custo_id`, `centro_resultado_id`, `categoria_contabil`, `hash_integracao`, `status_integracao`. Adicionados 2 índices compostos para rastreabilidade (`obra_id, projeto_id`) e (`cr, cc`).

### 2.4 Equipes & Instaladores (rastreabilidade pura)
Novas tabelas oficiais — sem folha, sem RH:
| Tabela | Campos-chave |
|---|---|
| `equipes_engenharia` | `nome`, `lider`, `centro_resultado_id`, `centro_custo_id`, integrabilidade, soft-delete |
| `instaladores_engenharia` | `nome`, `documento`, `equipe_id` (FK), integrabilidade, soft-delete |

RLS: leitura por `authenticated` (apenas não-deletados); escrita só `admin_master`/`admin_geral` via `has_role`. GRANTs explícitos para `authenticated` e `service_role` (padrão D14.2).

### 2.5 Catálogo Engenharia
Nova `engenharia_eventos_catalogo` (RLS + GRANTs + seeds idempotentes) com 7 eventos canônicos mapeados:
- PROJETO_CRIADO → PROJETO_CRIADO
- PROJETO_APROVADO → PROJETO_APROVADO
- OBRA_INICIADA → OBRA_INICIADA
- CONSUMO_MATERIAL → CONSUMO_OBRA
- OBRA_FINALIZADA → OBRA_FINALIZADA
- RETORNO_MATERIAL → RETORNO_OBRA
- AJUSTE_ENGENHARIA → AJUSTE_ENGENHARIA

### 2.6 Estrutura de Rentabilidade (preparatória)
View `v_rentabilidade_obra` (security_invoker=on, GRANT SELECT authenticated):
- `custo_previsto` (obras.custo_previsto)
- `custo_realizado` (∑ `estoque_movimentos.custo_total` em saída/baixa_entrega/entrega vinculadas à obra)
- `saldo_operacional`
Suporta drill por `competencia`, `centro_resultado_id`, `centro_custo_id`, `cliente_id`, `contrato_id`. Sem cálculo obrigatório — nenhuma trigger forçando classificação retroativa.

## 3. Restrições respeitadas
- ✅ Sem RPC nova, sem trigger nova, sem alteração de workflow, RLS operacional ou auditoria.
- ✅ Sem cálculo fiscal / contabilidade oficial / folha / RH / integração externa.
- ✅ Sem alteração de campos existentes (apenas adições com defaults seguros).
- ✅ Compatibilidade 100% retroativa (todos os novos campos opcionais ou default `PENDENTE`).

## 4. Impacto técnico
- **Linter:** 137 → 139 WARN (todos do padrão D14.2 — SELECT `USING (true)` em catálogo consultivo e `has_role` SECURITY DEFINER já mapeados). Zero ERROR.
- **Auditoria:** novas tabelas não escrevem audit ainda (rastreabilidade pura, sem mutação operacional crítica) — pode ser ampliada em D18.7 se necessário.
- **Performance:** 7 índices novos cobrindo filtros previstos em D18.6/D18.7.

## 5. Maturidade
| Indicador | Antes | Depois |
|---|---|---|
| Contábil-Ready | ~80% | **~89%** |
| Fiscal-Ready | ~55% | ~55% (inalterado) |
| ERP Geral | ~99% | ~99% |

Meta D18.5 (88-90%) **atingida**.

## 6. Próximos passos
| Onda | Foco |
|---|---|
| D18.6 | Financeiro Contábil-Ready (rateios de título, retenções já plantadas, lotes) |
| D18.7 | Partidas Contábeis Virtuais (`partidas_contabeis_virtuais` + lotes_integracao_contabil) |
| D18.8 | Relatórios consolidados (rentabilidade por CR/CC/cliente/contrato) |
| D18.9 | Validação final ≥85% (gate de fechamento contábil-ready) |

## 7. Critério de aceite — atendido
- ✅ Projetos: cr/cc/natureza/competência/integrabilidade.
- ✅ Obras: cr/cc/competência/conta_contabil/status_contabil/integrabilidade.
- ✅ Consumo Obra→Projeto→CC rastreável via `estoque_movimentos`.
- ✅ Equipes e Instaladores cadastrados sem folha/RH.
- ✅ 7 eventos contábeis de Engenharia mapeados.
- ✅ Estrutura para custo/margem por obra/projeto (view oficial).
- ✅ Sem alteração de RLS operacional, workflow, auditoria ou regras.
