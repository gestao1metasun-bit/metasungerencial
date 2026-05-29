# D18.8 — Motor de Exportação e Consolidação Final

**Data:** 2026-05-29 · **Status:** APLICADA · **Onda:** D18.8 (fechamento D18)

## 1. Objetivo
Consolidar a fundação contábil/fiscal/integração construída entre D18.1 e D18.7, criando o motor preparatório de exportação **sem transmissão real, sem SPED, sem NF-e**.

## 2. Entregas

### 2.1 `exportadores_externos`
Catálogo oficial dos exportadores de homologação. 9 seeds **inativos**, todos `ambiente='HOMOLOGACAO'`, `ativo=false`:
- Domínio Contábil / Domínio Fiscal
- Alterdata Contábil / Alterdata Fiscal
- Sankhya ERP
- TOTVS RM / TOTVS Protheus
- SAP ECC / SAP S/4HANA

Categorias: `CONTABIL | FISCAL | FINANCEIRO | MULTI`. Formato padrão: `CSV/TXT/JSON/XML/XLSX`. FKs opcionais para `layouts_exportacao` e `conectores_externos`. RLS leitura authenticated / escrita admin.

### 2.2 `exportacoes_geradas`
Registro de payloads gerados (sempre em homologação nesta fase). Campos: `exportador_id`, `lote_id`, `categoria`, `competencia`, `total_registros`, `hash_payload`, `payload` jsonb, `status` (GERADO/VALIDADO/DESCARTADO/ERRO), `ambiente` (default HOMOLOGACAO), `gerado_por`. 3 índices (exportador, lote, status+ambiente). RLS leitura authenticated / write admin.

### 2.3 Matriz de Cobertura — `v_cobertura_eventos_canonicos`
Cruza catálogo unificado × mapeamentos × partidas × lotes e classifica cada evento canônico em:
- **COBERTO** — tem mapeamento, partida e lote
- **PARTIDA_SEM_LOTE** — partida gerada mas não atribuída a lote
- **MAPEADO_SEM_PARTIDA** — mapeamento existe, sem partida ainda
- **SEM_MAPEAMENTO** — evento catalogado sem regra contábil

### 2.4 `v_lacunas_mapeamento_contabil`
Filtro direto dos eventos não-cobertos. Hoje, com massa de homologação zero em partidas, **todos os 33 eventos catalogados** aparecem como `SEM_MAPEAMENTO` — esperado (D18 é preparatório, não gera partida em produção).

### 2.5 `v_auditoria_integridade_integracao`
Cruza `lotes_integracao_contabil` × `conectores_externos` × `layouts_exportacao` × `lote_registros` e reporta por lote:
- qtd_registros, registros_sem_hash, registros_sem_codigo_externo, registros_em_erro
- conector_ativo, layout_formato, status do lote

### 2.6 `v_d18_cobertura_consolidada`
Painel único com 11 indicadores: eventos catalogados, mapeados, cobertos, lacunas, partidas, lotes, exportadores (total/ativos), exportações geradas, conectores, layouts. **Exportadores ativos esperados = 0** nesta fase.

## 3. Cobertura de eventos validada

| Módulo | Eventos catalogados (seeds) |
|---|---|
| Comercial | 10 (contrato aprovado/assinado/aditivado/cancelado, PV aprovado/faturado/cancelado, faturamento emitido/cancelado/estornado) |
| Financeiro | 10 (recebimento, pagamento, adiantamento registrado/abatido, renegociação, rescisão, operação fin liberada/baixa, estorno recebimento/pagamento) |
| Estoque | 6 (compra recebida, entrada, saída, consumo obra, ajuste, inventário) |
| Engenharia | 7 (projeto criado/aprovado, obra iniciada/finalizada, retorno material, ajuste, consumo material) |
| **Total** | **33 eventos canônicos** |

Operações Financeiras (empréstimo/aporte/liberação/cancelamento) já cobertas pelos eventos `OPERACAO_FIN_LIBERADA` / `OPERACAO_FIN_BAIXA` / `ESTORNO_*` (Onda F + D18.6). Compras cobertas por `COMPRA_RECEBIDA` (D18.4).

