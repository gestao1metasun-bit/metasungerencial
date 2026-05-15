-- ============================================================
-- ETAPA 1+2+3+4: Base de cidades, concessionárias e tarifas
-- ============================================================

-- Enum de papéis (se ainda não existir)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin_master', 'admin_geral', 'usuario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de papéis (separada do profile por segurança)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para checar papel sem recursão de RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin_master', 'admin_geral')
  )
$$;

-- Trigger genérico de updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.data_ultima_atualizacao = now(); RETURN NEW; END $$;

-- ============================================================
-- ETAPA 2: concessionarias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.concessionarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  uf char(2) NOT NULL,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  data_ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nome, uf)
);
ALTER TABLE public.concessionarias ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_concessionarias_uf ON public.concessionarias(uf) WHERE ativo;

CREATE TRIGGER tg_concessionarias_updated
BEFORE UPDATE ON public.concessionarias
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- ETAPA 1: cidades_irradiacao
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cidades_irradiacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_ibge text UNIQUE,
  cidade text NOT NULL,
  uf char(2) NOT NULL,
  latitude numeric(10,6),
  longitude numeric(10,6),
  concessionaria_id uuid REFERENCES public.concessionarias(id) ON DELETE SET NULL,
  concessionaria_nome text,
  pvout_janeiro numeric(6,2),
  pvout_fevereiro numeric(6,2),
  pvout_marco numeric(6,2),
  pvout_abril numeric(6,2),
  pvout_maio numeric(6,2),
  pvout_junho numeric(6,2),
  pvout_julho numeric(6,2),
  pvout_agosto numeric(6,2),
  pvout_setembro numeric(6,2),
  pvout_outubro numeric(6,2),
  pvout_novembro numeric(6,2),
  pvout_dezembro numeric(6,2),
  pvout_medio_mensal numeric(6,2),
  pvout_maximo numeric(6,2),
  mes_pvout_maximo smallint,
  pvout_minimo numeric(6,2),
  mes_pvout_minimo smallint,
  fonte_dados text DEFAULT 'Global Solar Atlas',
  data_ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ativo boolean NOT NULL DEFAULT true,
  UNIQUE (cidade, uf)
);
ALTER TABLE public.cidades_irradiacao ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cidades_uf ON public.cidades_irradiacao(uf) WHERE ativo;
CREATE INDEX IF NOT EXISTS idx_cidades_busca ON public.cidades_irradiacao(cidade, uf) WHERE ativo;

CREATE TRIGGER tg_cidades_updated
BEFORE UPDATE ON public.cidades_irradiacao
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- ETAPA 3: tarifas_energia
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tarifas_energia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concessionaria_id uuid REFERENCES public.concessionarias(id) ON DELETE CASCADE,
  concessionaria_nome text NOT NULL,
  cidade text,
  uf char(2) NOT NULL,
  grupo_tarifario text NOT NULL DEFAULT 'B',
  modalidade_tarifaria text NOT NULL DEFAULT 'Convencional',
  subgrupo text DEFAULT 'B1',
  tarifa_kwh numeric(8,4) NOT NULL,
  data_ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ativo boolean NOT NULL DEFAULT true
);
ALTER TABLE public.tarifas_energia ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tarifas_busca
  ON public.tarifas_energia(concessionaria_id, uf, grupo_tarifario, modalidade_tarifaria) WHERE ativo;

CREATE TRIGGER tg_tarifas_updated
BEFORE UPDATE ON public.tarifas_energia
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- RLS POLICIES — leitura para qualquer logado, escrita só admin
-- ============================================================

-- user_roles: cada um vê os próprios papéis; só admin gerencia
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- concessionarias
CREATE POLICY "concessionarias_select_auth" ON public.concessionarias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "concessionarias_admin_write" ON public.concessionarias
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- cidades_irradiacao
CREATE POLICY "cidades_select_auth" ON public.cidades_irradiacao
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cidades_admin_write" ON public.cidades_irradiacao
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- tarifas_energia
CREATE POLICY "tarifas_select_auth" ON public.tarifas_energia
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "tarifas_admin_write" ON public.tarifas_energia
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));