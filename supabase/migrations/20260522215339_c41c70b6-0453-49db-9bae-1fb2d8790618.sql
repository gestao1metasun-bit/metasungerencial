REVOKE ALL ON public.mv_kpi_comercial  FROM anon, public;
REVOKE ALL ON public.mv_kpi_engenharia FROM anon, public;
REVOKE ALL ON public.mv_kpi_consultor  FROM anon, public;

REVOKE EXECUTE ON FUNCTION public.refresh_mv_kpis() FROM anon, public;