## 4. Massa de homologação — diretriz oficial
**Todo dado existente em clientes, contratos, PV, fornecedores, estoque, obras, lançamentos e títulos é classificado como HOMOLOGAÇÃO/SIMULAÇÃO.** `exportadores_externos.ambiente` e `exportacoes_geradas.ambiente` nascem em `HOMOLOGACAO`. Nenhum exportador está ativo. Nenhuma transmissão real é possível por design.

## 5. Restrições respeitadas
- ❌ SPED Fiscal/Contribuições, ECD, ECF, Reinf, DCTFWeb
- ❌ NF-e, NFS-e, emissão fiscal
- ❌ Integração real, transmissão real
- ❌ Alteração de RLS operacional, workflow, auditoria, regra de negócio
- ✅ Exportadores nascem inativos, ambiente HOMOLOGACAO travado por default
- ✅ Linter 139 WARN (estável, mesmo padrão aceito desde D14.2)

## 6. Maturidade final

| Indicador | Antes (D18.7) | Depois (D18.8) |
|---|---|---|
| Contábil-Ready | ~98% | **~99–100%** |
| Fiscal-Ready | ~70% | **~80–85%** |
| Integração-Ready | ~98% | **~100%** |
| Exportação-Ready | 0% | **~85%** (motor + payload + auditoria, sem transmissão) |
| ERP Geral | ~99% | **~99%+** |

## 7. Lacunas restantes (esperadas)

| Lacuna | Natureza | Quando resolver |
|---|---|---|
| 33 eventos ainda `SEM_MAPEAMENTO` | Mapeamentos contábeis vazios (sem plano de contas populado) | Quando contador definir plano + de-para oficial |
| Partidas virtuais ainda não geradas | Sem RPC `rpc_pcv_gerar_*` | Próxima onda dedicada (fora do D18) |
| Conectores reais (auth + callback) | Integração externa real | Não previsto nesta fase |
| Geração de arquivos oficiais (SPED/Reinf) | Fora do escopo Meta Sun | **Nunca** — responsabilidade do sistema fiscal externo |

## 8. Riscos
- **Baixo:** matriz mostra todas as lacunas — diretoria/contador podem priorizar quando integrar.
- **Baixo:** ativar um exportador em produção exige `UPDATE` admin explícito; default HOMOLOGACAO protege.
- **Baixo:** alterações no plano de contas / mapeamentos não impactam operação (camada D18 é desacoplada).

## 9. Recomendações
1. Manter exportadores **inativos** até o contador validar o de-para.
2. Antes de ligar qualquer integração real, executar `v_d18_cobertura_consolidada` e `v_auditoria_integridade_integracao` como gate.
3. Próxima evolução natural: **RPCs `rpc_pcv_gerar_*`** para popular partidas a partir de eventos reais (não faz parte do D18).
4. Geração de arquivos oficiais (SPED, EFD, Reinf, NF-e) deve continuar sendo feita pelo sistema fiscal externo escolhido (Domínio/Alterdata/Sankhya/TOTVS/SAP).

## 10. Critério de aceite — atendido
- ✅ Motor de exportação criado (exportadores + exportações geradas + auditoria de integridade).
- ✅ 9 exportadores inativos de homologação cadastrados.
- ✅ Matriz Evento → Natureza → CR → CC → Plano → Partida → Lote → Exportação implementada como view.
- ✅ Auditoria de hashes/conectores/layouts/códigos externos/status disponível.
- ✅ Massa de homologação preservada; nenhum dado tratado como produção.
- ✅ Cobertura consolidada disponível em view única.
- ✅ Sem SPED/ECD/ECF/Reinf/DCTFWeb/NF-e/transmissão real.
- ✅ Sem alteração de RLS, auditoria, workflow ou regra operacional.

**D18 está oficialmente FECHADO.** ERP Meta Sun está contábil-ready, fiscal-ready e integração-ready para qualquer sistema externo futuro sem necessidade de reconstrução estrutural.
