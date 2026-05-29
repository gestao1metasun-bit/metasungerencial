> Documento canônico **D18 — Padronização Contábil-Ready** do ERP Meta Sun.
> Diretriz mestre: ERP segue **gerencial/operacional/financeiro**. Fiscal/contábil/SPED/ECD/ECF/EFD ficam em sistema externo (Domínio/Alterdata/Sankhya/TOTVS). O ERP só precisa nascer rastreável, classificável e mapeável.

# D18 — Contábil-Ready — Documento Canônico

## 1. Princípios

1. Toda operação relevante (financeira, comercial, compra, estoque, obra, OS, comissão, operação financeira especial) deve carregar **origem, classificação gerencial e classificação contábil mapeável**.
2. Não implementar SPED/ECD/ECF/EFD/apuração/emissão fiscal/fechamento contábil oficial dentro do Meta Sun.
3. Não criar conector externo agora. Só estrutura, padronização, mapeamento e rastreabilidade.
4. **Centro de Resultado** mede resultado gerencial por área. **Centro de Custo** mede consumo/custo operacional específico. As duas dimensões coexistem e são obrigatórias em pontos distintos.
5. Partidas contábeis virtuais são *preparatórias*, nunca contabilidade oficial.

## 2. Padrão de Campos Universais

Quando aplicável, toda tabela de evento deve carregar:

```
origem_tipo, origem_id,
cliente_id, fornecedor_id, contrato_id, pedido_venda_id, projeto_id,
obra_id, ordem_servico_id, pedido_compra_id, item_estoque_id,
natureza_id, centro_resultado_id, centro_custo_id, conta_financeira_id,
competencia, data_emissao, data_vencimento,
valor_bruto, valor_liquido, desconto, acrescimo, retencao, tipo_retencao,
status, historico_padrao, historico_complementar,
usuario_responsavel, created_at, updated_at,
lote_integracao_id, codigo_externo, sistema_destino, status_integracao, hash_integracao
```

Não significa que toda tabela precisa de todos. Significa: **o que se aplica ao domínio é obrigatório**.

## 3. Diagnóstico (Score atual)

Estado avaliado contra os 9.170 LOC de `src/integrations/supabase/types.ts` e memórias D15/F1/F2:

| Bloco | Cobertura Contábil-Ready | Observação |
|---|---|---|
| `titulos_financeiros` | ~70% | Base mais madura, falta PV/projeto/obra/CR/CC/retenção |
| `parcelas_financeiras` | ~20% | Quase só status + integração genérica |
| `movimentacoes_financeiras` | ~20% | Sem natureza/competência/CR/CC/retenção |
| `operacoes_financeiras` (F1) | ~55% | CR/natureza/competência ok; falta CC/conta_financeira_id/lote |
| `operacoes_financeiras_parcelas` | ~10% | Mínima |
| `comercial_comissoes` | ~75% | Falta origem/PV/retenção/historico/hash |
| `pedidos_venda` | ~30% | Sem CR/natureza/valores normalizados/integração |
| `contratos` / `propostas` | ~30% | Idem PV |
| `ordens_compra` | ~5% | `fornecedor_id` é texto, sem natureza/CR/CC/competência |
| `estoque_movimentos` | ~25% | `origem_tipo` sem `origem_id`, sem natureza/CR/CC |
| `obras` / `projetos` | ~30% | Falta CR/CC dedicado + codigo_externo |
| `adiantamentos` | ~60% | `natureza` ainda é texto, falta CR/CC/historico |
| `boletos` | ~40% | Falta natureza/CR/competencia/valores normalizados |
| `titulos_renegociacoes` | ~10% | Crítico |
| **Cadastro `centros_custo`** | **0%** | Tabela **não existe** |
| **`mapeamentos_contabeis`** | **0%** | Tabela **não existe** |
| **`partidas_contabeis_virtuais`** | **0%** | Tabela **não existe** |
| **Módulo OS** | **0%** | Tabela `ordens_servico` **não existe** |

**Score global atual ≈ 38%. Meta D18 fim ≈ 85%.**

