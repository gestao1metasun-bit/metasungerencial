-- =========================================================
-- Sprint A — Migração Clientes, Contratos, Projetos, Obras
-- =========================================================

-- 1) PROFILES (vincula auth.users a metadados do consultor)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  cargo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all_auth" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_admin_write" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Trigger: cria profile automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.tg_handle_new_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.tg_handle_new_user_profile();

-- Trigger genérico de updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at_generic()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- =========================================================
-- 2) CLIENTES
-- =========================================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  doc TEXT,
  telefone TEXT,
  telefone2 TEXT,
  email TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  bairro TEXT,
  complemento TEXT,
  cidade TEXT,
  uf TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX clientes_doc_unique ON public.clientes (doc) WHERE doc IS NOT NULL AND doc <> '';
CREATE INDEX clientes_consultor_idx ON public.clientes (consultor_id);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select_own_or_admin" ON public.clientes
  FOR SELECT TO authenticated
  USING (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "clientes_insert_auth" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "clientes_update_own_or_admin" ON public.clientes
  FOR UPDATE TO authenticated
  USING (consultor_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "clientes_delete_admin" ON public.clientes
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_clientes_updated
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- =========================================================
-- 3) CONTRATOS
-- =========================================================
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  consultor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Rascunho',
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_entrada NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_assinatura DATE,
  data_inicio DATE,
  data_fim DATE,
  potencia_kwp NUMERIC(10,3),
  modulos_qtde INT,
  inversor TEXT,
  forma_pagamento TEXT,
  observacoes TEXT,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contratos_cliente_idx ON public.contratos (cliente_id);
CREATE INDEX contratos_consultor_idx ON public.contratos (consultor_id);
CREATE INDEX contratos_status_idx ON public.contratos (status);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contratos_select_own_or_admin" ON public.contratos
  FOR SELECT TO authenticated
  USING (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "contratos_insert_auth" ON public.contratos
  FOR INSERT TO authenticated
  WITH CHECK (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "contratos_update_own_or_admin" ON public.contratos
  FOR UPDATE TO authenticated
  USING (consultor_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "contratos_delete_admin" ON public.contratos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_contratos_updated
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- =========================================================
-- 4) PROJETOS (propostas/engenharia)
-- =========================================================
CREATE TABLE public.projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  consultor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'Proposta',
  status TEXT NOT NULL DEFAULT 'Rascunho',
  potencia_kwp NUMERIC(10,3),
  modulos_qtde INT,
  inversor TEXT,
  cidade TEXT,
  uf TEXT,
  valor_estimado NUMERIC(14,2),
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX projetos_cliente_idx ON public.projetos (cliente_id);
CREATE INDEX projetos_contrato_idx ON public.projetos (contrato_id);
CREATE INDEX projetos_consultor_idx ON public.projetos (consultor_id);

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projetos_select_own_or_admin" ON public.projetos
  FOR SELECT TO authenticated
  USING (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "projetos_insert_auth" ON public.projetos
  FOR INSERT TO authenticated
  WITH CHECK (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "projetos_update_own_or_admin" ON public.projetos
  FOR UPDATE TO authenticated
  USING (consultor_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "projetos_delete_admin" ON public.projetos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_projetos_updated
  BEFORE UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- =========================================================
-- 5) OBRAS (engenharia/execução)
-- =========================================================
CREATE TABLE public.obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  consultor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Planejada',
  modulos_qtde INT,
  potencia_kwp NUMERIC(10,3),
  inversor TEXT,
  inv2 TEXT,
  inv3 TEXT,
  telhado_tipo TEXT,
  equipe TEXT,
  tipo TEXT,
  data_inicio DATE,
  data_finalizacao DATE,
  observacoes TEXT,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX obras_contrato_idx ON public.obras (contrato_id);
CREATE INDEX obras_cliente_idx ON public.obras (cliente_id);
CREATE INDEX obras_consultor_idx ON public.obras (consultor_id);
CREATE INDEX obras_status_idx ON public.obras (status);

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obras_select_own_or_admin" ON public.obras
  FOR SELECT TO authenticated
  USING (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "obras_insert_auth" ON public.obras
  FOR INSERT TO authenticated
  WITH CHECK (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "obras_update_own_or_admin" ON public.obras
  FOR UPDATE TO authenticated
  USING (consultor_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (consultor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "obras_delete_admin" ON public.obras
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_obras_updated
  BEFORE UPDATE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- =========================================================
-- 6) ADITIVOS DE CONTRATO
-- =========================================================
CREATE TABLE public.aditivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  consultor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  numero INT NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL DEFAULT 'Valor',
  descricao TEXT,
  valor_delta NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente',
  data_evento DATE,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX aditivos_contrato_idx ON public.aditivos (contrato_id);
CREATE INDEX aditivos_consultor_idx ON public.aditivos (consultor_id);

ALTER TABLE public.aditivos ENABLE ROW LEVEL SECURITY;

-- Aditivos herdam visibilidade do contrato pai
CREATE POLICY "aditivos_select_via_contrato" ON public.aditivos
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.contratos c
      WHERE c.id = aditivos.contrato_id AND c.consultor_id = auth.uid()
    )
  );
CREATE POLICY "aditivos_insert_via_contrato" ON public.aditivos
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.contratos c
      WHERE c.id = aditivos.contrato_id AND c.consultor_id = auth.uid()
    )
  );
CREATE POLICY "aditivos_update_via_contrato" ON public.aditivos
  FOR UPDATE TO authenticated USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.contratos c
      WHERE c.id = aditivos.contrato_id AND c.consultor_id = auth.uid()
    )
  );
CREATE POLICY "aditivos_delete_admin" ON public.aditivos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_aditivos_updated
  BEFORE UPDATE ON public.aditivos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();