-- ============================================================
-- Bucket privado para anexos financeiros
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anexos-titulos',
  'anexos-titulos',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf','image/png','image/jpeg','image/webp','application/xml','text/xml']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Tabela: metadados dos anexos
-- ============================================================
CREATE TABLE public.anexos_titulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo_id TEXT NOT NULL,         -- ID do título (ainda em localStorage)
  storage_path TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  mime TEXT NOT NULL,
  tamanho BIGINT NOT NULL CHECK (tamanho >= 0 AND tamanho <= 10485760),
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX anexos_titulos_titulo_idx ON public.anexos_titulos (titulo_id);
CREATE INDEX anexos_titulos_owner_idx ON public.anexos_titulos (owner_id);

ALTER TABLE public.anexos_titulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anexos_titulos_select_own_or_admin" ON public.anexos_titulos
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "anexos_titulos_insert_own" ON public.anexos_titulos
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "anexos_titulos_delete_own_or_admin" ON public.anexos_titulos
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()));
-- update bloqueado (metadados são imutáveis; troca = re-upload)

-- ============================================================
-- Tabela: auditoria de ações sobre anexos
-- ============================================================
CREATE TABLE public.anexos_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id UUID,                   -- pode ser NULL se o anexo foi excluído depois
  titulo_id TEXT,
  acao TEXT NOT NULL CHECK (acao IN ('UPLOAD','DOWNLOAD','DELETE')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  ip TEXT,
  user_agent TEXT,
  nome TEXT,
  tamanho BIGINT,
  detalhe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX anexos_audit_anexo_idx ON public.anexos_audit (anexo_id);
CREATE INDEX anexos_audit_titulo_idx ON public.anexos_audit (titulo_id);
CREATE INDEX anexos_audit_user_idx ON public.anexos_audit (user_id);
CREATE INDEX anexos_audit_created_idx ON public.anexos_audit (created_at DESC);

ALTER TABLE public.anexos_audit ENABLE ROW LEVEL SECURITY;

-- Leitura: dono da ação OU admin
CREATE POLICY "anexos_audit_select_own_or_admin" ON public.anexos_audit
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
-- Sem políticas de INSERT/UPDATE/DELETE para 'authenticated':
-- o registro acontece via supabaseAdmin no servidor (bypassa RLS),
-- garantindo imutabilidade pelo lado do cliente.

-- ============================================================
-- Políticas do Storage no bucket privado anexos-titulos
-- Caminho convencionado: {user_id}/{titulo_id}/{filename}
-- ============================================================

-- SELECT (download via signed URL ou listagem)
CREATE POLICY "anexos_titulos_storage_select_own_or_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'anexos-titulos'
  AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- INSERT (upload)
CREATE POLICY "anexos_titulos_storage_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'anexos-titulos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE
CREATE POLICY "anexos_titulos_storage_delete_own_or_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'anexos-titulos'
  AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);