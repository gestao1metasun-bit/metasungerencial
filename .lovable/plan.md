# Plano estrutural ERP Meta Sun — próximas fases

A Fase 1.1 já foi entregue (auditoria DB universal via triggers, enum `app_permission`, `role_permissions`, `has_permission()`, hook `useMyPermissions`, timeline unificada). Este plano organiza o restante do que você pediu em fases entregáveis, cada uma em 1–3 rodadas. Cada fase termina utilizável — nada de "tudo ou nada".

---

## FASE 1.2 — Permissões granulares por usuário (extras / bloqueios)

Hoje as permissões vêm só do perfil (role). Vamos para o modelo que você descreveu:

```text
USUÁRIO → PERFIL BASE → + permissões extras → − permissões bloqueadas
```

**Banco**
- Tabela `user_permission_overrides(user_id, permission, effect: 'grant'|'deny', motivo, granted_by, created_at)`.
- Atualizar `has_permission()` para: admin → true; senão `(role tem) ∪ (overrides grant) ∖ (overrides deny)`.
- Trigger de auditoria já cobre via `tg_audit_row`.

**UI (Configurações → Usuários)**
- Tela "Permissões do usuário": lista todas as permissões agrupadas por módulo, mostrando origem (perfil / extra / bloqueada) e permitindo + / − com motivo obrigatório.
- Reaproveitar `useMyPermissions()` para gating de botões.

**Preparação futura** (apenas colunas reservadas, sem UI ainda):
- `filial_id`, `setor`, `carteira_id`, `escopo_jsonb` em `user_permission_overrides`.

---

## FASE 1.3 — Versionamento + soft-delete + motivo obrigatório

**Banco**
- Tabela genérica `entidade_versoes(entidade, entidade_id, versao int, snapshot jsonb, motivo, user_id, created_at)`.
- Trigger `tg_snapshot_version()` em `contratos`, `aditivos`, `obras`, `projetos`, `financeiro` (quando migrar), `estoque`.
- Bloquear `DELETE` físico via RLS nas tabelas operacionais; criar coluna `deleted_at` + `deleted_reason` + políticas "arquivar/cancelar".

**Regras de transição (trigger `tg_guard_estado`)**
- Contrato `Assinado` → só altera via aditivo.
- Financeiro `Pago` → só via estorno.
- Obra `Finalizada` → imutável fora admin.
- Já temos `tg_guard_operacional`; estender com mais estados.

**UI**
- Aba "Versões" em contratos/obras/projetos com diff visual e botão "Restaurar" (cria nova versão a partir da antiga).
- Modal "Informe o motivo" em ações críticas (cancelar, reabrir, alterar valor, alterar vencimento).
- Lixeira operacional em Configurações (lista `deleted_at not null`, restaurar / excluir definitivamente só admin).

---

## FASE 1.4 — Logs de sessão e ações críticas

- Tabela `session_log(user_id, evento, ip, user_agent, created_at)`: login, logout, falha de login, troca de senha.
- Hook no `__root.tsx` que escreve via server fn em `onAuthStateChange`.
- Tela "Auditoria" em Configurações com filtros por usuário/módulo/entidade/data.

---

## FASE 2 — Backup, restore e proteções

- Backup diário automático do Postgres já é feito pelo Lovable Cloud — vou expor isso na UI ("Último backup: …") e documentar política de retenção.
- Exportações lógicas semanais (CSV/JSON) por módulo, salvas em bucket `backups/` (já temos storage).
- Modo manutenção: flag global `system_flags.maintenance` → middleware bloqueia escrita para não-admin.
- Confirmação dupla (senha) em: exclusão em lote, restauração, fechamento de período, alteração de permissão de admin.
- Logs de backup/restore em `audit_log` com módulo `system`.

---

## FASE 3 — Performance (quando você liberar)

Você pediu para deixar para depois — mantenho aqui só como referência:
- Migrar stores `localStorage` críticos (contratos, clientes, financeiro, obras) para Supabase + TanStack Query.
- Invalidação cirúrgica por `queryKey` (sem recarregar dashboard inteira).
- Índices em `contratos(consultor_id, status)`, `obras(status, data_inicio)`, `audit_log(entidade, entidade_id, created_at)`.
- Paginação server-side em listas grandes; KPIs via views materializadas atualizadas por trigger.
- Code-splitting por rota (TanStack já suporta).

---

## FASE 4 — Travas operacionais finas

Complemento da 1.3, focado em integridade referencial:
- Bloquear delete de cliente com contrato/obra/financeiro vinculado.
- Bloquear delete de contrato com financeiro/obra vinculado.
- Bloquear delete de título financeiro conciliado.
- "Modo exceção": admin pode forçar, gravando `audit_log.acao='OVERRIDE'` + motivo.

---

## FASE 5 — Automações operacionais

Disparadas por trigger ou cron (`pg_cron` + server route `/api/public/hooks/*`):
- Contrato assinado → cria projeto + financeiro + previsão estoque + ordem engenharia.
- Alertas/tarefas em tabela `tarefas(user_id, setor, tipo, prioridade, due_at, resolved_at)`.
- Geradores automáticos:
  - obra atrasada (data_prevista < hoje, status ≠ Finalizada)
  - boleto vencendo em 3 dias
  - estoque crítico (< mínimo)
  - financiamento parado > 7 dias
  - cliente inadimplente
- Central de tarefas por setor/usuário em `/tarefas` com badge no menu.

---

## FASE 6 — Ambientes, versões e feature flags

- Tabela `feature_flags(chave, ativo, escopo_jsonb)` + hook `useFlag('nome')`.
- Tela admin para ligar/desligar features por módulo/usuário/setor.
- Changelog interno em `/configuracoes/versoes` lendo de `system_releases`.
- Sobre "produção x homologação": no Lovable, **Preview** já é homologação e **Published** é produção — vou documentar o fluxo (testar em preview → publicar) e adicionar banner "AMBIENTE PREVIEW" quando `import.meta.env.DEV` ou hostname `id-preview-*`.

---

## Ordem sugerida de execução

1. **Fase 1.2** (1 rodada) — permissões extras/bloqueios por usuário + UI.
2. **Fase 1.3** (2 rodadas) — versionamento, soft-delete, motivo obrigatório, lixeira.
3. **Fase 1.4** (1 rodada) — log de sessão + tela de auditoria.
4. **Fase 4** (1 rodada) — travas de integridade referencial.
5. **Fase 2** (1–2 rodadas) — backup/restore/modo manutenção.
6. **Fase 5** (2 rodadas) — automações e central de tarefas.
7. **Fase 6** (1 rodada) — feature flags + changelog + banner de ambiente.
8. **Fase 3** (3 rodadas) — performance (quando autorizar).

Confirma esta ordem? Posso começar pela **Fase 1.2** já na próxima rodada.