## 4. Lacunas Críticas (bloqueantes para integração)

| # | Lacuna | Bloqueia |
|---|---|---|
| L1 | `centros_custo` não existe (só `centros_resultado`) | TOTVS/Domínio/Sankhya exigem CR≠CC |
| L2 | `conta_financeira_id` inconsistente (várias tabelas usam `conta_id` sem FK) | Mapear conta bancária → conta contábil |
| L3 | `natureza_id` ausente em movimentações/compras/estoque | Classificação contábil automática |
| L4 | `retencao` + `tipo_retencao` ausentes globalmente | IRRF/ISS/CSLL/INSS na exportação |
| L5 | `mapeamentos_contabeis` não existe | Sem de-para natureza→D/C |
| L6 | `partidas_contabeis_virtuais` não existe | Sem validação prévia do lançamento |
| L7 | `ordens_servico` não existe | Serviços sem evento rastreável |
| L8 | `ordens_compra.fornecedor_id` é texto livre | Sem FK = sem cruzamento CNPJ |
| L9 | `hash_integracao` ausente em 14 tabelas | Reenvio = duplicação no destino |
| L10 | `competencia` ausente em movimentações | Caixa vs competência ambíguo |

## 5. Cadastros Estruturais Necessários

### Já existem (manter, não recriar)
`naturezas_financeiras`, `centros_resultado`, `contas_financeiras`, `plano_contas`, `grupos_financeiros`, `subgrupos_financeiros`, `lotes_integracao`, `mapeamentos_externos`, `fornecedores`, `clientes`, `produtos`.

### Criar em D18
1. `centros_custo` — espelho de `centros_resultado`, com `pai_id` (hierarquia), `tipo` (`OBRA`/`EQUIPE`/`VEICULO`/`ALMOX`/`ADM`), `codigo_externo`, `sistema_destino`, `ativo`.
2. `mapeamentos_contabeis` — `evento_tipo`, `modulo_origem`, `natureza_id`, `centro_resultado_id`, `categoria_item`, `tipo_operacao`, `conta_debito_id` (FK plano_contas), `conta_credito_id` (FK plano_contas), `historico_padrao`, `sistema_destino`, `ativo`, `data_inicio`, `data_fim`.
3. `partidas_contabeis_virtuais` — `evento_tipo`, `origem_tipo`, `origem_id`, `data_evento`, `competencia`, `conta_debito_id`, `conta_credito_id`, `valor`, `historico`, `centro_resultado_id`, `centro_custo_id`, `status` (`PENDENTE/VALIDADA/IGNORADA/EXPORTADA/ERRO`), `lote_integracao_id`.
4. `lotes_integracao_contabil` — especializa `lotes_integracao` adicionando `tipo_movimento` (`CONTABIL/FISCAL/FOLHA/FINANCEIRO`), `arquivo_url`, `quantidade_eventos`, `valor_total`, `erro`, `data_envio`, `data_retorno`.
5. `ordens_servico` (estrutura mínima) — `cliente_id`, `contrato_id`, `obra_id`, `natureza_id`, `centro_resultado_id`, `centro_custo_id`, `competencia`, `valor_bruto`, `status`, campos universais de integração.
6. `titulos_rateio` — rateio multi-CR/multi-CC por título (`titulo_id`, `centro_resultado_id`, `centro_custo_id`, `percentual`, `valor`).

### Enriquecer (não recriar)
- `naturezas_financeiras` += `cfop`, `cst`, `codigo_servico_lc116`, `conta_debito_id`, `conta_credito_id`.
- `plano_contas` += `aceita_lancamento`, `codigo_reduzido`, `codigo_externo_dominio`, `codigo_externo_alterdata`, `codigo_externo_sankhya`, `codigo_externo_totvs`.
- `contas_financeiras` += `conta_contabil_id` (FK plano_contas), `codigo_externo`, `sistema_destino`.
- `obras` / `projetos` += `centro_resultado_id`, `centro_custo_id`, `codigo_externo`, `sistema_destino`, `status_integracao`.

