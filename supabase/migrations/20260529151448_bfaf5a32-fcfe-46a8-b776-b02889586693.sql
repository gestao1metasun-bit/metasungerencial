CREATE OR REPLACE VIEW public.v_perf_p95_filtrado_7d
WITH (security_invoker = on)
AS
SELECT
  evento,
  COALESCE(rota, '—')                                                          AS rota,
  count(*)                                                                     AS amostras,
  count(*) FILTER (WHERE ms <= 15000)                                          AS amostras_validas,
  count(*) FILTER (WHERE ms > 15000)                                           AS amostras_outlier,
  percentile_cont(0.5)  WITHIN GROUP (ORDER BY ms)::int                        AS p50_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY ms)::int                        AS p95_ms,
  (percentile_cont(0.5)  WITHIN GROUP (ORDER BY ms) FILTER (WHERE ms <= 15000))::int  AS p50_filtrado,
  (percentile_cont(0.95) WITHIN GROUP (ORDER BY ms) FILTER (WHERE ms <= 15000))::int  AS p95_filtrado,
  (percentile_cont(0.99) WITHIN GROUP (ORDER BY ms) FILTER (WHERE ms <= 15000))::int  AS p99_filtrado,
  max(ms) FILTER (WHERE ms <= 15000)                                           AS max_filtrado,
  max(ms)                                                                      AS max_ms
FROM public.perf_log
WHERE created_at > now() - interval '7 days'
GROUP BY evento, COALESCE(rota, '—');

REVOKE ALL ON public.v_perf_p95_filtrado_7d FROM PUBLIC;
GRANT SELECT ON public.v_perf_p95_filtrado_7d TO authenticated;

COMMENT ON VIEW public.v_perf_p95_filtrado_7d IS
  'D19.1.fix F2 — P50/P95/P99 filtrados (ms<=15s) excluindo outliers de aba ociosa. Verdade oficial para gates D19.2/D19.3.';