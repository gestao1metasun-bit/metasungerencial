# Reestruturação Enterprise — Módulo Comercial

Especificação massiva (≈700 linhas de regras). Para entregar com segurança, sem quebrar o que já existe e respeitando o charter D15 e a memória do projeto, divido em **8 ondas sequenciais** com escopo fechado por onda. Nenhuma onda inventa funcionalidade — todas refletem regras do comando.

## Princípios obrigatórios (aplicados em todas as ondas)

- Reaproveitar componentes existentes (`PropostasPage`, `PropostaList`, `LeadModal`, `ContratosPage`, `ContratoAssinadoTab`, `propostas_audit` futuro, `comercial_*` tabelas já existentes, `EnterpriseRecordToolbar`, `EnterpriseDataGrid`, `ModuloHistoricoDrawer`, `workflow_aprovacoes`, `governance_matrix`).
- Zero exclusão física, zero edição livre, zero botão sem ação real, zero fluxo paralelo.
- Toda mutação relevante via RPC `SECURITY DEFINER` + flag de sessão + auditoria append-only + timeline.
- Permissão é do **usuário** (enum `app_permission` + `has_role/has_permission`), nunca do setor.
- Histórico sempre recolhido, cinza, somente leitura.
- Charter D15 respeitado: sem nova store LS operacional; LS só para preferências `ui.*`.
- Padrão D17.UI Enterprise RM + vocabulário canônico D17.UI.4d em toda tela tocada.

---

## Onda C-ENT.1 — Fundação: Oportunidade como objeto e Workspace 360º do Cliente

**Banco (1 migração):**
- Nova tabela `oportunidades` (cliente_id, nome, consultor_id, pipeline_etapa_id, valor_estimado, ultimo_contato, proxima_acao, status, row_version, audit, soft-delete, integrabilidade D18).
- FK `propostas.oportunidade_id` (nullable na transição, NOT NULL após backfill em C-ENT.8).
- FK `leads.oportunidade_id` (nullable — leads viram oportunidades automaticamente ao gerar 1ª proposta).
- RLS por permissão `comercial.oportunidade.*` (visualizar/criar/editar/cancelar — 4 novas no enum).
- Trigger anti-edição livre + row_version bump.
- Backfill: 1 oportunidade por proposta existente (preserva dados).

**UI:**
- Nova rota `/comercial/clientes/$clienteId` — **Workspace 360º** com header (nome/doc/telefone/consultor/última mov./status/tags/favorito) + 11 abas (Resumo / Oportunidades / Propostas / Contratos / Projetos / Financeiro / Documentos / Timeline / Comentários / Favoritos / Histórico).
- Aba default: **Timeline Inteligente** (lê `v_auditoria_unificada` filtrada por cliente).
- Aba Oportunidades: lista com `EnterpriseDataGrid` + ações canônicas (Nova / Visualizar / Cancelar).
- Detecção de duplicidade: ao criar cliente/oportunidade/proposta, RPC `rpc_cliente_buscar_similar` (CPF/CNPJ/tel/email/nome ILIKE) → modal "Possível cliente já cadastrado" com [Abrir existente / Criar mesmo assim (audit) / Cancelar].

---

## Onda C-ENT.2 — Proposta como fotografia comercial (governança forte)

**Banco:**
- Tabela `propostas_audit` (Onda P3 que tinha ficado pendente): proposta_id, lead_id, oportunidade_id, usuario_id/email, acao, status_anterior/novo, campo, valor_anterior/novo, motivo, ip, user_agent, payload, created_at. RLS read-only authenticated, INSERT só via RPC, sem UPDATE/DELETE (triggers anti).
- Trigger `tg_propostas_bloqueia_edicao_comercial`: bloqueia UPDATE em campos comerciais/técnicos (valor, potencia, modulos, inversor, equipamentos, consumo, forma_pagamento, comissao, desconto, escopo, prazo) — só permite via flag `app.via_proposta_correcao_cadastral` (apenas nome/doc/tel/email/endereço/observação) ou `app.via_proposta_nova_versao` (cópia para nova proposta).
- RPC `rpc_proposta_corrigir_cadastrais(id, motivo≥5, campos_jsonb)`.
- RPC `rpc_proposta_gerar_nova_versao(proposta_origem_id, novos_dados_jsonb, motivo)` — herda dados, vincula bidirecional (`substituida_por_id` ↔ `gerada_de_id`), origem vira SUBSTITUIDA, nova nasce ATIVA, registra timeline+audit.
- Coluna `propostas.gerada_de_id` e `substituida_por_id` (já existe `versao_pai_id` parcial — ampliar).

