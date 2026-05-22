
# Roadmap estrutural Meta Sun ERP

Esta é uma transformação grande (semanas de trabalho), não cabe em uma única rodada. Proponho dividir em **5 fases entregáveis**, cada uma autocontida e testável. Vou pedir sua aprovação **fase por fase** antes de executar — assim você valida o resultado antes de a próxima começar.

Hoje o sistema é majoritariamente **localStorage-first** (stores em `src/lib/*-store.ts`). Antes de virar "ERP robusto", precisamos migrar as entidades críticas para o **Lovable Cloud (Supabase)**, que já está conectado e tem várias tabelas prontas (`contratos`, `clientes`, `obras`, `aditivos`, `audit_log`, `period_locks`, `user_roles`, `profiles`). A maior parte do código ainda não usa essas tabelas — esse é o trabalho real por trás de "auditoria, multiempresa, BI".

---

## Fase 1 — Segurança, Auditoria e Versionamento (fundação)

**Por que primeiro:** sem isso, qualquer mudança nas próximas fases vira caixa-preta.

1. **Auditoria universal no banco**
   - Já existe `public.audit_log` + função `tg_audit_row()`. Hoje **nenhuma tabela tem trigger ligado**. Vou anexar triggers AFTER INSERT/UPDATE/DELETE em: `contratos`, `aditivos`, `clientes`, `obras`, `projetos`, `user_roles`, `period_locks`.
   - Capturar `user_id`, `user_email`, `valor_anterior`, `valor_novo`, `acao`, `entidade`, `entidade_id`, `created_at`. IP/User-Agent virão via header em server functions (não dá pra capturar dentro do trigger puro).
   - Tela **Histórico/Timeline** por registro (já existe `HistoricoTimeline.tsx` consumindo store local — vou plugar no `audit_log` real).

2. **Versionamento de registros críticos**
   - Tabela nova `entidade_versoes (entidade, entidade_id, versao, snapshot jsonb, autor, created_at)`.
   - Aplicado em `contratos`, `aditivos`, `obras`, `titulos_financeiros` (quando migrarmos).
   - UI: aba "Versões" com diff campo-a-campo e botão **Restaurar** (cria nova versão a partir da antiga, nunca sobrescreve histórico).

3. **Permissões granulares**
   - Hoje `user_roles` tem só enum `admin_master | admin_geral | usuario`. Vou criar:
     - `app_permission` enum: `financeiro.visualizar`, `financeiro.editar`, `financeiro.excluir`, `engenharia.status`, `estoque.movimentar`, `comercial.aprovar`, ... (~30 chaves).
     - Tabela `role_permissions (role, permission)` + função `has_permission(_user, _perm)`.
     - RLS das tabelas operacionais passa a usar `has_permission()` em vez de só `is_admin()`.
   - UI em **Configurações → Perfis** lista e edita as permissões por role (substituindo o mock atual em `perfis-store.ts`).

4. **Soft-delete obrigatório**
   - Adicionar `status` ou `deleted_at` onde faltar; bloquear `DELETE` para não-admin via RLS. Ações operacionais viram **Cancelar / Inativar / Arquivar**.

---

## Fase 2 — Estrutura Contábil/Fiscal e Multiempresa-ready

1. **Plano de contas em camadas** (tabelas novas no Supabase):
   ```text
   empresas (id, razao_social, cnpj, ...)           ← multiempresa desde já
   grupos_contabeis (codigo, nome)
   subgrupos_contabeis (grupo_id, codigo, nome)
   contas_contabeis (subgrupo_id, codigo, nome, natureza)
   naturezas_financeiras (codigo, nome, tipo)
   centros_custo (codigo, nome, tipo, empresa_id)
   classificacao_fiscal (cfop, cst, ncm, ...)        ← schema preparado
   ```
   Migra o que hoje vive em `fin-centros-custo-store.ts`, `fin-naturezas-store.ts`, `fin-grupos-store.ts` para o banco, mantendo os hooks existentes como adaptadores.

2. **Toda movimentação carrega:** `empresa_id`, `natureza_id`, `centro_custo_id`, `origem` (Comercial/Engenharia/Estoque/Admin/Manutenção), `conta_contabil_id`, `classificacao_fiscal_id` (nullable por enquanto).

