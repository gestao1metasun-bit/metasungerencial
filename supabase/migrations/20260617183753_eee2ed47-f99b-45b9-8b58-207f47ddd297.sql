SET LOCAL session_replication_role = 'replica';

WITH base AS (
  SELECT id, row_number() OVER (ORDER BY codigo) AS rn
    FROM comercial_comissoes WHERE codigo LIKE 'HOMO-D18%'
)
UPDATE comercial_comissoes cc SET
  vendedor_nome = (ARRAY['Carlos Oliveira','Maria Souza','Pedro Santos','Fernanda Lima','Lucas Rocha','Ana Martins','Juliana Costa','Ricardo Alves'])[ ((b.rn-1)%8)+1 ],
  beneficiario_nome = (ARRAY['Carlos Oliveira','Maria Souza','Pedro Santos','Fernanda Lima','Lucas Rocha','Ana Martins','Juliana Costa','Ricardo Alves'])[ ((b.rn-1)%8)+1 ],
  percentual = (ARRAY[2.0,2.5,3.0,3.5,4.0])[ ((b.rn-1)%5)+1 ],
  valor_base = (ARRAY[24990,31500,42800,58900,79200,115000])[ ((b.rn-1)%6)+1 ],
  valor_calculado = round(((ARRAY[24990,31500,42800,58900,79200,115000])[ ((b.rn-1)%6)+1 ]
                  * (ARRAY[2.0,2.5,3.0,3.5,4.0])[ ((b.rn-1)%5)+1 ] / 100.0)::numeric, 2),
  observacao = 'Comissão homologação - ' ||
    (ARRAY['Venda residencial','Venda comercial','Venda rural','Venda industrial','Indicação parceira'])[ ((b.rn-1)%5)+1 ]
FROM base b WHERE cc.id = b.id;

-- ANEXOS (sem bypass)
WITH base AS (
  SELECT id, categoria, row_number() OVER (PARTITION BY categoria ORDER BY id) AS rn
    FROM anexos WHERE observacao LIKE '%HOMOLOGACAO_FIXA_D18%'
)
UPDATE anexos a SET nome = CASE b.categoria
  WHEN 'documento_cliente' THEN (ARRAY['RG_Frente.jpg','CNH_Cliente.pdf','Comprovante Endereco.pdf','Contrato Social.pdf','Cartao CNPJ.pdf'])[ ((b.rn-1)%5)+1 ]
  WHEN 'contrato' THEN 'Contrato Assinado v' || ((b.rn%3)+1)::text || '.pdf'
  WHEN 'proposta' THEN 'Proposta Comercial v' || ((b.rn%2)+1)::text || '.pdf'
  WHEN 'projeto' THEN (ARRAY['ART Projeto.pdf','Memorial Tecnico.pdf','Projeto Executivo.pdf','Diagrama Unifilar.pdf','Foto Padrao Entrada.jpg'])[ ((b.rn-1)%5)+1 ]
  WHEN 'aditivo' THEN 'Termo Aditivo.pdf'
  WHEN 'comissao' THEN 'Demonstrativo Comissao.pdf'
  ELSE 'Documento Anexo ' || b.rn::text || '.pdf'
END
FROM base b WHERE a.id = b.id;
