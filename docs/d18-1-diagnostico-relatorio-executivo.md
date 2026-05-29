# D18.1 — Diagnóstico e Mapeamento — Relatório Executivo

**Data:** 2026-05-28 | **Escopo:** ERP Meta Sun completo | **Tipo:** diagnóstico (sem código/migração)

## Resultado em uma linha

ERP Meta Sun hoje está em **~38% de prontidão contábil-ready**. Meta D18 completo: **≥85%**. Gap fechável em **8 ondas estruturais** sem tocar regra de negócio.

## Bloqueadores absolutos (nenhuma integração externa funciona sem eles)

1. **`centros_custo` não existe.** ERP atual tem apenas `centros_resultado`. Domínio/Alterdata/Sankhya/TOTVS exigem as duas dimensões separadas.
2. **`mapeamentos_contabeis` não existe.** Sem de-para natureza→conta débito/crédito por sistema_destino, exportação é impossível.
3. **`partidas_contabeis_virtuais` não existe.** Sem rascunho validável antes de exportar, lote sempre vai com erro para o ERP externo.
4. **`ordens_servico` não existe.** Serviço executado em obra hoje não tem evento rastreável.
5. **`ordens_compra.fornecedor_id` é texto livre.** Sem FK para `fornecedores`, é impossível cruzar CNPJ no destino.
6. **`retencao` + `tipo_retencao` ausentes em 100% das tabelas financeiras.** IRRF/ISS/CSLL/INSS = exigência legal.
7. **`natureza_id` ausente** em `movimentacoes_financeiras`, `ordens_compra`, `estoque_movimentos`, `parcelas_financeiras`, `titulos_renegociacoes`, `boletos`.
8. **`competencia` ausente** em `movimentacoes_financeiras`, `ordens_compra`, `estoque_movimentos` — confunde caixa vs competência.
9. **`hash_integracao` ausente em 14 tabelas** — qualquer reenvio duplica lançamentos no destino.
10. **`conta_financeira_id` inconsistente** — várias tabelas usam `conta_id` sem FK tipada.

## Mapa de cobertura por tabela (resumo)

| Tabela | Cobertura | Veredito |
|---|---|---|
| `titulos_financeiros` | ~70% | Base mais madura, falta PV/projeto/obra/CR/CC/retenção |
| `comercial_comissoes` | ~75% | OK, faltam apenas origem/PV/retenção/hash |
| `adiantamentos` | ~60% | Migrar `natureza` texto → FK |
| `operacoes_financeiras` (F1) | ~55% | Falta CC/conta_financeira_id/lote |
| `boletos` | ~40% | Falta natureza/CR/competência |
| `pedidos_venda`, `contratos`, `propostas`, `obras`, `projetos` | ~30% | Faltam CR/CC/integração |
| `estoque_movimentos` | ~25% | `origem_id` sem par, sem natureza/CR/CC |
| `parcelas_financeiras`, `movimentacoes_financeiras` | ~20% | Crítico — quase nada classificável |
| `titulos_renegociacoes` | ~10% | Crítico |
| `operacoes_financeiras_parcelas` | ~10% | Mínima |
| `ordens_compra` | ~5% | Tabela quase inutilizável para contabilidade |
| `centros_custo`, `mapeamentos_contabeis`, `partidas_contabeis_virtuais`, `ordens_servico` | 0% | Tabelas inexistentes |

## Cadastros já existentes que vamos reutilizar

`naturezas_financeiras`, `centros_resultado`, `contas_financeiras`, `plano_contas`, `grupos_financeiros`, `subgrupos_financeiros`, `lotes_integracao`, `mapeamentos_externos`, `fornecedores`, `clientes`, `produtos`. Nenhum recriado — apenas enriquecidos com colunas opcionais.

## Mapeamento de eventos canônico

