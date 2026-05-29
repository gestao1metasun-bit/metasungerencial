-- D17.UI.6 — Habilita anexos para Operações Financeiras
-- 1) Amplia allowlist de entidade_tipo
ALTER TABLE public.anexos DROP CONSTRAINT IF EXISTS anexos_entidade_tipo_check;
ALTER TABLE public.anexos ADD CONSTRAINT anexos_entidade_tipo_check
  CHECK (entidade_tipo = ANY (ARRAY[
    'clientes','fornecedores','contratos','aditivos','propostas','pedidos_venda',
    'projetos_contrato','obras','titulos_financeiros','parcelas_financeiras',
    'movimentacoes_financeiras','boletos','adiantamentos','rescisoes_contrato',
    'extrato_banco','workflow_aprovacoes','estoque_movimentos','estoque_reservas',
    'estoque_entregas','ordens_compra','cotacoes_compra','solicitacoes_material',
    'financiamentos','produtos','leads','tarefas',
    'operacoes_financeiras','operacoes_financeiras_parcelas'
  ]));

-- 2) Adiciona branches no helper RLS (não enfraquece — exige permissão financeira)
CREATE OR REPLACE FUNCTION public.pode_acessar_entidade(_tipo text, _id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF public.is_admin(v_uid) THEN RETURN true; END IF;

  CASE _tipo
    WHEN 'clientes' THEN
      RETURN EXISTS (SELECT 1 FROM public.clientes WHERE id = _id AND consultor_id = v_uid);
    WHEN 'contratos' THEN
      RETURN EXISTS (SELECT 1 FROM public.contratos WHERE id = _id AND consultor_id = v_uid);
    WHEN 'pedidos_venda' THEN
      RETURN EXISTS (SELECT 1 FROM public.pedidos_venda WHERE id = _id AND consultor_id = v_uid);
    WHEN 'titulos_financeiros' THEN
      RETURN EXISTS (SELECT 1 FROM public.titulos_financeiros WHERE id = _id AND consultor_id = v_uid);
    WHEN 'obras' THEN
      RETURN EXISTS (SELECT 1 FROM public.obras WHERE id = _id AND consultor_id = v_uid);
    WHEN 'workflow_aprovacoes' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.workflow_aprovacoes wa
        WHERE wa.id = _id AND (wa.solicitante_id = v_uid OR wa.aprovador_id = v_uid)
      );
    WHEN 'estoque_movimentos' THEN
      RETURN public.has_permission(v_uid, 'estoque.comprar'::app_permission);
    WHEN 'financiamentos' THEN
      RETURN EXISTS (SELECT 1 FROM public.contratos WHERE id = _id AND consultor_id = v_uid);
    -- D17.UI.6 — Operações Financeiras (anexos)
    WHEN 'operacoes_financeiras' THEN
      RETURN public.has_permission(v_uid, 'operacao_financeira.visualizar'::app_permission);
    WHEN 'operacoes_financeiras_parcelas' THEN
      RETURN public.has_permission(v_uid, 'operacao_financeira.visualizar'::app_permission);
    ELSE
      RETURN false;
  END CASE;
END;
$function$;