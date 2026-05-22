-- Remover qualquer GRANT direto nas MVs (elas continuam existindo, mas não são mais expostas via API)
REVOKE ALL ON public.mv_kpi_comercial  FROM authenticated, anon, public;
REVOKE ALL ON public.mv_kpi_engenharia FROM authenticated, anon, public;
REVOKE ALL ON public.mv_kpi_consultor  FROM authenticated, anon, public;

-- Funções RPC que servem os dados (com checagem de auth)
CREATE OR REPLACE FUNCTION public.kpi_comercial()
RETURNS SETOF public.mv_kpi_comercial
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.mv_kpi_comercial
  WHERE auth.uid() IS NOT NULL
  ORDER BY mes DESC;
$$;

CREATE OR REPLACE FUNCTION public.kpi_engenharia()
RETURNS SETOF public.mv_kpi_engenharia
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.mv_kpi_engenharia
  WHERE auth.uid() IS NOT NULL
  ORDER BY mes DESC;
$$;

CREATE OR REPLACE FUNCTION public.kpi_consultor()
RETURNS SETOF public.mv_kpi_consultor
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.mv_kpi_consultor
  WHERE auth.uid() IS NOT NULL
  ORDER BY receita DESC;
$$;

-- Permissão de execução: apenas autenticados
REVOKE EXECUTE ON FUNCTION public.kpi_comercial()    FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_engenharia()   FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_consultor()    FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.refresh_mv_kpis()  FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.kpi_comercial()    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.kpi_engenharia()   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.kpi_consultor()    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.refresh_mv_kpis()  TO authenticated;