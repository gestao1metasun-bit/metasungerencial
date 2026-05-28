
CREATE TABLE IF NOT EXISTS public.recorrentes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('Entrada','Saída')),
  valor numeric(14,2) NOT NULL CHECK (valor >= 0),
  periodicidade text NOT NULL DEFAULT 'Mensal' CHECK (periodicidade IN ('Mensal','Bimestral','Trimestral','Semestral','Anual')),
  dia_vencimento int NOT NULL DEFAULT 1 CHECK (dia_vencimento BETWEEN 1 AND 31),
  proximo_vencimento date,
  natureza_id uuid REFERENCES public.naturezas_financeiras(id),
  centro_resultado_id uuid REFERENCES public.centros_resultado(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  cliente_id uuid REFERENCES public.clientes(id),
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  row_version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorrentes_financeiras TO authenticated;
GRANT ALL ON public.recorrentes_financeiras TO service_role;

ALTER TABLE public.recorrentes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recorrentes_select" ON public.recorrentes_financeiras
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'financeiro.visualizar'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "recorrentes_insert" ON public.recorrentes_financeiras
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'financeiro.editar'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "recorrentes_update" ON public.recorrentes_financeiras
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'financeiro.editar'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "recorrentes_delete" ON public.recorrentes_financeiras
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE TRIGGER trg_recorrentes_updated_at
  BEFORE UPDATE ON public.recorrentes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_recorrentes_row_version
  BEFORE UPDATE ON public.recorrentes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();

CREATE INDEX IF NOT EXISTS idx_recorrentes_ativo ON public.recorrentes_financeiras(ativo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recorrentes_proximo ON public.recorrentes_financeiras(proximo_vencimento) WHERE deleted_at IS NULL AND ativo = true;
