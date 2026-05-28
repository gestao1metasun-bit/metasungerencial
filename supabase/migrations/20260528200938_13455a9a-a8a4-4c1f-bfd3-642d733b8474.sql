
CREATE TABLE public.error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrido_em timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  modulo text,
  tela text,
  acao text,
  mensagem text NOT NULL,
  stack text,
  payload jsonb,
  severidade text NOT NULL DEFAULT 'error' CHECK (severidade IN ('info','warn','error','fatal')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_analise','resolvido','ignorado')),
  resolvido_em timestamptz,
  resolvido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolucao_nota text,
  user_agent text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_log_ocorrido ON public.error_log (ocorrido_em DESC);
CREATE INDEX idx_error_log_status ON public.error_log (status) WHERE status <> 'resolvido';
CREATE INDEX idx_error_log_modulo ON public.error_log (modulo, ocorrido_em DESC);
CREATE INDEX idx_error_log_user ON public.error_log (user_id, ocorrido_em DESC);

GRANT SELECT, INSERT, UPDATE ON public.error_log TO authenticated;
GRANT ALL ON public.error_log TO service_role;

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth pode logar erro proprio"
ON public.error_log FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "admin le erros"
ON public.error_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::app_role)
  OR public.has_role(auth.uid(), 'admin_geral'::app_role)
  OR public.has_permission(auth.uid(), 'seguranca.ver_auditoria'::app_permission)
);

CREATE POLICY "admin atualiza erro"
ON public.error_log FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::app_role)
  OR public.has_role(auth.uid(), 'admin_geral'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master'::app_role)
  OR public.has_role(auth.uid(), 'admin_geral'::app_role)
);

CREATE TRIGGER tg_audit_error_log
AFTER INSERT OR UPDATE OR DELETE ON public.error_log
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
