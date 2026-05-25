## Reestruturação Arquitetural — Fundação Transacional ERP Meta Sun

Esta é uma fase de fundação, não um ajuste pontual. Vou executar em **8 ondas sequenciais**, cada uma gerando entregáveis verificáveis e mantendo o sistema funcional entre ondas. Nenhuma onda é "só visual": cada uma encerra com persistência real, RLS, auditoria e regras transacionais.

---

### Princípios inegociáveis (válidos para todas as ondas)

- **Origem do financeiro**: SOMENTE via `gerar_titulos_do_pv(pv_id)`, idempotente. Nunca direto de contrato/projeto.
- **1 contrato = 1 PV consolidado** por padrão; PVs adicionais só com justificativa registrada (forma de pagamento distinta, faturamento separado, etc.).
- **Projetos são operacionais**; **PV é financeiro/comercial**; **Contrato é o acordo**.
- **Status principal ≠ gates**: campos separados (`status`, `financeiro_status`, `engenharia_status`, `diretoria_status`).
- **Toda mutação crítica**: trigger `tg_audit_row` + `tg_snapshot_version` + soft delete + RLS por consultor/admin.
- **Edição pós-aprovação**: proibida; exige reabertura com motivo (mín. 3 chars), nova versão.
- **Validações no banco** (RPC/trigger), não só no frontend.

---

### Onda 1 — Projetos do Contrato (Prioridade 2 do briefing)

**Tabela `projetos_contrato`** (nova, separada de `projetos` legado para não quebrar engenharia/propostas):
- `id`, `contrato_id` (FK), `cliente_id`, `consultor_id`, `ordem`, `descricao`, `valor`, `endereco` (jsonb: cep/rua/numero/bairro/cidade/uf), `potencia_kwp`, `modulos_qtd`, `inv1`/`inv2`/`inv3`, `telhado_tipo`, `dados` (jsonb), `status` (enum: `RASCUNHO`,`PENDENTE_APROVACAO`,`APROVADO`,`ENVIADO_ENGENHARIA`,`EM_EXECUCAO`,`FINALIZADO`,`CANCELADO`), `obra_id`, `pv_id`, soft-delete, auditoria.

**RPCs**:
- `criar_projetos_do_contrato(contrato_id, projetos[])`
- `aprovar_projeto(projeto_id)` — valida soma ≤ valor_contrato
- `enviar_projeto_para_engenharia(projeto_id)` — cria `obra` vinculada
- `recalcular_saldo_contrato(contrato_id)` — retorna `{total, somado, saldo}`
- `validar_integridade_contrato_projetos(contrato_id)`

**Trigger**: `tg_projetos_contrato_audit`, `tg_snapshot_version`, `tg_valida_soma_projetos` (BEFORE INSERT/UPDATE).

**RLS**: consultor vê seus contratos; admin vê tudo.

**UI**:
- Card de contrato assinado → botões "Cadastrar Projetos" / "Ver Projetos" / "Ver PV" + chips "N projetos pendentes" / "Financeiro gerado".
- Tela `/projetos-contrato/:contratoId`: lista projetos, valor contrato, somado, saldo, ação "Criar projeto residual", aprovação individual, envio Engenharia.
- Repo `projetos-contrato-repo.ts` (mesmo padrão de `leads-repo`/`propostas-repo`).

---

### Onda 2 — Pedido de Venda consolidado (Prioridades 3 e 4)

**Tabelas**:
- `pedidos_venda`: `id`, `contrato_id`, `cliente_id`, `consultor_id`, `numero`, `versao`, `valor_total`, `composicao` (jsonb), `forma_pagamento`, `entrada`, `parcelas` (jsonb), `financiamento` (jsonb), `permuta` (jsonb), `banco`, `previsao_recebimento`, `centro_receita`, `natureza_fin`, `status` (`RASCUNHO`,`EM_APROVACAO`,`APROVADO`,`FINANCEIRO_GERADO`,`EM_EXECUCAO`,`FINALIZADO`,`REPROVADO`,`CANCELADO`), `financeiro_status`, `engenharia_status`, `diretoria_status`, `financeiro_gerado_em`, `financeiro_gerado_por`, `motivo_reabertura`, snapshot, soft-delete, auditoria.
- `pedido_venda_projetos` (N:N): `pv_id`, `projeto_id`, `valor_alocado`.
- `pedido_venda_pagamentos`: parcelas/títulos previstos.
- `pedido_venda_aprovacoes`: `pv_id`, `gate` (financeiro/diretoria/engenharia), `status`, `user_id`, `motivo`, `created_at`.
- `pedido_venda_eventos`: timeline.

**RPCs**:
- `gerar_pv_do_contrato(contrato_id)` — cria PV consolidado idempotente (1 por contrato; PV adicional só com flag `permitir_pv_adicional` + motivo).
- `vincular_projetos_ao_pv(pv_id, projeto_ids[])`
- `aprovar_gate_pv(pv_id, gate, decisao, motivo)`
- `aprovar_pv(pv_id)` — só se todos gates OK
- `gerar_titulos_do_pv(pv_id)` — **idempotente** via `financeiro_gerado_em IS NOT NULL` guard; cria N títulos AR em `fin_titulos` com `tipo_origem='pedido_venda'`, `origem_id=pv.id`, `contrato_id`, `pv_id`, `cliente_id`, natureza, centro_receita, banco, competência, vencimento por parcela.
- `reabrir_pv(pv_id, motivo)` — incrementa versão, snapshot, cancela títulos não-baixados, preserva recebidos.
- `cancelar_pv(pv_id, motivo)`.

