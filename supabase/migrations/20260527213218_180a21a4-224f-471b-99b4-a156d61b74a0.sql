
-- =====================================================
-- D14.2 — Security & RLS Hardening (Wave 1)
-- =====================================================
-- 1) Flip remaining SECURITY DEFINER views to INVOKER
-- 2) Revoke EXECUTE from anon/PUBLIC on SECURITY DEFINER functions
-- 3) Restrict "WITH CHECK true" INSERT policies on system tables
-- =====================================================

-- ---------- 1) Views: security_invoker=on ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='v'
      AND (c.reloptions IS NULL OR NOT array_to_string(c.reloptions,',') LIKE '%security_invoker=on%')
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', r.relname);
  END LOOP;
END $$;

-- ---------- 2) Revoke anon/public EXECUTE on SECURITY DEFINER functions ----------
-- Triggers (tg_*) don't need any EXECUTE privileges — Postgres calls them internally.
-- Other RPCs must remain callable by authenticated users only.
DO $$
DECLARE r record; sig text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
  LOOP
    sig := format('public.%I(%s)', r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', sig);
    IF r.proname NOT LIKE 'tg\_%' ESCAPE '\' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
    END IF;
  END LOOP;
END $$;

-- ---------- 3) Tighten INSERT-true policies on system/history tables ----------
-- These tables are written by triggers/RPCs running under the user's auth.uid()
-- (SECURITY DEFINER does NOT change auth.uid()). Replace USING (true) /
-- WITH CHECK (true) with auth.uid() IS NOT NULL so anon (if ever exposed) can't write.

DROP POLICY IF EXISTS ev_insert_system ON public.entidade_versoes;
CREATE POLICY ev_insert_system ON public.entidade_versoes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS pvsh_insert_system ON public.pedidos_venda_status_historico;
CREATE POLICY pvsh_insert_system ON public.pedidos_venda_status_historico
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS mf_insert_system ON public.movimentacoes_financeiras;
CREATE POLICY mf_insert_system ON public.movimentacoes_financeiras
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR current_setting('app.via_movimentacao', true) = 'true'
  );

DROP POLICY IF EXISTS ee_insert ON public.estoque_entregas;
CREATE POLICY ee_insert ON public.estoque_entregas
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
    OR EXISTS (
      SELECT 1 FROM public.estoque_reservas r
      LEFT JOIN public.obras o ON o.id = r.obra_id
      LEFT JOIN public.pedidos_venda pv ON pv.id = r.pv_id
      WHERE r.id = estoque_entregas.reserva_id
        AND (o.consultor_id = auth.uid() OR pv.consultor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS rfh_insert_system ON public.record_flags_historico;
CREATE POLICY rfh_insert_system ON public.record_flags_historico
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
