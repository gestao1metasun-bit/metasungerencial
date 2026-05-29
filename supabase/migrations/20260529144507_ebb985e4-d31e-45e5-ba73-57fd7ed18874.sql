
-- D18.5 — Engenharia Contábil-Ready

-- PROJETOS
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS centro_resultado_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS natureza_operacional text,
  ADD COLUMN IF NOT EXISTS competencia date,
  ADD COLUMN IF NOT EXISTS status_contabil text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS codigo_externo text,
  ADD COLUMN IF NOT EXISTS sistema_destino text,
  ADD COLUMN IF NOT EXISTS status_integracao text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_integracao timestamptz,
  ADD COLUMN IF NOT EXISTS hash_integracao text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projetos_status_integracao_chk') THEN
    ALTER TABLE public.projetos ADD CONSTRAINT projetos_status_integracao_chk
      CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projetos_status_contabil_chk') THEN
    ALTER TABLE public.projetos ADD CONSTRAINT projetos_status_contabil_chk
      CHECK (status_contabil IN ('PENDENTE','CLASSIFICADO','CONCILIADO','BLOQUEADO','IGNORADO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projetos_centro_resultado ON public.projetos(centro_resultado_id);
CREATE INDEX IF NOT EXISTS idx_projetos_competencia ON public.projetos(competencia);
CREATE INDEX IF NOT EXISTS idx_projetos_status_integracao ON public.projetos(status_integracao);

-- OBRAS
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS competencia date,
  ADD COLUMN IF NOT EXISTS status_contabil text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS conta_contabil_referencia text,
  ADD COLUMN IF NOT EXISTS natureza_operacional text,
  ADD COLUMN IF NOT EXISTS codigo_externo text,
  ADD COLUMN IF NOT EXISTS sistema_destino text,
  ADD COLUMN IF NOT EXISTS status_integracao text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_integracao timestamptz,
  ADD COLUMN IF NOT EXISTS hash_integracao text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='obras_status_integracao_chk') THEN
    ALTER TABLE public.obras ADD CONSTRAINT obras_status_integracao_chk
      CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='obras_status_contabil_chk') THEN
    ALTER TABLE public.obras ADD CONSTRAINT obras_status_contabil_chk
      CHECK (status_contabil IN ('PENDENTE','CLASSIFICADO','CONCILIADO','BLOQUEADO','IGNORADO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_obras_competencia ON public.obras(competencia);
CREATE INDEX IF NOT EXISTS idx_obras_status_integracao ON public.obras(status_integracao);

-- ESTOQUE_MOVIMENTOS — índices p/ rastreabilidade Obra→Projeto→CC
CREATE INDEX IF NOT EXISTS idx_estmov_obra_projeto ON public.estoque_movimentos(obra_id, projeto_id);
CREATE INDEX IF NOT EXISTS idx_estmov_cr_cc ON public.estoque_movimentos(centro_resultado_id, centro_custo_id);

-- ENGENHARIA EVENTOS CATÁLOGO
CREATE TABLE IF NOT EXISTS public.engenharia_eventos_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text NOT NULL,
  evento_canonico text NOT NULL,
  natureza_default text,
  centro_resultado_default_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.engenharia_eventos_catalogo TO authenticated;
GRANT ALL ON public.engenharia_eventos_catalogo TO service_role;
ALTER TABLE public.engenharia_eventos_catalogo ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='engenharia_eventos_catalogo' AND policyname='eng_eventos_select_auth') THEN
    CREATE POLICY eng_eventos_select_auth ON public.engenharia_eventos_catalogo
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='engenharia_eventos_catalogo' AND policyname='eng_eventos_write_admin') THEN
    CREATE POLICY eng_eventos_write_admin ON public.engenharia_eventos_catalogo
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role));
  END IF;
END $$;

INSERT INTO public.engenharia_eventos_catalogo (codigo, descricao, evento_canonico) VALUES
  ('PROJETO_CRIADO','Projeto técnico criado','PROJETO_CRIADO'),
  ('PROJETO_APROVADO','Projeto técnico aprovado','PROJETO_APROVADO'),
  ('OBRA_INICIADA','Obra iniciada em campo','OBRA_INICIADA'),
  ('CONSUMO_MATERIAL','Material consumido na obra','CONSUMO_OBRA'),
  ('OBRA_FINALIZADA','Obra finalizada','OBRA_FINALIZADA'),
  ('RETORNO_MATERIAL','Material retornado ao estoque','RETORNO_OBRA'),
  ('AJUSTE_ENGENHARIA','Ajuste técnico de engenharia','AJUSTE_ENGENHARIA')
ON CONFLICT (codigo) DO NOTHING;

-- EQUIPES ENGENHARIA
CREATE TABLE IF NOT EXISTS public.equipes_engenharia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  lider text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  centro_resultado_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  codigo_externo text,
  sistema_destino text,
  status_integracao text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipes_engenharia TO authenticated;
GRANT ALL ON public.equipes_engenharia TO service_role;
ALTER TABLE public.equipes_engenharia ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipes_engenharia' AND policyname='equipes_eng_select_auth') THEN
    CREATE POLICY equipes_eng_select_auth ON public.equipes_engenharia
      FOR SELECT TO authenticated USING (deleted_at IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipes_engenharia' AND policyname='equipes_eng_write_admin') THEN
    CREATE POLICY equipes_eng_write_admin ON public.equipes_engenharia
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role));
  END IF;
END $$;

-- INSTALADORES ENGENHARIA
CREATE TABLE IF NOT EXISTS public.instaladores_engenharia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  documento text,
  equipe_id uuid REFERENCES public.equipes_engenharia(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  codigo_externo text,
  sistema_destino text,
  status_integracao text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instaladores_engenharia TO authenticated;
GRANT ALL ON public.instaladores_engenharia TO service_role;
ALTER TABLE public.instaladores_engenharia ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instaladores_engenharia' AND policyname='instal_eng_select_auth') THEN
    CREATE POLICY instal_eng_select_auth ON public.instaladores_engenharia
      FOR SELECT TO authenticated USING (deleted_at IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instaladores_engenharia' AND policyname='instal_eng_write_admin') THEN
    CREATE POLICY instal_eng_write_admin ON public.instaladores_engenharia
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_instaladores_equipe ON public.instaladores_engenharia(equipe_id);

-- VIEW v_rentabilidade_obra (preparatória)
CREATE OR REPLACE VIEW public.v_rentabilidade_obra
WITH (security_invoker=on) AS
SELECT
  o.id AS obra_id,
  o.codigo,
  o.cliente_id,
  o.contrato_id,
  o.status,
  o.competencia,
  o.centro_resultado_id,
  o.centro_custo_id,
  COALESCE(o.custo_previsto, 0)::numeric AS custo_previsto,
  COALESCE((
    SELECT SUM(em.custo_total)
    FROM public.estoque_movimentos em
    WHERE em.obra_id = o.id
      AND em.tipo IN ('saida','baixa_entrega','entrega')
  ), 0)::numeric AS custo_realizado,
  (COALESCE(o.custo_previsto,0) - COALESCE((
    SELECT SUM(em.custo_total)
    FROM public.estoque_movimentos em
    WHERE em.obra_id = o.id
      AND em.tipo IN ('saida','baixa_entrega','entrega')
  ),0))::numeric AS saldo_operacional
FROM public.obras o
WHERE o.deleted_at IS NULL;

GRANT SELECT ON public.v_rentabilidade_obra TO authenticated;
