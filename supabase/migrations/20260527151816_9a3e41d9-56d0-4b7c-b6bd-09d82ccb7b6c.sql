-- 1. cotacoes_compra: alinhar cc_select ao mesmo escopo de oc_select
DROP POLICY IF EXISTS cc_select ON public.cotacoes_compra;
CREATE POLICY cc_select ON public.cotacoes_compra
FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
  OR has_permission(auth.uid(), 'workflow.aprovar.financeiro'::app_permission)
  OR EXISTS (
    SELECT 1 FROM public.ordens_compra o
    JOIN public.solicitacoes_material s ON s.id = o.solicitacao_id
    WHERE o.id = cotacoes_compra.ordem_id
      AND s.solicitante_id = auth.uid()
  )
);

-- 2. estoque_movimentos: restringir INSERT a admin/comprador
DROP POLICY IF EXISTS em_insert_system ON public.estoque_movimentos;
CREATE POLICY em_insert_system ON public.estoque_movimentos
FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
);

-- 3. estoque_reservas: restringir INSERT a admin/comprador ou consultor da obra/pv
DROP POLICY IF EXISTS er_insert ON public.estoque_reservas;
CREATE POLICY er_insert ON public.estoque_reservas
FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
  OR (obra_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.obras o
    WHERE o.id = estoque_reservas.obra_id
      AND o.consultor_id = auth.uid()
  ))
  OR (pv_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pedidos_venda pv
    WHERE pv.id = estoque_reservas.pv_id
      AND pv.consultor_id = auth.uid()
  ))
);

-- 4. workflow_aprovacoes_historico: restringir INSERT a admin ou solicitante/aprovador da aprovação
DROP POLICY IF EXISTS wfh_insert_authenticated ON public.workflow_aprovacoes_historico;
CREATE POLICY wfh_insert_authenticated ON public.workflow_aprovacoes_historico
FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.workflow_aprovacoes w
    WHERE w.id = workflow_aprovacoes_historico.aprovacao_id
      AND (w.solicitante_id = auth.uid() OR w.aprovador_id = auth.uid())
  )
);
