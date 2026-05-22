
-- 1) Add setor column + redo unique key
ALTER TABLE public.gerencial_parametros
  ADD COLUMN IF NOT EXISTS setor text;

ALTER TABLE public.gerencial_parametros
  DROP CONSTRAINT IF EXISTS gerencial_parametros_chave_key;

CREATE UNIQUE INDEX IF NOT EXISTS gerencial_parametros_chave_setor_uidx
  ON public.gerencial_parametros (chave, COALESCE(setor, ''));

-- 2) Historico
CREATE TABLE IF NOT EXISTS public.gerencial_parametros_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL,
  setor text,
  categoria text,
  descricao text,
  valor_anterior jsonb,
  valor_novo jsonb NOT NULL,
  motivo text,
  changed_by uuid,
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gerencial_parametros_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gph_select_auth ON public.gerencial_parametros_historico;
CREATE POLICY gph_select_auth ON public.gerencial_parametros_historico
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gph_admin_insert ON public.gerencial_parametros_historico;
CREATE POLICY gph_admin_insert ON public.gerencial_parametros_historico
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS gph_chave_setor_idx
  ON public.gerencial_parametros_historico (chave, COALESCE(setor, ''), created_at DESC);
