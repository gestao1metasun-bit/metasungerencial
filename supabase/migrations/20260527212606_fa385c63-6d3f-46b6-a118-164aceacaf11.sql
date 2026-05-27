
-- ============================================================
-- D14.1 — Enterprise Data Truth
-- Camada oficial de KPIs sobre v_reconciliacao_* (verdade única)
-- + view de Saúde dos Dados consolidada
-- Todas com security_invoker=on (corrige lint SECURITY DEFINER VIEW)
-- ============================================================

create or replace view public.v_kpis_financeiro_oficial
with (security_invoker = on) as
select
  indicador,
  valor_base   as valor,
  valor_dashboard,
  diferenca,
  perc_divergencia,
  status,
  origem_provavel,
  sugestao,
  now()        as verificado_em
from public.v_reconciliacao_financeira;

create or replace view public.v_kpis_comercial_oficial
with (security_invoker = on) as
select
  indicador,
  valor_base   as valor,
  valor_dashboard,
  diferenca,
  perc_divergencia,
  status,
  origem_provavel,
  sugestao,
  now()        as verificado_em
from public.v_reconciliacao_comercial;

create or replace view public.v_kpis_engenharia_oficial
with (security_invoker = on) as
select
  indicador,
  valor_base   as valor,
  valor_dashboard,
  diferenca,
  perc_divergencia,
  status,
  origem_provavel,
  sugestao,
  now()        as verificado_em
from public.v_reconciliacao_engenharia;

create or replace view public.v_kpis_estoque_oficial
with (security_invoker = on) as
select
  indicador,
  valor_base   as valor,
  valor_dashboard,
  diferenca,
  perc_divergencia,
  status,
  origem_provavel,
  sugestao,
  now()        as verificado_em
from public.v_reconciliacao_estoque;

create or replace view public.v_kpis_aprovacoes_oficial
with (security_invoker = on) as
select
  indicador,
  valor_base   as valor,
  valor_dashboard,
  diferenca,
  perc_divergencia,
  status,
  origem_provavel,
  sugestao,
  now()        as verificado_em
from public.v_reconciliacao_aprovacoes;

-- Financiamentos ainda não tem view de reconciliação dedicada.
-- Cria placeholder oficial derivado de contratos.financiamento_* para
-- não criar cálculo paralelo no client. Quando D7 entregar reconciliação
-- de financiamentos, esta view passa a referenciar v_reconciliacao_financiamentos.
create or replace view public.v_kpis_financiamentos_oficial
with (security_invoker = on) as
with base as (
  select
    count(*) filter (where possui_financiamento)                 as total_contratos_com_fin,
    count(*) filter (where possui_financiamento
                      and coalesce(financiamento_status,'') = 'APROVADO') as fin_aprovados,
    count(*) filter (where possui_financiamento
                      and coalesce(financiamento_status,'') in ('PENDENTE','EM_ANALISE'))
                                                                  as fin_em_analise,
    count(*) filter (where possui_financiamento
                      and coalesce(financiamento_status,'') = 'NEGADO')   as fin_negados,
    coalesce(sum(financiamento_valor) filter (where possui_financiamento), 0) as valor_solicitado,
    coalesce(sum(financiamento_valor) filter (where possui_financiamento
                      and coalesce(financiamento_status,'') = 'APROVADO'), 0) as valor_aprovado
  from public.contratos
  where deleted_at is null
)
select indicador, valor::numeric as valor,
       valor as valor_dashboard,
       0::numeric as diferenca,
       0::numeric as perc_divergencia,
       'OK'::text as status,
       'contratos.financiamento_*'::text as origem_provavel,
       null::text as sugestao,
       now() as verificado_em
from base, lateral (values
  ('contratos_com_financiamento', base.total_contratos_com_fin),
  ('financiamentos_aprovados',    base.fin_aprovados),
  ('financiamentos_em_analise',   base.fin_em_analise),
  ('financiamentos_negados',      base.fin_negados),
  ('valor_solicitado',            base.valor_solicitado),
  ('valor_aprovado',              base.valor_aprovado)
) as t(indicador, valor);

-- ------------------------------------------------------------
-- v_saude_dados — consolidação para o painel /paineis/saude-dados
-- ------------------------------------------------------------
create or replace view public.v_saude_dados
with (security_invoker = on) as
select 'financeiro'::text as modulo, indicador, status,
       perc_divergencia, valor_base, valor_dashboard, diferenca,
       origem_provavel, sugestao, now() as ultima_verificacao
from public.v_reconciliacao_financeira
union all
select 'comercial', indicador, status, perc_divergencia,
       valor_base, valor_dashboard, diferenca, origem_provavel, sugestao, now()
from public.v_reconciliacao_comercial
union all
select 'engenharia', indicador, status, perc_divergencia,
       valor_base, valor_dashboard, diferenca, origem_provavel, sugestao, now()
from public.v_reconciliacao_engenharia
union all
select 'estoque', indicador, status, perc_divergencia,
       valor_base, valor_dashboard, diferenca, origem_provavel, sugestao, now()
from public.v_reconciliacao_estoque
union all
select 'aprovacoes', indicador, status, perc_divergencia,
       valor_base, valor_dashboard, diferenca, origem_provavel, sugestao, now()
from public.v_reconciliacao_aprovacoes
union all
select 'pv', indicador, status, perc_divergencia,
       valor_base, valor_dashboard, diferenca, origem_provavel, sugestao, now()
from public.v_reconciliacao_pv;

-- ------------------------------------------------------------
-- GRANTs (Data API)
-- ------------------------------------------------------------
grant select on public.v_kpis_financeiro_oficial      to authenticated;
grant select on public.v_kpis_comercial_oficial       to authenticated;
grant select on public.v_kpis_engenharia_oficial      to authenticated;
grant select on public.v_kpis_estoque_oficial         to authenticated;
grant select on public.v_kpis_aprovacoes_oficial      to authenticated;
grant select on public.v_kpis_financiamentos_oficial  to authenticated;
grant select on public.v_saude_dados                  to authenticated;

grant select on public.v_kpis_financeiro_oficial      to service_role;
grant select on public.v_kpis_comercial_oficial       to service_role;
grant select on public.v_kpis_engenharia_oficial      to service_role;
grant select on public.v_kpis_estoque_oficial         to service_role;
grant select on public.v_kpis_aprovacoes_oficial      to service_role;
grant select on public.v_kpis_financiamentos_oficial  to service_role;
grant select on public.v_saude_dados                  to service_role;

comment on view public.v_kpis_financeiro_oficial     is 'D14.1 — KPI oficial financeiro (verdade única). Não criar cálculo paralelo no client.';
comment on view public.v_kpis_comercial_oficial      is 'D14.1 — KPI oficial comercial (verdade única).';
comment on view public.v_kpis_engenharia_oficial     is 'D14.1 — KPI oficial engenharia (verdade única).';
comment on view public.v_kpis_estoque_oficial        is 'D14.1 — KPI oficial estoque (verdade única).';
comment on view public.v_kpis_aprovacoes_oficial     is 'D14.1 — KPI oficial aprovações (verdade única).';
comment on view public.v_kpis_financiamentos_oficial is 'D14.1 — KPI oficial financiamentos (placeholder até v_reconciliacao_financiamentos).';
comment on view public.v_saude_dados                 is 'D14.1 — Painel /paineis/saude-dados: status OK/Atencao/Critico por indicador.';
