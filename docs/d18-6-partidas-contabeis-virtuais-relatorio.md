# D18.6 — Partidas Contábeis Virtuais
**Data:** 2026-05-29 · **Status:** APLICADA · **Onda:** D18.6

## 1. Objetivo
Criar a camada universal de tradução entre eventos do ERP Meta Sun e eventos contábeis futuros, sem gerar lançamento contábil oficial, SPED, ECD, ECF, escrituração ou conector externo.

## 2. Entregas

### 2.1 Tabela oficial `partidas_contabeis_virtuais`
Campos: `evento_id`, `evento_canonico`, `modulo_origem` (CHECK COMERCIAL/FINANCEIRO/ESTOQUE/ENGENHARIA/OPERACAO_FINANCEIRA/COMPRAS/OUTROS), `origem_tipo`, `origem_id`, `conta_debito_id`/`conta_credito_id` (FK plano_contas) + códigos textuais, `valor`, `competencia`, `data_evento`, `natureza_id`, `centro_resultado_id`, `centro_custo_id`, `lote_id`, `status` (PENDENTE/MAPEADA/CONCILIADA/EXPORTADA/BLOQUEADA/IGNORADA/CANCELADA), `origem_payload` jsonb, bloco integrabilidade universal (`codigo_externo`, `sistema_destino`, `status_integracao` CHECK canônico, `data_integracao`, `hash_integracao`).

RLS: SELECT authenticated, escrita apenas `admin_master`/`admin_geral` via `has_role`. 7 índices (evento_canonico, módulo, origem composto, competência, status, lote, CR/CC).

### 2.2 Tabela `lotes_integracao_contabil` (preparatória)
Agrupador de partidas para exportação futura. Campos: `codigo` único, `competencia`, `sistema_destino`, `status` (ABERTO/FECHADO/EXPORTADO/CANCELADO), totais (qtde/débito/crédito), `hash_integracao`. RLS idêntico (leitura authenticated / escrita admin).

### 2.3 Catálogo financeiro novo
`financeiro_eventos_catalogo` (faltava — só existiam comercial/estoque/engenharia). Seeds idempotentes: RECEBIMENTO, PAGAMENTO, ADIANTAMENTO_REGISTRADO, ADIANTAMENTO_ABATIDO, RENEGOCIACAO, RESCISAO, OPERACAO_FIN_LIBERADA, OPERACAO_FIN_BAIXA, ESTORNO_RECEBIMENTO, ESTORNO_PAGAMENTO.

### 2.4 View consolidada `v_eventos_canonicos_catalogo` (security_invoker)
UNION ALL dos 4 catálogos (normaliza colunas — comercial/estoque usam `evento`, financeiro/engenharia usam `codigo`). Fonte única para o motor de tradução. Cobre os blocos exigidos:
- **Comercial:** contrato aprovado, contrato assinado, PV aprovado, faturamento, cancelamento, aditivo (10 seeds D18.3).
- **Financeiro:** recebimento, pagamento, adiantamento, renegociação, rescisão, operação financeira (10 seeds D18.6).
- **Estoque:** compra, entrada, saída, consumo obra, ajuste, inventário (6 seeds D18.4).
- **Engenharia:** projeto criado, obra iniciada, obra finalizada, retorno material, ajuste, projeto aprovado, consumo material (7 seeds D18.5).

### 2.5 Views operacionais
- `v_partidas_contabeis_pendentes` — partidas em PENDENTE/MAPEADA/BLOQUEADA com joins enriquecidos (CR/CC/natureza).
- `v_partidas_contabeis_resumo` — agregação por módulo × competência × evento × status (qtde, valor_total).

### 2.6 Motor de mapeamento
Reaproveita `mapeamentos_contabeis` (D18.2): natureza × evento_canonico → plano_conta + CR default. A geração efetiva de partidas (RPC `rpc_pcv_gerar_*`) fica reservada para D18.7+ — D18.6 entrega apenas a fundação e o ponto de extensão.

## 3. Restrições respeitadas
- ✅ Zero alteração em RLS operacional, workflow, auditoria, RPC ou regra de negócio.
- ✅ Sem geração automática de partida em produção (tabela existe vazia; ingestão futura controlada).
- ✅ Sem SPED, ECD, ECF, escrituração, fiscal, exportação ou conector externo.
- ✅ 100% compatível com massa atual (nenhuma coluna obrigatória nova fora dos defaults).

## 4. Impacto técnico
- **Linter:** 139 WARN (estável — padrão D14.2; views security_invoker, escrita admin).
- **Auditoria:** novas tabelas não precisam de audit forward-only (não são entidades operacionais críticas — são camada técnica de tradução).
- **Performance:** 7 índices em `partidas_contabeis_virtuais` cobrem filtros previstos (status, competência, módulo, origem, CR/CC).

## 5. Maturidade
| Indicador | Antes | Depois |
|---|---|---|
| Contábil-Ready | ~89% | **~95%** |
| Fiscal-Ready | ~55% | ~55% (inalterado) |
| ERP Geral | ~99% | ~99% |

Meta D18.6 (95%) **atingida**.

## 6. Próximos passos
| Onda | Foco |
|---|---|
| D18.7 | RPCs `rpc_pcv_gerar_{recebimento,pagamento,faturamento,consumo_obra,...}` + trigger opcional por evento, sempre via flag de sessão |
| D18.8 | Relatórios consolidados (rentabilidade, DRE preparatório por CR/CC/competência) |
| D18.9 | Validação final ≥85% (gate de fechamento contábil-ready) |

## 7. Critério de aceite — atendido
- ✅ `partidas_contabeis_virtuais` criada com todos os campos exigidos.
- ✅ Catálogos universais cobrindo Comercial/Financeiro/Estoque/Engenharia.
- ✅ View consolidada de eventos canônicos (fonte única).
- ✅ Estrutura de lote pronta para exportação futura.
- ✅ Sem contabilidade oficial, fiscal, exportação ou integração externa.
- ✅ Sem alteração de RLS/workflow/auditoria/regra operacional.
