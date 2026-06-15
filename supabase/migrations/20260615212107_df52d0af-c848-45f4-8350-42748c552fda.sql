
CREATE OR REPLACE FUNCTION public.rpc_cliente_buscar_similar(
  p_doc text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_nome text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  nome text,
  doc text,
  email text,
  telefone text,
  tipo_pessoa text,
  status text,
  score int,
  motivo text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_norm text := NULLIF(public.normalize_doc(p_doc), '');
  v_email text := lower(NULLIF(btrim(p_email), ''));
  v_tel text := regexp_replace(COALESCE(p_telefone,''), '\D', '', 'g');
  v_nome text := lower(NULLIF(btrim(p_nome), ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.id, c.nome, c.doc, c.email, c.telefone, c.tipo_pessoa, c.status,
      (CASE WHEN v_doc_norm IS NOT NULL AND public.normalize_doc(c.doc) = v_doc_norm THEN 100 ELSE 0 END
        + CASE WHEN v_email IS NOT NULL AND lower(c.email) = v_email THEN 60 ELSE 0 END
        + CASE WHEN v_tel <> '' AND regexp_replace(COALESCE(c.telefone,''), '\D', '', 'g') = v_tel THEN 40 ELSE 0 END
        + CASE WHEN v_tel <> '' AND regexp_replace(COALESCE(c.telefone2,''), '\D', '', 'g') = v_tel THEN 40 ELSE 0 END
        + CASE WHEN v_nome IS NOT NULL AND lower(c.nome) = v_nome THEN 30
               WHEN v_nome IS NOT NULL AND lower(c.nome) LIKE v_nome || '%' THEN 15
               WHEN v_nome IS NOT NULL AND position(v_nome in lower(c.nome)) > 0 THEN 8
               ELSE 0 END
      )::int AS score
    FROM public.clientes c
    WHERE c.deleted_at IS NULL
  )
  SELECT b.id, b.nome, b.doc, b.email, b.telefone, b.tipo_pessoa, b.status, b.score,
    CASE
      WHEN v_doc_norm IS NOT NULL AND public.normalize_doc(b.doc) = v_doc_norm THEN 'documento'
      WHEN v_email IS NOT NULL AND lower(b.email) = v_email THEN 'email'
      WHEN v_tel <> '' THEN 'telefone'
      ELSE 'nome'
    END AS motivo
  FROM base b
  WHERE b.score >= 30
  ORDER BY b.score DESC, b.nome ASC
  LIMIT 25;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cliente_buscar_similar(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_cliente_buscar_similar(text, text, text, text) TO authenticated;
