# D15.1 Frente 3 — Checklist Operacional de Go-Live (Operação Assistida)

**Versão:** 1.0 · 2026-05-28
**Escopo:** primeira semana de operação assistida real da Meta Sun.
**Pré-requisitos:** Ondas 1.A → 8 + D15.1 Frente 1 (error_log) concluídas.

## 1. Primeira Semana — Rotina Diária

### 1.1 Validações diárias (08:00)
- [ ] Abrir `/paineis/saude-sistema` — confirmar 12 KPIs no verde.
- [ ] Abrir `/paineis/saude-dados` — verificar reconciliação financeira.
- [ ] Abrir `/paineis/governanca` — checar aba **Pendências** (deve ficar em 0).
- [ ] Abrir `/paineis/erros` — listar erros `aberto`; triagem em até 1h.
- [ ] Conferir contagem de lançamentos do dia anterior em
      `v_lancamentos_derivados` × extrato bancário real.

### 1.2 Indicadores obrigatórios (acompanhar diariamente)
| Indicador | Fonte | Tolerância |
|---|---|---|
| Saldo bancos vs movimentos | `v_kpis_financeiro_oficial` | 0 divergência |
| Títulos em aberto vs parcelas | `v_reconciliacao_titulos` | 0 órfão |
| Pedidos venda sem contrato | `v_kpis_comercial_oficial` | < 5% |
| Aprovações fora do prazo SLA | `governance_pendencias` | 0 críticas |
| Erros `fatal`/`error` do dia | `error_log` | 0 fatais, < 5 errors |
| Conflitos de concorrência (40001) | `error_log` payload | 0 |

### 1.3 Monitoramentos automáticos
- Painel saúde com refresh a cada 2 minutos (já configurado).
- Auditoria forward-only ativa em 33 tabelas.
- Linter Supabase em 91 warns aceitos (zero ERROR).

### 1.4 Conferências financeiras (final do dia, 18:00)
- [ ] Total recebido (mov tipo `entrada` × extrato).
- [ ] Total pago (mov tipo `saida` × boletos baixados).
- [ ] Adiantamentos abertos: `saldo_disponivel` ≥ 0 em todas as linhas.
- [ ] Nenhuma parcela com `status = 'baixada'` sem movimentação associada.
- [ ] Renegociações: títulos antigos cancelados ↔ novos títulos gerados.

### 1.5 Conferências comerciais (final do dia)
- [ ] Pedidos de venda gerados hoje têm contrato vinculado.
- [ ] Propostas aprovadas viraram PV em até 24h.
- [ ] Margem média do dia ≥ meta (definir com o usuário).

## 2. Alertas Críticos

| Código | Sinal | Onde aparece | Severidade |
|---|---|---|---|
| ERR-RPC | erro ao executar `rpc_lancamento_criar` ou similar | `error_log` (modulo=financeiro) | **fatal** |
| ERR-CONC | erro `40001` (check_row_version) | `error_log` payload | **error** |
| ERR-AUDIT | trigger `tg_audit_row` falha | log Postgres | **fatal** |
| ERR-PERM | violação de RLS / permission denied | `error_log` mensagem | **error** |
| ERR-WRITE | INSERT/UPDATE rejeitado por CHECK | `error_log` | **error** |
| ERR-IDEMP | `rpc_idempotente_check` retorna conflito | `error_log` | **warn** |
| ERR-FLAG | flag D15 desligada em ambiente produtivo | `featureFlags` | **warn** |

## 3. Plano de Ação por Alerta

### 3.1 ERR-RPC (falha de operação financeira)
- **Responsável:** Renan Barcelos
- **Tempo de resposta:** imediato (≤ 5 min).
- **Contingência:** registrar manualmente em planilha; reprocessar via
  `useCriarLancamento` após correção; NÃO inserir direto na tabela.

### 3.2 ERR-CONC (conflito de concorrência)
- **Responsável:** Renan
- **Resposta:** ≤ 15 min.
- **Contingência:** recarregar a tela, refazer alteração com `row_version`
  atualizado. Se persistir, marcar erro como `em_analise`.

### 3.3 ERR-AUDIT (auditoria não gravou)
- **Responsável:** Renan + suporte Lovable
- **Resposta:** imediato; bloquear novas operações até auditoria voltar.
- **Contingência:** acionar suporte; não usar `service_role` para contornar.

### 3.4 ERR-PERM (permissão negada)
- **Responsável:** Renan (admin)
- **Resposta:** ≤ 30 min.
- **Contingência:** revisar `user_roles` / `user_permissions`; nunca
  desativar RLS.

### 3.5 ERR-WRITE (gravação rejeitada por regra de negócio)
- **Responsável:** operador da tela
- **Resposta:** corrigir input e tentar de novo.
- **Contingência:** se for regra incorreta, abrir registro em `error_log`
  com severidade `warn` e descrever caso.

## 4. Critérios de Saída da Operação Assistida

A operação assistida pode evoluir para autônoma quando, por 5 dias úteis
consecutivos:
1. Nenhum erro `fatal` em `error_log`.
2. `v_saude_sistema` 100% verde.
3. Reconciliação financeira fecha com extrato bancário real.
4. Pendências de governança ≤ 1 por dia.
5. Renan confirma "sem intervenção fora do sistema".

## 5. Procedimentos Proibidos

- ❌ Editar dados direto via SQL no painel Supabase (usar RPCs).
- ❌ Desabilitar RLS, mesmo temporariamente.
- ❌ Setar `app.via_workflow_rpc=true` fora das RPCs oficiais.
- ❌ Criar tabela fora de migração oficial.
- ❌ Persistir nova entidade transacional em LocalStorage.
- ❌ Ignorar erros `fatal` por mais de 1h.
