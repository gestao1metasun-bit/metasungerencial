# Módulo Comercial Meta Sun — Spec Oficial Congelada

**Status:** CONGELADA (referência canônica). Não alterar sem nova diretriz oficial do Renan.
**Data:** 2026-05-28
**Origem:** Diretriz operacional do usuário (mensagem oficial).
**Escopo:** Comercial ponta a ponta (Lead → Contrato Assinado → Operacional).

---

## 1. Fluxo oficial

```
Lead → Orçamento → Em Análise → Negociação → Aprovada → Contrato → Assinado → Operacional
```

Cada transição é evento auditável + entrada em `audit_log` + entrada em histórico comercial.

## 2. Regras de pedra (não negociáveis)

| # | Regra | Implementação alvo |
|---|-------|--------------------|
| R1 | CPF/CNPJ único por cliente, sem duplicidade | UNIQUE já existe (`uq_clientes_doc_norm`). Garantir erro amigável + bloqueio UI. |
| R2 | Carteira pertence ao 1º vendedor que cadastrou | `clientes.consultor_id` imutável exceto via RPC `rpc_transferir_carteira`. |
| R3 | Transferência só via RPC oficial (individual ou lote) | Nova RPC + log `carteira_transferencias`. |
| R4 | Vendedor NÃO edita proposta/valor/equipamento | Permissão `comercial.proposta.editar` exclusiva ao Orçamentista. |
| R5 | Proposta emitida é imutável; mudança = nova revisão | Trigger bloqueia UPDATE em campos comerciais após `status != RASCUNHO`. |
| R6 | Parâmetro mínimo R$/kWp configurável | `parametros_gerenciais` chave `comercial.parametro_minimo_rs_kwp` (default 2000). |
| R7 | Abaixo do mínimo → workflow alçada diretoria | Reaproveitar `workflow_aprovacoes` (motor D5.1). |
| R8 | Validade padrão 45 dias → status `PROPOSTA_VENCIDA` automático | Job/trigger diário OU view derivada por `validade < now()`. |
| R9 | Motivo de Perda obrigatório ao status `PERDIDA` | CHECK + RPC `rpc_proposta_marcar_perdida(motivo)`. |
| R10 | Motivo de Ganho obrigatório ao fechar venda | RPC `rpc_proposta_aprovar(motivo_ganho)`. |
| R11 | Contrato assinado → dispara Engenharia + Financeiro em paralelo | Trigger AFTER UPDATE em `contratos.status='Assinado'`. |
| R12 | Reabertura de contrato exige desmontagem completa | RPC `rpc_contrato_reabrir` valida + estorna em cascata (financeiro, estoque, engenharia, OS, formulários, assinaturas). |
| R13 | Cancelamento exige motivo + alçada financeiro | RPC `rpc_contrato_cancelar(motivo)`. |
| R14 | Comissão nasce na assinatura quando financeiro for gerado | Trigger gera `comissoes` pendentes. |
| R15 | Histórico append-only para toda ação | `audit_log` (já existe) + `comercial_historico` (timeline humana). |
| R16 | Permissão é individual, não por setor | Catálogo `app_permission` ampliado. |
| R17 | Pipeline configurável sem código | Tabela `comercial_pipeline_etapas`. |
| R18 | Visita técnica opcional, com 3 estados | Campos em `propostas` ou tabela `visitas_tecnicas`. |
| R19 | Origem do lead configurável | Tabela `lead_origens` (seed inicial). |
| R20 | Assinatura por permissão, não por setor | Permissão `comercial.contrato.assinar` (default Financeiro). |

## 3. Tabelas a criar/ampliar (alto nível, sem DDL)

**Novas:**
- `comercial_pipeline_etapas` — etapas configuráveis com ordem.
- `lead_origens` — origens configuráveis.
- `carteira_transferencias` — log de transferências (origem, destino, usuário, motivo, lote_id).
- `proposta_revisoes` — versões imutáveis (ou usar `versao` + lock).
- `visitas_tecnicas` — opcional, com 3 estados.
- `motivos_perda` / `motivos_ganho` — catálogos configuráveis.
- `comercial_historico` — timeline humana (deriva de audit_log + eventos comerciais).
- `comissoes` (se ainda não houver dedicada) — nasce na assinatura + financeiro gerado.

**Ampliar:**
- `propostas`: lock por trigger, `motivo_perda`, `motivo_ganho`, `data_aprovacao_diretoria`.
- `contratos`: `assinado_por_permissao`, `cancelado_em`, `cancelado_motivo`, `reabertura_id`.
- `parametros_gerenciais`: chave `comercial.parametro_minimo_rs_kwp`.