3. **Motor de contabilização (preparação)**
   - Tabela `eventos_contabeis (evento, conta_debito, conta_credito, regra jsonb)`.
   - Tabela `lancamentos_contabeis` gerada **shadow** a cada movimento financeiro (não exibida ainda, mas auditável). Quando Domínio/Alterdata/SPED entrarem, basta exportar.

4. **`empresa_id` em todas as tabelas operacionais** + RLS adicional. Hoje não há filtro de empresa — adicionar agora evita refazer o banco depois.

---

## Fase 3 — Performance e Escalabilidade

1. **Migrar stores `localStorage` → Supabase + TanStack Query**
   Lista (ordem de prioridade): `contratos-store`, `clientes-store`, `aditivos-store`, `financeiro-store`, `fin-titulos-store`, `estoque-store`, `obras-snapshot-store`, `posvenda-store`. Cada migração:
   - `createServerFn` + `requireSupabaseAuth`.
   - `queryOptions` + `useSuspenseQuery` no componente.
   - Invalidação **cirúrgica** por `queryKey` (ex.: `['contratos', id]` vs `['contratos','list']`) — resolve o "dashboard zerando".

2. **Dashboard granular**
   - Cada KPI/card vira um `queryKey` independente com seu próprio `staleTime`.
   - Realtime via `supabase.channel(...)` invalidando **apenas** as chaves afetadas.
   - Sem mais reload global.

3. **Banco**
   - Índices em FKs e colunas filtradas (`contratos.consultor_id`, `contratos.status`, `obras.contrato_id`, `aditivos.contrato_id`, `audit_log(entidade, entidade_id)`).
   - Paginação server-side nas listagens longas (`range()` no Supabase).
   - Views materializadas para KPIs pesados, refresh assíncrono via `pg_cron`.

4. **Lazy-loading de rotas** (já que TanStack Start suporta) + code-splitting nos módulos pesados (financeiro, estoque).

---

## Fase 4 — Camada Executiva / CFO

Novo módulo `/executivo` (rota separada, permissão própria `executivo.visualizar`):

- **Financeiro:** EBITDA, margem líquida/operacional, fluxo projetado, aging, inadimplência, PMR, PMP, capital de giro, necessidade de caixa.
- **Comercial:** funil lead→contrato→assinatura, ticket médio, ROI, ranking de vendedor, curva de fechamento.
- **Engenharia:** produtividade/equipe, custo médio, retrabalho, prazo médio, obras atrasadas.
- **Estoque:** giro, ruptura, parado, consumo médio.
- **BI cruzado:** vendedor × margem, equipe × manutenção, fornecedor × problema, banco × demora liberação, obra × retrabalho.

Implementação: views/materialized views no Postgres + `recharts` no front. Cada gráfico tem `queryKey` próprio (regra da Fase 3).

---

## Fase 5 — Workflow e Automações

1. **Máquina de estados** por entidade (`contrato`, `obra`, `titulo`), tabela `workflow_transicoes` definindo transições permitidas e quais permissões liberam "pular etapa". Trigger bloqueia transição inválida.

2. **Automações em trigger / server fn:**
   - Contrato assinado → cria `projeto`, `titulos_financeiros`, snapshot de estoque, `obra` em "Planejada".
   - Já existe parte disso em `dev-seed.ts` e nos stores; vou centralizar em server functions e disparar via trigger Postgres quando possível.

3. **Central de tarefas/alertas:**
   - Tabela `tarefas (responsavel, tipo, entidade, prazo, status)`.
   - Geradores automáticos: obra atrasada, boleto vencendo, estoque crítico, financiamento parado, inadimplência.
   - Caixa de tarefas por usuário/setor (página `/tarefas` + badge no header).

---

## Como vamos tocar isso

- Cada fase = **1 a 3 rodadas de chat**, com migrations + código + verificação no preview.
- Tudo passa por aprovação de migration antes de rodar.
- Funcionalidades existentes **continuam funcionando** durante a migração (adaptadores mantêm a API atual dos stores enquanto a fonte de verdade migra).
- Nada é deletado: stores antigos viram fallback até a tela equivalente estar 100% no Supabase.

## Próximo passo

Se aprovar o roadmap geral, **começo pela Fase 1** (auditoria + versionamento + permissões granulares + soft-delete). Posso também, se preferir, ajustar a ordem — por exemplo, priorizar **Fase 3 (performance)** antes, já que você está sentindo lentidão hoje.

**Quer começar pela Fase 1 ou pela Fase 3?**
