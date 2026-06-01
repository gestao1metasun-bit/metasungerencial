-- D19.SEC: endurecer 3 políticas WITH CHECK/USING true (scanner SUPA_rls_policy_always_true)

-- 1) operacoes_financeiras_eventos: append-only via RPCs SECURITY DEFINER.
--    Restringe INSERT direto a usuários com permissão op_fin.criar (DEFINER continua bypassando RLS).
DROP POLICY IF EXISTS "op_fin_ev ins" ON public.operacoes_financeiras_eventos;
CREATE POLICY "op_fin_ev ins"
ON public.operacoes_financeiras_eventos
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'operacao_financeira.criar'::app_permission));

-- 2) faturamentos_comercial INSERT: exige permissão de edição de proposta (módulo comercial faturamento)
DROP POLICY IF EXISTS fat_insert_auth ON public.faturamentos_comercial;
CREATE POLICY fat_insert_auth
ON public.faturamentos_comercial
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'comercial.proposta.editar'::app_permission));

-- 3) faturamentos_comercial UPDATE: mesma permissão
DROP POLICY IF EXISTS fat_update_auth ON public.faturamentos_comercial;
CREATE POLICY fat_update_auth
ON public.faturamentos_comercial
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'comercial.proposta.editar'::app_permission))
WITH CHECK (public.has_permission(auth.uid(), 'comercial.proposta.editar'::app_permission));