## 6. Mapeamento de Eventos Mínimo

Eventos que precisam de regra em `mapeamentos_contabeis` desde já:

| evento_tipo | módulo | D mapeável | C mapeável |
|---|---|---|---|
| `VENDA` | Comercial | Cliente (1.x.x) | Receita Operacional (3.x.x) |
| `RECEBIMENTO` | Financeiro | Banco (1.x.x) | Cliente (1.x.x) |
| `BAIXA_RECEBIMENTO` | Financeiro | Banco | Cliente |
| `ESTORNO_RECEBIMENTO` | Financeiro | Cliente | Banco |
| `COMPRA_ESTOQUE` | Compras | Estoque (1.x.x) | Fornecedor (2.x.x) |
| `COMPRA_CONSUMO` | Compras | Despesa Operacional (4.x.x) | Fornecedor |
| `COMPRA_IMOBILIZADO` | Compras | Imobilizado/Ferramentas (1.x.x) | Fornecedor |
| `PAGAMENTO` | Financeiro | Fornecedor | Banco |
| `SAIDA_ESTOQUE_OBRA` | Estoque | CMV/Custo de Obra (4.x.x) | Estoque |
| `SERVICO_OBRA` | Engenharia/OS | Custo de Instalação (4.x.x) | Fornecedor |
| `COMISSAO_PREVISTA` | Comercial | Despesa Comissão (4.x.x) | Comissão a Pagar (2.x.x) |
| `COMISSAO_PAGA` | Financeiro | Comissão a Pagar | Banco |
| `RETENCAO_IRRF` | Financeiro | Cliente/Fornecedor | IRRF a Recolher (2.x.x) |
| `EMPRESTIMO_ENTRADA` | Op. Financeiras | Banco | Empréstimo a Pagar (2.x.x) |
| `EMPRESTIMO_SAIDA` | Op. Financeiras | Empréstimo a Receber (1.x.x) | Banco |
| `APORTE_SOCIO` | Op. Financeiras | Banco | Capital Social (2.4.x) |
| `DEVOLUCAO_CLIENTE` | Comercial | Receita | Cliente |
| `RENEGOCIACAO` | Financeiro | (estorno + novo título) | (estorno + novo título) |
| `RESCISAO` | Comercial | (espelho da venda) | Cliente |
| `ENTRADA_ESTOQUE` | Estoque | Estoque | Fornecedor / Ajuste |
| `AJUSTE_ESTOQUE_POSITIVO` | Estoque | Estoque | Receita não operacional |
| `AJUSTE_ESTOQUE_NEGATIVO` | Estoque | Perda/Quebra (4.x.x) | Estoque |

## 7. Permissões Novas

```
contabil.mapeamento.visualizar
contabil.mapeamento.editar
contabil.partida_virtual.visualizar
contabil.partida_virtual.ignorar
contabil.lote.gerar
contabil.lote.exportar
contabil.lote.cancelar
contabil.relatorio.preparatorio
centro_custo.visualizar
centro_custo.editar
centro_resultado.editar
natureza.editar_contabil
plano_contas.editar
ordem_servico.visualizar
ordem_servico.criar
ordem_servico.executar
ordem_servico.encerrar
```

Hooks oficiais: `useGovernanceAction` + `GovernedActionButton` (D14.4) cobrem motivo/criticidade/workflow para todas essas ações.

## 8. Auditoria

Toda alteração de classificação contábil-ready (natureza, CR, CC, mapeamento, conta financeira) deve registrar em `audit.audit_log` (já existe forward-only — D15 Ondas 4/5/6): `usuario, data_hora, tabela, registro_id, campo, valor_anterior, valor_novo, motivo, modulo`.

Eventos críticos extras:
- `mapeamentos_contabeis` insert/update/delete → audit + workflow obrigatório se sistema_destino estiver setado.
- `partidas_contabeis_virtuais` mudanças de status → log append-only.
- `lotes_integracao_contabil` gerar/exportar/cancelar → workflow + motivo.

## 9. Relatórios Preparatórios (não substituem contabilidade oficial)

