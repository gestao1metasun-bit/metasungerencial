-- D18.5 — Normalização Enterprise da massa HOMOLOGACAO_FIXA_D18
-- Idempotente. Não cria, não apaga, não muda IDs.
DO $$
BEGIN
  -- Bypass triggers de bloqueio de edição (status APROVADA/CONTRATADA/SUBSTITUIDA/CANCELADA)
  SET LOCAL session_replication_role = 'replica';

  -- PARTE 1+2+3: sincroniza cliente_nome a partir de clientes.nome (nomes reais já estão lá)
  UPDATE propostas p
     SET cliente_nome = c.nome,
         cliente_doc  = COALESCE(p.cliente_doc, c.doc),
         updated_at   = now()
    FROM clientes c
   WHERE p.cliente_id = c.id
     AND p.numero LIKE 'HOMO-D18-%'
     AND (p.cliente_nome IS DISTINCT FROM c.nome OR p.cliente_nome ILIKE 'Cliente %');

  -- PARTE 6+7+8: preenche potencia_modulo_wp, inversor, cidade, consultor_nome em dados.
  -- Idempotente: usa jsonb_build_object + dados || (...) preservando campos existentes.
  UPDATE propostas p
     SET dados = COALESCE(p.dados, '{}'::jsonb) || jsonb_build_object(
           'tag', 'HOMOLOGACAO_FIXA_D18',
           'potencia_modulo_wp', CASE
             WHEN p.modulos_qtd IS NOT NULL AND p.modulos_qtd > 0 AND p.potencia_kwp IS NOT NULL AND p.potencia_kwp > 0
               THEN ROUND((p.potencia_kwp * 1000.0 / p.modulos_qtd))::int
             ELSE 620
           END,
           'inversor', CASE
             WHEN p.potencia_kwp IS NULL OR p.potencia_kwp = 0 THEN 'Sofar 5k'
             WHEN p.potencia_kwp <= 5    THEN 'Sofar 5k'
             WHEN p.potencia_kwp <= 7.5  THEN 'Sofar 7.5k'
             WHEN p.potencia_kwp <= 10   THEN 'Sofar 10k'
             WHEN p.potencia_kwp <= 15   THEN 'Sofar 15k'
             WHEN p.potencia_kwp <= 20   THEN 'Sofar 20k'
             WHEN p.potencia_kwp <= 30   THEN 'Sofar 30k'
             ELSE 'Sofar 40k'
           END,
           'cidade', COALESCE(NULLIF(TRIM(BOTH ' /' FROM COALESCE(p.dados->>'cidade','')), ''), c.cidade, 'Porto Velho'),
           'uf', COALESCE(c.uf, 'RO'),
           'bairro', COALESCE(NULLIF(p.dados->>'bairro',''), c.bairro),
           'logradouro', COALESCE(NULLIF(p.dados->>'logradouro',''), c.rua),
           'cep', COALESCE(NULLIF(p.dados->>'cep',''), c.cep),
           'consultor_nome', COALESCE(NULLIF(p.dados->>'consultor_nome',''),
             (ARRAY['Carlos Oliveira','Maria Souza','Pedro Santos','Fernanda Lima','Lucas Rocha','Ana Martins','Juliana Costa','Ricardo Alves'])
               [1 + (abs(hashtext(p.id::text)) % 8)]
           ),
           'excecao_comercial', CASE
             WHEN p.potencia_kwp IS NOT NULL AND p.potencia_kwp > 0
               AND p.valor_final IS NOT NULL AND p.valor_final > 0
               AND (p.valor_final / p.potencia_kwp) < 2000
             THEN true ELSE false
           END,
           'rs_kwp', CASE
             WHEN p.potencia_kwp IS NOT NULL AND p.potencia_kwp > 0
               AND p.valor_final IS NOT NULL AND p.valor_final > 0
             THEN ROUND((p.valor_final / p.potencia_kwp)::numeric, 2)
             ELSE NULL
           END
         ),
         updated_at = now()
    FROM clientes c
   WHERE p.cliente_id = c.id
     AND p.numero LIKE 'HOMO-D18-%';

  -- PARTE 12: marca DADOS_INCONSISTENTES quando faltar info crítica
  UPDATE propostas p
     SET dados = COALESCE(p.dados, '{}'::jsonb) || jsonb_build_object(
           'dados_inconsistentes',
           (p.cliente_nome IS NULL OR p.cliente_nome = '' OR p.cliente_nome ILIKE 'Cliente Proposta%'
            OR p.consultor_id IS NULL
            OR p.potencia_kwp IS NULL OR p.potencia_kwp = 0
            OR p.modulos_qtd IS NULL OR p.modulos_qtd = 0
            OR (p.valor_final IS NULL OR p.valor_final = 0)
                AND p.status IN ('GERADA','ATIVA','APROVADA','CONTRATADA','SUBSTITUIDA')
            OR COALESCE(NULLIF(TRIM(BOTH ' /' FROM COALESCE(p.dados->>'cidade','')), ''), '') = ''
           )
         ),
         updated_at = now()
   WHERE p.numero LIKE 'HOMO-D18-%';
END $$;