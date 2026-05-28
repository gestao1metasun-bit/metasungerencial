
-- ============================================================
-- Security fixes from scanner (2026-05-28)
-- ============================================================

-- 1) boletos_itens: mirror boletos_select permission checks
DROP POLICY IF EXISTS boletos_itens_select ON public.boletos_itens;
CREATE POLICY boletos_itens_select ON public.boletos_itens
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
    OR has_permission(auth.uid(), 'financeiro.visualizar'::app_permission)
  );

-- 2) ordem_compra_itens: mirror oc_select permission checks
DROP POLICY IF EXISTS oci_select ON public.ordem_compra_itens;
CREATE POLICY oci_select ON public.ordem_compra_itens
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
    OR has_permission(auth.uid(), 'workflow.aprovar.financeiro'::app_permission)
    OR EXISTS (
      SELECT 1
      FROM public.ordens_compra o
      JOIN public.solicitacoes_material s ON s.id = o.solicitacao_id
      WHERE o.id = ordem_compra_itens.ordem_id
        AND s.solicitante_id = auth.uid()
    )
  );

-- 3) profiles: restrict select to self + admin (was: USING true)
DROP POLICY IF EXISTS profiles_select_all_auth ON public.profiles;
CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 4) Storage RLS for private buckets 'anexos' and 'anexos-titulos'
-- 4a) anexos: scoped by anexos table + pode_acessar_entidade
DROP POLICY IF EXISTS "anexos_select_via_entity" ON storage.objects;
CREATE POLICY "anexos_select_via_entity" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos'
    AND (
      is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.anexos a
        WHERE a.storage_path = storage.objects.name
          AND a.deleted_at IS NULL
          AND public.pode_acessar_entidade(a.entidade_tipo, a.entidade_id)
      )
    )
  );

DROP POLICY IF EXISTS "anexos_insert_authenticated" ON storage.objects;
CREATE POLICY "anexos_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos' AND owner = auth.uid());

DROP POLICY IF EXISTS "anexos_update_owner_or_admin" ON storage.objects;
CREATE POLICY "anexos_update_owner_or_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'anexos'
    AND (
      is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.anexos a
        WHERE a.storage_path = storage.objects.name
          AND a.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "anexos_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "anexos_delete_owner_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'anexos'
    AND (
      is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.anexos a
        WHERE a.storage_path = storage.objects.name
          AND a.owner_id = auth.uid()
      )
    )
  );

-- 4b) anexos-titulos: scoped by anexos_titulos.owner_id
DROP POLICY IF EXISTS "anexos_titulos_select_owner_or_admin" ON storage.objects;
CREATE POLICY "anexos_titulos_select_owner_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos-titulos'
    AND (
      is_admin(auth.uid())
      OR has_permission(auth.uid(), 'financeiro.visualizar'::app_permission)
      OR EXISTS (
        SELECT 1 FROM public.anexos_titulos a
        WHERE a.storage_path = storage.objects.name
          AND a.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "anexos_titulos_insert_authenticated" ON storage.objects;
CREATE POLICY "anexos_titulos_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos-titulos' AND owner = auth.uid());

DROP POLICY IF EXISTS "anexos_titulos_update_owner_or_admin" ON storage.objects;
CREATE POLICY "anexos_titulos_update_owner_or_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'anexos-titulos'
    AND (
      is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.anexos_titulos a
        WHERE a.storage_path = storage.objects.name
          AND a.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "anexos_titulos_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "anexos_titulos_delete_owner_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'anexos-titulos'
    AND (
      is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.anexos_titulos a
        WHERE a.storage_path = storage.objects.name
          AND a.owner_id = auth.uid()
      )
    )
  );