- Balancete gerencial preparatório (por CR e CC).
- Razão gerencial preparatório (por conta mapeável).
- Diário gerencial preparatório (partidas virtuais por data).
- Eventos sem mapeamento contábil.
- Eventos com erro de classificação.
- Operações sem CR/CC/natureza/origem/conta mapeável.
- Lotes pendentes/exportados/em erro.

## 10. Plano em Ondas D18

| Onda | Escopo | Esforço | Dependências |
|---|---|---|---|
| **D18.1** | Diagnóstico + canônico + plano (este documento) | **FEITA** | — |
| **D18.2** | Cadastros e centros: criar `centros_custo`, enriquecer `centros_resultado`/`naturezas_financeiras`/`plano_contas`/`contas_financeiras`; adicionar CR/CC em `obras`/`projetos` | M (3–5 d) | D18.1 |
| **D18.3** | Comercial/PV/NF-ready: CR/natureza/competência/valores normalizados/retenção/historico em `contratos`/`propostas`/`pedidos_venda`/`comercial_comissoes`; campos NF (`chave_nfe`, `numero_nf`, `serie_nf`) preparados em `titulos_financeiros` e `boletos` | M | D18.2 |
| **D18.4** | Compras/Estoque: FK real `fornecedor_id` em `ordens_compra`; natureza/CR/CC/competência/categoria contábil em `ordens_compra`/`ordem_compra_itens`/`solicitacoes_material`; `origem_id` em `estoque_movimentos`; categoria contábil em `produtos` | L (5–8 d) | D18.2 |
| **D18.5** | Engenharia/OS: criar `ordens_servico` mínima; ligar obras a CR/CC; preparar campos para serviço terceirizado | L | D18.2, D18.4 |
| **D18.6** | Financeiro/Operações/Comissões: `natureza_id`/`competencia`/`CR`/`CC`/`conta_financeira_id`/`retencao`/`historico_padrao`/`hash_integracao` em `movimentacoes_financeiras`, `parcelas_financeiras`, `titulos_renegociacoes`, `titulos_taxas`, `operacoes_financeiras_parcelas`, `adiantamentos`, `adiantamento_abatimentos`, `boletos` | M | D18.2 |
| **D18.7** | Partidas virtuais e lotes: criar `mapeamentos_contabeis`, `partidas_contabeis_virtuais`, `lotes_integracao_contabil`, `titulos_rateio`; triggers que geram partida virtual ao criar/baixar título, ao mover estoque para obra, ao calcular comissão | L (5–8 d) | D18.2–D18.6 |
| **D18.8** | Relatórios preparatórios: views `v_balancete_preparatorio`, `v_razao_preparatorio`, `v_diario_preparatorio`, `v_eventos_sem_mapeamento`, `v_operacoes_sem_classificacao`, `v_lotes_status`. Painel `/analytics/contabil-ready` | M | D18.7 |
| **D18.9** | Validação final: smoke ponta a ponta — toda operação relevante consegue responder as 14 perguntas do critério de aceite; relatório executivo + score final | S | D18.2–D18.8 |

**Esforço total estimado:** ~35–50 dias de engenharia. Cada onda é submigração isolada, mantém retro-compat e não toca regra de negócio existente.

## 11. Critério de Aceite

O ERP estará contábil-ready quando, para qualquer operação relevante, conseguir responder:
**quem? quando? por quê? qual origem? qual cliente/fornecedor? qual contrato/PV/obra/OS? qual natureza? qual CR? qual CC? qual valor? qual competência? qual conta mapeável? qual status de integração? qual histórico?**

## 12. Restrições Reafirmadas

- ❌ Sem SPED/ECD/ECF/EFD/apuração/escrituração/fechamento contábil oficial/emissão fiscal.
- ❌ Sem conector externo agora.
- ❌ Sem quebra de Comercial/Financeiro/Estoque/Compras/Engenharia/OS/Comissões/Operações Financeiras.
- ✅ Apenas estrutura, padronização, mapeamento e rastreabilidade.