**Validações em trigger**:
- PV aprovado não pode ser editado direto.
- Soma `valor_alocado` dos projetos = `valor_total` do PV.
- Títulos com movimentos não estornados não são apagados pela reabertura.

**UI**:
- Tela `/pedidos-venda` (lista) + `/pedidos-venda/:id` (detalhe com timeline, projetos vinculados, composição, parcelas, aprovações, títulos gerados).
- Botão "Gerar PV" no contrato (visível quando ≥1 projeto aprovado).
- Botão "Aprovar PV" e "Gerar financeiro" gated por permissão.

---

### Onda 3 — Financeiro com origem rastreável (Prioridade 4 hardening)

- Migrar `fin_titulos` (hoje localStorage) ao Supabase, com colunas: `tipo_origem`, `origem_id`, `contrato_id`, `pv_id`, `projeto_id` (nullable), `cliente_id`, `natureza_id`, `centro_id`, `conta_id`, `competencia`, `vencimento`, `valor`, `saldo`, `status`, `forma_pagamento`, `banco_id`.
- Trigger: bloqueia `DELETE` se há movimento não estornado; soft delete obrigatório.
- RPC `baixar_titulo(titulo_id, movimento)`, `estornar_movimento(mov_id, motivo)`.
- Adapter `SupabaseFinanceiroAdapter` (já existe esqueleto) — completar implementação contra novo schema.
- Flag `fin.repository.source` para alternar local↔supabase.

---

### Onda 4 — Engenharia integrada (Prioridade 5)

- `obras` ganha `projeto_contrato_id` e `pv_id` (FKs).
- RPC `aprovar_projeto` cria obra automaticamente, status inicial `EM_PROJETO_APROVACAO`.
- Trigger limpa `equipe` quando status sai de `AGUARDANDO_INSTALACAO`/`EXECUTANDO_INSTALACAO`.
- UI engenharia: passa a listar obras por `projeto_contrato_id` (e exibir contrato/projeto/PV).

---

### Onda 5 — Auditoria, versionamento, reabertura (Prioridade 6)

- Aplicar `tg_audit_row` + `tg_snapshot_version` em: `projetos_contrato`, `pedidos_venda`, `pedido_venda_pagamentos`, `obras` (já tem parcial), `fin_titulos`.
- `HistoricoTimeline` já consome `audit_log` — adicionar entidades novas no enum `AuditEntidade`.
- Reabertura: padronizar via RPCs (`reabrir_pv`, `reabrir_projeto` se necessário) com `motivo` obrigatório, registrado em `audit_log.motivo`.

---

### Onda 6 — Permissões + RLS hardening (Prioridade 6)

Adicionar ao enum `app_permission`:
`contrato.criar`, `contrato.editar`, `contrato.assinar`, `contrato.cancelar`, `projeto.criar`, `projeto.aprovar`, `projeto.cancelar`, `pv.criar`, `pv.aprovar.financeiro`, `pv.aprovar.diretoria`, `pv.aprovar.engenharia`, `pv.reabrir`, `pv.cancelar`, `financeiro.gerar`, `financeiro.baixar`, `financeiro.cancelar`, `engenharia.editar`, `engenharia.aprovar`, `estoque.editar`.

Gates de UI via `useMyPermissions().can(...)`. RLS já segue padrão `consultor_id = auth.uid() OR is_admin(...)`; estender para projetos/PV.

---

### Onda 7 — Estoque preparado (Prioridade 7)

- Tabela `projeto_materiais_previstos` (sugestão calculada de módulos/inversores/cabos/MC4/estrutura por projeto).
- Função `sugerir_materiais_projeto(projeto_id)` baseada em potência/módulos/telhado.
- Sem baixa automática nesta onda — apenas estrutura + UI de consulta.

---

### Onda 8 — Dashboards reais (Prioridade 8)

- MVs novas: `mv_kpi_pv`, `mv_kpi_projetos_contrato`, `mv_kpi_financeiro_pv`.
- Adicionar ao `refresh_mv_kpis()`.
- Telas analytics consomem novas RPCs `kpi_pv()`, `kpi_projetos()`.

---

### Ordem de execução proposta nesta sessão

Vou começar pela **Onda 1 (Projetos do Contrato)** completa: migration + RPCs + triggers + RLS + repo + tela + integração com contrato. É a base sem a qual nada mais faz sentido (Engenharia precisa de projeto aprovado; PV precisa consolidar projetos).

**Critério de aceite Onda 1**:
1. Migration aplicada (tabela, triggers, RPCs, RLS, permissões).
2. Contrato assinado mostra botão "Cadastrar Projetos".
3. Posso criar 3 projetos somando = valor contrato (soma > valor rejeitada).
4. Aprovar projeto individualmente funciona e cria obra em engenharia.
5. Auditoria registra cada ação em `audit_log`.
6. Build limpo, RLS testada com consultor não-admin.

Após sua aprovação, prossigo onda por onda, com relatório curto entre cada uma e parada para revisão antes de avançar.

### Nota técnica
Cada onda toca: 1 migration SQL (schema + RPCs + RLS + triggers), 1 repo TS, 1–2 telas, integração no fluxo existente. Mantenho `leads`/`propostas` no padrão atual (já migrado) e introduzo `projetos_contrato`/`pedidos_venda` seguindo o mesmo padrão.