**UI:**
- `CorrigirCadastraisDialog` — só campos cadastrais + motivo obrigatório.
- `GerarNovaPropostaSheet` — painel lateral (não modal) mostra proposta origem read-only + form editável só dos campos comerciais/técnicos da nova.
- Mensagem padronizada ao tentar editar campo comercial: "Este campo compõe a proposta comercial/técnica e não pode ser editado diretamente. Para alterar, gere uma nova proposta dentro da mesma oportunidade."
- Toolbar contextual da proposta: limpa para mostrar **apenas** ações possíveis pelo status atual (Corrigir Dados Cadastrais / Gerar Nova Proposta / Solicitar Aprovação / Aprovar / Cancelar / Gerar Contrato / Documentos / Comentários / Histórico). Remove Editar Valor / Duplicar / Excluir / Enviar Engenharia / Enviar Financeiro / Gerar Aditivo.
- `ModuloHistoricoDrawer` da proposta: lê `propostas_audit` com diff visual verde/rosa.

---

## Onda C-ENT.3 — Contrato consolidador + Projetos do contrato + Limites

**Banco:**
- Tabela `contrato_propostas` (N:N: contrato_id ← propostas_id), valida mesmo cliente + propostas não contratadas antes.
- Reusa `projetos_contrato` existente; adiciona `endereco_origem` enum (CONTRATO/CLIENTE/PROPRIO) + endereço próprio opcional.
- View `v_contrato_limites` (valor_global, valor_utilizado, valor_saldo, potencia_global/utilizada/saldo, modulos_global/utilizado/saldo) — security_invoker.
- Trigger `tg_projeto_valida_limites_contrato`: bloqueia INSERT/UPDATE de projeto que ultrapasse limites vigentes (mensagem oficial pedindo aditivo).
- RPC `rpc_contrato_gerar_de_propostas(proposta_ids[], dados_globais)` — valida cliente único, marca propostas CONTRATADA, cria projetos a partir das propostas, registra timeline em todos os objetos.

**UI:**
- `GerarContratoDialog` multi-seleção de propostas ATIVAs do cliente.
- Aba Projetos no contrato com `ConfirmarEnderecoInstalacaoDialog` (3 opções).
- Card `LimitesContratoCard` no header do contrato com 3 barras (valor/potência/módulos).

---

## Onda C-ENT.4 — Aditivos como objeto (projeto ou contrato)

**Banco:**
- Amplia tabela `aditivos` existente com `escopo_aditivo` enum (PROJETO/CONTRATO_GERAL), `projeto_id` nullable, `versao_aplicada_em`, `versao_origem_snapshot jsonb`.
- RPC `rpc_aditivo_aprovar_e_aplicar(aditivo_id, motivo)`: aplica imediatamente — atualiza versão vigente do projeto (ou contrato), recalcula limites, gera financeiro complementar via `rpc_lancamento_criar` (origem_tipo='ADITIVO'), NÃO move projeto de setor, registra timeline em projeto+contrato+cliente+engenharia.
- Trigger anti-recálculo de parcelas antigas.

**UI:**
- `NovoAditivoDialog` pergunta primeiro o escopo (Projeto específico / Contrato inteiro).
- `AditivoAplicadoCard` mostra antes/depois das versões vigentes.

---

## Onda C-ENT.5 — Comissão como objeto (múltiplos beneficiários)

**Banco:**
- Amplia `comercial_comissoes` para suportar N comissões por contrato/projeto/aditivo (já tem base D15.1.C6).
- Tipos beneficiário enum: CONSULTOR/INDICADOR/GERENTE/PARCEIRO/BANCO.
- Status: PREVISTA/APROVADA/LIBERADA/PAGA/CANCELADA/SUBSTITUIDA (alinha ao existente).
- RPC `rpc_comissao_substituir(id_origem, nova_jsonb, motivo)` — cria nova, marca origem SUBSTITUIDA, vincula bidirecional, audit.
- RPC `rpc_comissao_dividir(id, beneficiarios[])` — quebra em N comissões filhas.
- Trigger anti-UPDATE direto (já existe parcial — endurecer).

**UI:**
- `ComissoesPanel` no contrato/projeto/aditivo: lista de objetos comissão com ações canônicas. Sem campo "comissão" direto na proposta/contrato/aditivo — vira referência somatória somente leitura.

---

## Onda C-ENT.6 — Carteira: Alterar Consultor vs Transferir Carteira

**Banco:**
- Já existe `comercial_carteira_transferencias` (D15.1.C3/C4). Acrescenta enum `tipo_operacao` ALTERAR_CONSULTOR (cadastral) / TRANSFERIR_CARTEIRA (operacional).
- RPC `rpc_carteira_transferir` (lote) atualiza consultor responsável do cliente + oportunidades abertas + tarefas/agenda futura. NÃO altera propostas/contratos/comissões históricos.

**UI:**
- 2 ações distintas na aba Carteira do cliente com labels canônicos e motivo obrigatório.

---

