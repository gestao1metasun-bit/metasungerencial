
-- ============================================================
-- D21 — Pedido de Compra → Conta a Pagar (modelo híbrido manual)
-- ============================================================

-- 1) Ampliar CHECK de origem_tipo em titulos_financeiros
ALTER TABLE public.titulos_financeiros DROP CONSTRAINT IF EXISTS titulos_financeiros_origem_tipo_check;
ALTER TABLE public.titulos_financeiros ADD CONSTRAINT titulos_financeiros_origem_tipo_check
  CHECK (origem_tipo = ANY (ARRAY[
    'contrato','projeto','pedido_venda','obra','cliente','fornecedor',
    'aditivo','estoque','manual_controlado','renegociacao',
    'OPERACAO_FINANCEIRA','pedido_compra'
  ]));

-- 2) Vínculo Pedido → Título AP
ALTER TABLE public.suprimentos_pedidos_compra
  ADD COLUMN IF NOT EXISTS titulo_ap_id uuid REFERENCES public.titulos_financeiros(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sup_pedidos_titulo_ap
  ON public.suprimentos_pedidos_compra(titulo_ap_id)
  WHERE titulo_ap_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tf_pedido_compra
  ON public.titulos_financeiros(origem_id)
  WHERE origem_tipo = 'pedido_compra';

-- 3) Permissão dedicada
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'suprimentos.pedido.gerar_titulo_ap';