22 eventos canônicos definidos (`VENDA`, `RECEBIMENTO`, `BAIXA_RECEBIMENTO`, `ESTORNO_RECEBIMENTO`, `COMPRA_ESTOQUE`, `COMPRA_CONSUMO`, `COMPRA_IMOBILIZADO`, `PAGAMENTO`, `SAIDA_ESTOQUE_OBRA`, `SERVICO_OBRA`, `COMISSAO_PREVISTA`, `COMISSAO_PAGA`, `RETENCAO_IRRF`, `EMPRESTIMO_ENTRADA`, `EMPRESTIMO_SAIDA`, `APORTE_SOCIO`, `DEVOLUCAO_CLIENTE`, `RENEGOCIACAO`, `RESCISAO`, `ENTRADA_ESTOQUE`, `AJUSTE_ESTOQUE_POSITIVO`, `AJUSTE_ESTOQUE_NEGATIVO`). Cada um com débito/crédito mapeável — ver §6 do canônico.

## Permissões novas a criar (D18.2+)

17 permissões `contabil.*` + `centro_custo.*` + `ordem_servico.*` — ver §7 do canônico.

## Auditoria

Tudo apoia em `audit.audit_log` forward-only (já entregue em D15 Ondas 4/5/6). Mapeamentos, partidas e lotes ganham logs próprios + workflow obrigatório quando `sistema_destino` está setado.

## Relatórios preparatórios previstos (D18.8)

`v_balancete_preparatorio`, `v_razao_preparatorio`, `v_diario_preparatorio`, `v_eventos_sem_mapeamento`, `v_operacoes_sem_classificacao`, `v_lotes_status` + painel `/analytics/contabil-ready`.

## Plano de Ondas (esforço total ~35–50 dias eng)

| Onda | Foco | Esforço | Bloqueia |
|---|---|---|---|
| **D18.1** | Diagnóstico (este) | feito | — |
| **D18.2** | `centros_custo` + enriquecer cadastros + CR/CC em obras/projetos | M | base de tudo |
| **D18.3** | Comercial/PV/NF-ready | M | D18.7 |
| **D18.4** | Compras/Estoque (FK fornecedor, natureza, CR/CC, categoria contábil) | L | D18.7 |
| **D18.5** | Engenharia + módulo OS mínimo | L | D18.7 |
| **D18.6** | Financeiro/Operações/Comissões (campos universais) | M | D18.7 |
| **D18.7** | `mapeamentos_contabeis` + `partidas_contabeis_virtuais` + `lotes_integracao_contabil` + triggers automáticos | L | D18.8 |
| **D18.8** | Views preparatórias + painel `/analytics/contabil-ready` | M | D18.9 |
| **D18.9** | Smoke ponta a ponta + score final | S | — |

## Restrições reafirmadas (NÃO mudaram)

- ❌ Sem SPED/ECD/ECF/EFD/apuração/escrituração/fechamento contábil oficial/emissão fiscal.
- ❌ Sem conector externo agora.
- ❌ Sem quebra de Comercial/Financeiro/Estoque/Compras/Engenharia/OS/Comissões/Operações Financeiras.
- ✅ Apenas estrutura, padronização, mapeamento e rastreabilidade.

## Próximo passo

Aval para iniciar **D18.2 — Cadastros e Centros** (1 migração: criar `centros_custo`, enriquecer `centros_resultado`/`naturezas_financeiras`/`plano_contas`/`contas_financeiras`, adicionar CR/CC em `obras`/`projetos`, criar 5 permissões iniciais). É a fundação obrigatória de todas as ondas seguintes.

## Critério de aceite D18.1

✅ Diagnóstico por tabela entregue
✅ Lacunas críticas listadas e priorizadas
✅ Proposta de tabelas/colunas necessárias documentada
✅ Mapeamento de 22 eventos canônicos
✅ Permissões e modelo de auditoria definidos
✅ Documento canônico publicado (`docs/d18-contabil-ready-canonico.md`)
✅ Plano em 9 ondas com esforço estimado
✅ Zero linha de código de produção alterada
