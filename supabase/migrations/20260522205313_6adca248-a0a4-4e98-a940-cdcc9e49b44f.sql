
-- ============================================================
-- FASE 2 — System flags (modo manutenção)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_flags (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'false'::jsonb,
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_flags_select_auth"
  ON public.system_flags FOR SELECT TO authenticated USING (true);

CREATE POLICY "system_flags_admin_write"
  ON public.system_flags FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.system_flags (key, value, description)
VALUES
  ('maintenance', 'false'::jsonb, 'Modo manutenção: bloqueia escritas para não-admin')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- FASE 6 — Feature flags
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  scope text NOT NULL DEFAULT 'global',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ff_select_auth"
  ON public.feature_flags FOR SELECT TO authenticated USING (true);

CREATE POLICY "ff_admin_write"
  ON public.feature_flags FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- FASE 5 — Tarefas e automações operacionais
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  modulo text NOT NULL,
  prioridade text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'pendente',
  due_date date,
  assigned_to uuid,
  sector text,
  related_entity text,
  related_id uuid,
  created_by uuid,
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tarefas_assigned ON public.tarefas (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tarefas_modulo ON public.tarefas (modulo, status);
CREATE INDEX IF NOT EXISTS idx_tarefas_related ON public.tarefas (related_entity, related_id);

-- evita duplicar tarefas automáticas
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tarefas_auto
  ON public.tarefas (origem, related_entity, related_id, titulo)
  WHERE origem <> 'manual' AND status <> 'concluida';

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tarefas_select_own_or_admin"
  ON public.tarefas FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tarefas_insert_auth"
  ON public.tarefas FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "tarefas_update_own_or_admin"
  ON public.tarefas FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tarefas_delete_admin"
  ON public.tarefas FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER tg_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- Geradores automáticos
CREATE OR REPLACE FUNCTION public.gerar_tarefas_automaticas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obras int := 0;
  v_contratos int := 0;
BEGIN
  -- Obras atrasadas
  INSERT INTO public.tarefas (titulo, descricao, modulo, prioridade, due_date, assigned_to, related_entity, related_id, origem, created_by)
  SELECT
    'Obra atrasada: ' || COALESCE(o.codigo, o.id::text),
    'A obra está com data de finalização ultrapassada.',
    'engenharia',
    'alta',
    o.data_finalizacao,
    o.consultor_id,
    'obras',
    o.id,
    'auto_obra_atrasada',
    NULL
  FROM public.obras o
  WHERE o.deleted_at IS NULL
    AND o.data_finalizacao IS NOT NULL
    AND o.data_finalizacao < current_date
    AND o.status NOT IN ('Finalizada', 'Cancelada')
    AND NOT EXISTS (
      SELECT 1 FROM public.tarefas t
      WHERE t.origem = 'auto_obra_atrasada'
        AND t.related_entity = 'obras'
        AND t.related_id = o.id
        AND t.status <> 'concluida'
    );
  GET DIAGNOSTICS v_obras = ROW_COUNT;

  -- Contratos assinados sem obra
  INSERT INTO public.tarefas (titulo, descricao, modulo, prioridade, assigned_to, related_entity, related_id, origem, created_by)
  SELECT
    'Contrato assinado sem obra: ' || COALESCE(c.codigo, c.id::text),
    'Contrato está assinado mas nenhuma obra foi criada.',
    'engenharia',
    'media',
    c.consultor_id,
    'contratos',
    c.id,
    'auto_contrato_sem_obra',
    NULL
  FROM public.contratos c
  WHERE c.deleted_at IS NULL
    AND c.status = 'Assinado'
    AND NOT EXISTS (
      SELECT 1 FROM public.obras o
      WHERE o.contrato_id = c.id AND o.deleted_at IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.tarefas t
      WHERE t.origem = 'auto_contrato_sem_obra'
        AND t.related_entity = 'contratos'
        AND t.related_id = c.id
        AND t.status <> 'concluida'
    );
  GET DIAGNOSTICS v_contratos = ROW_COUNT;

  RETURN jsonb_build_object(
    'obras_atrasadas', v_obras,
    'contratos_sem_obra', v_contratos
  );
END $$;
