-- D19.2 fix — GRANTs faltantes em public.error_log
-- Causa do POST /rest/v1/error_log 400: PostgREST devolvia "permission denied"
-- porque authenticated/service_role não tinham privilégios na tabela.
-- RLS já está correta e continua sendo o gate de linha:
--   INSERT: user_id = auth.uid() OR user_id IS NULL
--   SELECT/UPDATE: somente admin_master/admin_geral/seguranca.ver_auditoria
-- Não concedemos nada a anon — telemetria exige sessão.

GRANT INSERT, SELECT, UPDATE ON public.error_log TO authenticated;
GRANT ALL ON public.error_log TO service_role;