## 4. RPCs oficiais (alto nível)

| RPC | Função |
|-----|--------|
| `rpc_transferir_carteira(cliente_ids[], destino, motivo)` | Transfere 1..N clientes com log. |
| `rpc_proposta_emitir(id)` | RASCUNHO → EM_ANALISE; congela edição. |
| `rpc_proposta_revisar(id_origem)` | Cria nova revisão (proposta 002, 003...). |
| `rpc_proposta_aprovar(id, motivo_ganho)` | EM_ANALISE → APROVADA; valida alçada. |
| `rpc_proposta_marcar_perdida(id, motivo)` | → PERDIDA; motivo obrigatório. |
| `rpc_contrato_gerar(proposta_id)` | APROVADA → gera contrato vinculado. |
| `rpc_contrato_assinar(id)` | Verifica permissão; dispara Eng + Fin paralelo. |
| `rpc_contrato_cancelar(id, motivo)` | Cancela com motivo + alçada. |
| `rpc_contrato_reabrir(id, motivo)` | Desmonta em cascata; só se possível. |

Todas: SECURITY DEFINER + EXECUTE só authenticated + audit + row_version check.

## 5. Permissões novas (catálogo `app_permission`)

```
comercial.lead.criar
comercial.lead.editar
comercial.lead.transferir_carteira
comercial.proposta.criar           (Orçamentista)
comercial.proposta.editar          (Orçamentista)
comercial.proposta.revisar
comercial.proposta.aprovar
comercial.proposta.aprovar_excecao (Diretoria — abaixo do mínimo)
comercial.contrato.gerar
comercial.contrato.assinar         (Financeiro por padrão)
comercial.contrato.cancelar
comercial.contrato.reabrir
comercial.pipeline.configurar
comercial.parametro.configurar
```

## 6. Integrações automáticas

| Evento | Consequência |
|--------|--------------|
| Contrato assinado | Cria projeto na Engenharia + Pedido de Venda + títulos AR no Financeiro (paralelo, não sequencial). |
| PV gerado | Estoque analisa reservas. |
| Financeiro baixado parcialmente | Comissão proporcional libera. |
| Contrato reaberto | Desmonta cascata (regra crítica — exige RPC dedicada). |

## 7. Aderência com arquitetura vigente

- ✅ Single source of truth: `v_lancamentos_derivados` cobre financeiro do contrato.
- ✅ Workflow alçada: motor D5.1 cobre aprovação fora-do-parâmetro.
- ✅ Auditoria: `audit_log` cobre todas as tabelas via trigger.
- ✅ Concorrência: `row_version` em propostas/contratos (Onda 6).
- ✅ Anexos: 26 entidades habilitadas — incluir propostas/contratos/visitas.
- ⚠️ Comissões: precisa entidade própria.
- ⚠️ Reabertura em cascata: lógica nova mais complexa do ERP — exige análise dedicada.

## 8. Fora de escopo (não fiscal/contábil)

Conforme charter D15: comissões geram títulos financeiros, mas escrituração fiscal/contábil fica para sistema externo (campos de integrabilidade já existem).

---

## Plano de execução proposto (ondas)

| Onda | Conteúdo | Risco | Dependências |
|------|----------|-------|--------------|
| **C1** | Catálogos configuráveis (pipeline, origens, motivos) + permissões novas | Baixo | Nenhuma |
| **C2** | Lock de proposta + RPCs de revisão + validade automática | Médio | C1 |
| **C3** | Workflow alçada parâmetro mínimo (reusa D5.1) | Médio | C2 |
| **C4** | Transferência de carteira (individual + lote) | Médio | C1 |
| **C5** | Assinatura por permissão + disparo paralelo Eng/Fin | Alto | C2, integração com PV existente |
| **C6** | Comissões (entidade + geração automática) | Alto | C5 |
| **C7** | Cancelamento de contrato com alçada | Médio | C5 |
| **C8** | **Reabertura em cascata** (mais complexo) | Crítico | C5, C6, C7 |
| **C9** | Visita técnica + documentos centralizados + histórico humano | Baixo | C1 |
| **C10** | UI Enterprise consolidada (Pipeline visual, Kanban, telas) | Médio | C1..C9 |

Ordem obrigatória: **C1 → C2 → C3/C4 paralelo → C5 → C6 → C7 → C8 → C9 → C10**.

Tempo estimado: 4-6 ondas para Comercial ficar 90% operacional. C8 (reabertura) é a mais delicada — pode virar onda solo.
