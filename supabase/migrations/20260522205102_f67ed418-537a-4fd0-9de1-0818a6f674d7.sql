
CREATE TABLE IF NOT EXISTS public.session_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  evento text NOT NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_log_user ON public.session_log (user_id, created_at DESC);

ALTER TABLE public.session_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_log_select_own_or_admin"
  ON public.session_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "session_log_insert_self"
  ON public.session_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
