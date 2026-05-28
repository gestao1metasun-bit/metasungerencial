
CREATE TABLE IF NOT EXISTS public.perf_log (
  id BIGSERIAL PRIMARY KEY,
  evento TEXT NOT NULL,
  ms INTEGER NOT NULL CHECK (ms >= 0 AND ms <= 600000),
  rota TEXT,
  user_id UUID,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.perf_log TO authenticated;
GRANT ALL ON public.perf_log TO service_role;

ALTER TABLE public.perf_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_log admin select"
ON public.perf_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin_geral'));

CREATE INDEX IF NOT EXISTS idx_perf_log_evento_created ON public.perf_log (evento, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_log_created ON public.perf_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_log_user_created ON public.perf_log (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.rpc_perf_log(
  p_evento TEXT,
  p_ms INTEGER,
  p_rota TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INTEGER;
  v_id BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '42501';
  END IF;
  IF p_evento IS NULL OR length(p_evento) < 2 OR length(p_evento) > 64 THEN
    RAISE EXCEPTION 'evento invalido' USING ERRCODE = '22023';
  END IF;
  IF p_ms IS NULL OR p_ms < 0 OR p_ms > 600000 THEN
    RAISE EXCEPTION 'ms invalido' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.perf_log
  WHERE user_id = v_uid
    AND created_at > now() - interval '5 minutes';

  IF v_count >= 200 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.perf_log (evento, ms, rota, user_id, user_agent)
  VALUES (
    p_evento, p_ms,
    NULLIF(left(coalesce(p_rota, ''), 128), ''),
    v_uid,
    NULLIF(left(coalesce(p_user_agent, ''), 256), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_perf_log(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_perf_log(TEXT, INTEGER, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_perf_log(TEXT, INTEGER, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE VIEW public.v_perf_p95_7d
WITH (security_invoker = on)
AS
SELECT
  evento,
  coalesce(rota, '-') AS rota,
  count(*) AS amostras,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY ms)::INTEGER AS p50_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY ms)::INTEGER AS p95_ms,
  max(ms) AS max_ms,
  min(ms) AS min_ms
FROM public.perf_log
WHERE created_at > now() - interval '7 days'
GROUP BY evento, coalesce(rota, '-')
ORDER BY evento, rota;

GRANT SELECT ON public.v_perf_p95_7d TO authenticated;