## Onda C-ENT.7 — Permissões, Política Comercial, Workflow, Central de Ações

**Banco:**
- Novas permissões granulares no enum `app_permission`: `comercial.oportunidade.*` (4), `comercial.proposta.corrigir_cadastrais`, `comercial.proposta.gerar_nova_versao`, `comercial.contrato.gerar_de_propostas`, `comercial.aditivo.aplicar`, `comercial.comissao.substituir`, `comercial.comissao.dividir`, `comercial.carteira.alterar_consultor` (separada de transferir).
- Política comercial: nova alçada D5.1 `proposta_excecao_politica_comercial` (preço/kWp, desconto, prazo) — reutiliza `workflow_aprovacoes`.

**UI:**
- Componente universal `GovernedActionButton` (já existe D14.4) aplicado em **todos** os botões do Comercial — bloqueia/cinza com tooltip da permissão necessária.
- **Central de Ações** na Home do usuário: card "Minhas Tarefas / Aprovações Pendentes / Propostas Vencendo / Contratos Aguardando Assinatura / Follow-ups / Pendências / Favoritos / Notificações" lendo `v_aprovacoes_unificadas` (D22) + `notificacoes` (D23) + queries dedicadas.
- Dashboard Comercial (`/comercial/dashboard`): 14 KPIs do comando (oportunidades abertas, propostas ativas/canceladas, contratos gerados, valor contratado/em negociação, pipeline por etapa, conversão, ticket médio, comissão prevista, meta consultor, ranking, dias sem movimentação, pendências).

---

## Onda C-ENT.8 — Configurações + Limpeza UX + Backfill final + Relatório

**Banco:**
- Reusa `comercial_pipeline_etapas` (D15.1.C1) e amplia para: cor, SLA, probabilidade, ações_permitidas jsonb, permissoes_necessarias jsonb, checklist_obrigatorio jsonb, automacoes jsonb, notificacoes jsonb — tudo parametrizável.
- Templates de proposta e contrato (tabelas `comercial_templates_proposta` / `_contrato`).
- Backfill final: `propostas.oportunidade_id` NOT NULL.

**UI:**
- Rota `/comercial/configuracoes` (admin) com 13 abas (Pipeline / Status / Workflows / Permissões / Alçadas / Motivos cancelamento / Templates proposta / Templates contrato / Política comercial / Comissões / Metas / Dashboards / Notificações / Automações).
- Remoção definitiva de botões fora de contexto em toda tela Comercial (sweep final).
- Relatório oficial em `docs/c-ent-relatorio-final.md`: arquivos alterados, componentes criados/removidos, rotas, tabelas, regras, fluxos, pendências, riscos, sugestões.

---

## Detalhes técnicos transversais

- **Stack:** TanStack Start + Supabase + React Query. Server fns onde necessário, RPCs `SECURITY DEFINER` para toda mutação relevante.
- **Auditoria:** toda RPC nova grava em `audit_log` + tabela específica (`propostas_audit`, `comercial_assinatura_eventos`, etc.) + emite evento canônico para `v_auditoria_unificada` (D24).
- **Notificações:** triggers conectam a `notificacoes` (D23) onde aplicável (aprovações, vencimento, exceções de política).
- **Linter:** novas RPCs `search_path=public`, REVOKE anon, GRANT authenticated (padrão D14.2 — esperado +10..15 WARN por onda).
- **D18 contábil-ready:** toda tabela nova nasce com `cr/cc/natureza_id/competencia/categoria_contabil/integrabilidade`.
- **Sem mock, sem fallback silencioso.** Erro = toast canônico + `error_log`.

---

## Ordem e dependências

C-ENT.1 → C-ENT.2 → C-ENT.3 → C-ENT.4 → C-ENT.5 (paralelizável com C-ENT.6) → C-ENT.7 → C-ENT.8.

Cada onda termina com: migração aprovada, código compilando, smoke test documentado, atualização da memória do projeto.

---

## Riscos conhecidos

1. **Backfill `propostas.oportunidade_id`**: propostas existentes sem oportunidade explícita → 1 oportunidade por proposta legada (preserva). Confirmação solicitada antes de C-ENT.1.
2. **Trigger anti-edição comercial em propostas**: pode quebrar telas legadas que faziam UPDATE direto. Mitigação: scan via `rg` + adaptação ANTES de ligar o trigger.
3. **Limites de contrato retroativos**: contratos antigos podem já estar acima do limite (dados livres). Mitigação: aplicar trigger só em INSERT/UPDATE novos; rodar relatório de divergências para o cliente decidir.

---

## Aprovação necessária

Plano grande. Preciso de **GO** explícito para iniciar pela **Onda C-ENT.1** (Oportunidade + Workspace 360º).

Se preferir começar por outra onda (ex.: C-ENT.2 que já tem base parcial das ondas P1/P2/P3), me diga.
