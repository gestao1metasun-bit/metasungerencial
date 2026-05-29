# D18.2 — Cadastros, Centros e Estrutura Contábil-Ready
**Data:** 2026-05-29 · **Status:** APLICADA · **Onda:** D18.2

## 1. Objetivo
Criar a fundação universal de classificação, rastreabilidade e integrabilidade contábil-ready, sem implementar fiscal/contábil interno (sem SPED/ECD/ECF/EFD/apuração/escrituração/emissão).

## 2. Entregas

### 2.1 Tabelas novas
| Tabela | Função | RLS |
|---|---|---|
| `centros_custo` | "Onde o dinheiro foi gasto?" (OBRA, EQUIPE, VENDEDOR, VEÍCULO, ALMOXARIFADO, ADM, GERAL) | select auth / write admin |
| `mapeamentos_contabeis` | Natureza × evento canônico → conta canônica (de-para p/ integração) | select auth / write admin |

Ambas com: `row_version`, audit trigger, `tg_set_updated_at_generic`, soft-delete onde aplicável, 5 campos de integrabilidade (`codigo_externo`, `sistema_destino`, `status_integracao`, `data_integracao`, `hash_integracao`) e CHECK de `status_integracao` ∈ `PENDENTE|ENVIADO|CONFIRMADO|ERRO|IGNORADO`.

### 2.2 Tabelas ampliadas
- **centros_resultado** — +`area_default`, `observacoes`, 5 campos de integrabilidade. **Seeds (idempotente):** `COMERCIAL`, `FINANCEIRO`, `ENGENHARIA`, `ESTOQUE`, `COMPRAS`, `ADMINISTRATIVO`, `MARKETING`, `DIRETORIA`, `FINANCIAMENTOS`, `POS_VENDA`.
- **plano_contas** — +`categoria`, `retencao_padrao_pct`, 5 campos integrabilidade. **Seeds canônicos** (nível 1 + 24 contas filhas) cobrindo `ATIVO/PASSIVO/PATRIMONIO/RECEITAS/CUSTOS/DESPESAS`.
- **naturezas_financeiras** — +`plano_conta_id` (FK), `categoria_canonica`, 6 percentuais de retenção (ISS/INSS/IRRF/PIS/COFINS/CSLL default 0), 5 campos integrabilidade.
- **contratos** — +`natureza_receita_id`, `centro_resultado_id`, `centro_custo_id`.
- **pedidos_venda** — +`natureza_receita_id`, `centro_resultado_id`, `centro_custo_id`, `competencia`, `status_faturamento` (PENDENTE/FATURADO/CANCELADO/NAO_APLICAVEL).
- **projetos** — +`centro_custo_id`.
- **obras** — +`centro_resultado_id`, `centro_custo_id`.
- **estoque_movimentos** — +`centro_resultado_id`, `centro_custo_id`, `categoria_contabil` (REVENDA/MATERIAL_INSTALACAO/CONSUMO/FERRAMENTA/IMOBILIZADO/SERVICO).
- **produtos** — +`categoria_contabil` (mesmo enum).
- **operacoes_financeiras** — +`centro_custo_id`, `competencia`.
- **titulos_financeiros** — +`centro_custo_id` + 6 valores de retenção (ISS/INSS/IRRF/PIS/COFINS/CSLL default 0).

### 2.3 Compras
Tabela `compras` não existe no schema atual (verificado). Pulada — será reavaliada em D18.4 quando o módulo for materializado.

## 3. Diretrizes respeitadas
- ✅ Sem implementação fiscal/contábil interna.
- ✅ Sem alteração de RLS operacional, workflow ou regras de negócio.
- ✅ Massa atual = homologação (sem obrigatoriedade retroativa).
- ✅ Padrão de integrabilidade idêntico em todas as 5 tabelas-chave.
- ✅ Naturezas Financeiras continuam sendo o cadastro principal — Plano de Contas é camada técnica ligada por FK opcional.

## 4. Impacto técnico
- **Linter:** 122 → 137 WARN. Todos do padrão D14.2 (SELECT `USING (true)` em cadastros consultivos + SECURITY DEFINER já mapeados). Zero ERROR.
- **Auditoria:** todas as escritas nas novas tabelas já registradas em `audit_log` via `tg_audit_row('financeiro', ...)`.
- **Performance:** 22 índices novos (cr/cc/natureza/competência/categoria) cobrem os filtros que virão em D18.3+.
- **Integridade:** todos os FKs novos usam `ON DELETE SET NULL` para não bloquear soft-delete dos cadastros base.

## 5. Maturidade
- Contábil-Ready: **~38% → ~52-55%** (meta D18.2: 55-60% — atingida pela faixa inferior; D18.3 fechará o intervalo).
- Operacional: 98% (inalterado).
- Fundação Técnica: 99% (inalterado).

## 6. Próximos passos
| Onda | Foco |
|---|---|
| D18.3 | Comercial NF-Ready (preparar suporte futuro NF-e/NFS-e — campos, sem emissão) |
| D18.4 | Compras Contábil-Ready (depende de materialização do módulo) |
| D18.5 | Estoque Contábil-Ready (uso obrigatório de categoria_contabil em novos lançamentos) |
| D18.6 | Engenharia Contábil-Ready (cr/cc obrigatório em obras novas) |
| D18.7 | Partidas Contábeis Virtuais (`partidas_contabeis_virtuais` + lotes) |
| D18.8 | Integrações (Domínio/Alterdata/Sankhya/TOTVS/SAP — de-para via mapeamentos) |
| D18.9 | Consolidação final + validação ≥85% |

## 7. Critério de aceite — atendido
- ✅ Centros de Resultado canônicos cadastrados.
- ✅ Centros de Custo criados como cadastro oficial.
- ✅ Plano de Contas Canônico estrutura mínima (6 raízes + 24 filhas).
- ✅ Mapeamentos Contábeis (13 eventos canônicos suportados).
- ✅ Contratos, PV, Projetos, Obras, Estoque e Operações Financeiras com colunas cr/cc/natureza/competência/categoria prontas.
- ✅ Campos de retenção e integrabilidade plantados (zerados).
- ✅ ERP pronto para D18.3 sem reconstrução estrutural.
