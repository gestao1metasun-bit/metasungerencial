
SET LOCAL session_replication_role = 'replica';

-- ============================================================
-- 1) APAGAR MASSA ANTIGA — HOMOLOGACAO_FIXA_D18
-- ============================================================
DELETE FROM public.eventos_timeline    WHERE (payload->>'tag') = 'HOMOLOGACAO_FIXA_D18';
DELETE FROM public.comercial_comissoes WHERE codigo LIKE 'HOMO-D18-%';
DELETE FROM public.aditivos            WHERE codigo LIKE 'HOMO-D18-%' OR (dados->>'tag') = 'HOMOLOGACAO_FIXA_D18';
DELETE FROM public.anexos              WHERE nome ILIKE 'HOMO-D18%' OR observacao ILIKE '%HOMOLOGACAO_FIXA_D18%';
DELETE FROM public.contrato_propostas  WHERE contrato_id IN (
  SELECT id FROM public.contratos WHERE codigo LIKE 'HOMO-D18-%' OR observacoes ILIKE '%HOMOLOGACAO_FIXA_D18%'
);
DELETE FROM public.contratos           WHERE codigo LIKE 'HOMO-D18-%' OR observacoes ILIKE '%HOMOLOGACAO_FIXA_D18%' OR (dados->>'tag') = 'HOMOLOGACAO_FIXA_D18';
DELETE FROM public.projetos            WHERE codigo LIKE 'HOMO-D18-%' OR (dados->>'tag') = 'HOMOLOGACAO_FIXA_D18';
DELETE FROM public.propostas           WHERE (dados->>'tag') = 'HOMOLOGACAO_FIXA_D18' OR (dados->>'origem') = 'HOMOLOGACAO_FIXA_D18';
DELETE FROM public.leads               WHERE origem = 'HOMOLOGACAO_FIXA_D18' OR (dados->>'tag') = 'HOMOLOGACAO_FIXA_D18';

DELETE FROM public.clientes c
WHERE c.doc LIKE '00100000%'
  AND NOT EXISTS (SELECT 1 FROM public.leads             x WHERE x.cliente_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.propostas         x WHERE x.cliente_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.contratos         x WHERE x.cliente_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.projetos          x WHERE x.cliente_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.oportunidades     x WHERE x.cliente_id = c.id);

-- ============================================================
-- 2) RECRIAR MASSA — HOMOLOGACAO_FLUXO_D18
-- ============================================================
DO $seed$
DECLARE
  v_consultor uuid := '0dad00e4-ba12-4c54-bc4c-582c4bead2eb';
  v_admin     uuid := 'a24db3c5-114f-454a-86e0-ed920020b591';

  c_joao   uuid := gen_random_uuid();
  c_maria  uuid := gen_random_uuid();
  c_merc   uuid := gen_random_uuid();
  c_farm   uuid := gen_random_uuid();
  c_posto  uuid := gen_random_uuid();
  c_auto   uuid := gen_random_uuid();
  c_carlos uuid := gen_random_uuid();
  c_patri  uuid := gen_random_uuid();

  p_joao    uuid := gen_random_uuid();
  p_maria   uuid := gen_random_uuid();
  p_merc    uuid := gen_random_uuid();
  p_farm    uuid := gen_random_uuid();
  p_posto   uuid := gen_random_uuid();
  p_auto    uuid := gen_random_uuid();
  p_carlos  uuid := gen_random_uuid();
  p_patri_1 uuid := gen_random_uuid();
  p_patri_2 uuid := gen_random_uuid();

  ct_merc  uuid := gen_random_uuid();
  ct_farm  uuid := gen_random_uuid();
  ct_posto uuid := gen_random_uuid();
  ct_auto  uuid := gen_random_uuid();

  pj_posto uuid := gen_random_uuid();
BEGIN
  -- 2.1 CLIENTES (20)
  INSERT INTO public.clientes (id, consultor_id, nome, doc, tipo_pessoa, telefone, email, cep, rua, numero, bairro, cidade, uf, status) VALUES
    (c_joao,  v_consultor, 'João Carlos Oliveira',  '11122233344', 'PF', '(62) 99100-0001', 'joao.oliveira@fluxo-d18.local',  '74000-001', 'Rua das Acácias',     '101', 'Setor Central', 'Goiânia',     'GO', 'Ativo'),
    (c_maria, v_consultor, 'Maria Fernanda Silva',  '22233344455', 'PF', '(62) 99100-0002', 'maria.silva@fluxo-d18.local',    '74000-002', 'Rua das Palmeiras',   '202', 'Setor Bueno',   'Goiânia',     'GO', 'Ativo'),
    (c_merc,  v_consultor, 'Mercado Ideal LTDA',    '12345678000101','PJ','(62) 99100-0003', 'contato@mercadoideal-d18.local', '74000-003', 'Av. Brasil',          '303', 'Centro',        'Anápolis',    'GO', 'Ativo'),
    (c_farm,  v_consultor, 'Farmácia Vida LTDA',    '23456789000102','PJ','(62) 99100-0004', 'contato@farmaciavida-d18.local', '74000-004', 'Rua Saúde',           '404', 'Vila Brasília', 'Aparecida de Goiânia','GO','Ativo'),
    (c_posto, v_consultor, 'Posto União Energia LTDA','34567890000103','PJ','(62) 99100-0005','contato@postouniao-d18.local',  '74000-005', 'BR-153 KM 5',         '505', 'Distrito Indl.','Senador Canedo','GO','Ativo'),
    (c_auto,  v_consultor, 'Auto Elétrica Norte LTDA','45678901000104','PJ','(62) 99100-0006','contato@autonorte-d18.local',   '74000-006', 'Av. Norte',           '606', 'Setor Norte',   'Goiânia',     'GO', 'Ativo'),
    (c_carlos,v_consultor, 'Carlos Henrique Souza', '33344455566', 'PF', '(62) 99100-0007', 'carlos.souza@fluxo-d18.local',   '74000-007', 'Rua dos Pinheiros',   '707', 'Jardim América','Goiânia',     'GO', 'Ativo'),
    (c_patri, v_consultor, 'Patrícia Mendes Rocha', '44455566677', 'PF', '(62) 99100-0008', 'patricia.rocha@fluxo-d18.local', '74000-008', 'Alameda dos Buritis', '808', 'Setor Oeste',   'Goiânia',     'GO', 'Ativo');

  INSERT INTO public.clientes (id, consultor_id, nome, doc, tipo_pessoa, telefone, email, cep, rua, numero, bairro, cidade, uf, status)
  SELECT gen_random_uuid(), v_consultor,
    'Cliente Fluxo D18 ' || lpad(i::text,2,'0'),
    lpad((55500000000 + i)::text, 11, '0'),
    'PF', '(62) 99200-' || lpad(i::text,4,'0'),
    'fluxo-d18-' || lpad(i::text,2,'0') || '@fluxo-d18.local',
    '74000-' || lpad((100+i)::text,3,'0'),
    'Rua Genérica', (100+i)::text, 'Setor Fluxo', 'Goiânia', 'GO', 'Ativo'
  FROM generate_series(1,12) AS i;

  -- 2.2 LEADS (20)
  INSERT INTO public.leads (id, numero, nome, telefone, doc, consumo_kwh, consultor_id, origem, status, cliente_id, dados) VALUES
    (gen_random_uuid(),'HOMO-FLUXO-D18-L-001','João Carlos Oliveira', '(62) 99100-0001','11122233344',  650, v_consultor,'HOMOLOGACAO_FLUXO_D18','CONVERTIDO',  c_joao,  jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',1)),
    (gen_random_uuid(),'HOMO-FLUXO-D18-L-002','Maria Fernanda Silva', '(62) 99100-0002','22233344455',  820, v_consultor,'HOMOLOGACAO_FLUXO_D18','COM_PROPOSTA',c_maria, jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',2)),
    (gen_random_uuid(),'HOMO-FLUXO-D18-L-003','Mercado Ideal LTDA',   '(62) 99100-0003','12345678000101',4200,v_consultor,'HOMOLOGACAO_FLUXO_D18','CONVERTIDO',  c_merc,  jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',3)),
    (gen_random_uuid(),'HOMO-FLUXO-D18-L-004','Farmácia Vida LTDA',   '(62) 99100-0004','23456789000102',1800,v_consultor,'HOMOLOGACAO_FLUXO_D18','CONVERTIDO',  c_farm,  jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',4)),
    (gen_random_uuid(),'HOMO-FLUXO-D18-L-005','Posto União Energia LTDA','(62) 99100-0005','34567890000103',9500,v_consultor,'HOMOLOGACAO_FLUXO_D18','CONVERTIDO',c_posto, jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',5)),
    (gen_random_uuid(),'HOMO-FLUXO-D18-L-006','Auto Elétrica Norte LTDA','(62) 99100-0006','45678901000104',2400,v_consultor,'HOMOLOGACAO_FLUXO_D18','CANCELADO', c_auto,  jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',6)),
    (gen_random_uuid(),'HOMO-FLUXO-D18-L-007','Carlos Henrique Souza','(62) 99100-0007','33344455566',  510, v_consultor,'HOMOLOGACAO_FLUXO_D18','CANCELADO',   c_carlos,jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',7)),
    (gen_random_uuid(),'HOMO-FLUXO-D18-L-008','Patrícia Mendes Rocha','(62) 99100-0008','44455566677',  740, v_consultor,'HOMOLOGACAO_FLUXO_D18','COM_PROPOSTA',c_patri, jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',8));

  INSERT INTO public.leads (id, numero, nome, telefone, consumo_kwh, consultor_id, origem, status, dados)
  SELECT gen_random_uuid(),
    'HOMO-FLUXO-D18-L-' || lpad((8+i)::text,3,'0'),
    'Lead Fluxo D18 ' || lpad(i::text,2,'0'),
    '(62) 99300-' || lpad(i::text,4,'0'),
    400 + i*30, v_consultor, 'HOMOLOGACAO_FLUXO_D18',
    (ARRAY['NOVO','EM_CONTATO','AGUARDANDO_CLIENTE','COM_PROPOSTA'])[1+(i%4)],
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','generico',true)
  FROM generate_series(1,12) AS i;

  -- 2.3 PROPOSTAS (30) — 9 cenário + 21 genéricas
  INSERT INTO public.propostas (id, numero, status, consultor_id, cliente_id, cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd, validade, dados)
  VALUES (p_joao,'HOMO-FLUXO-D18-P-001','GERADA',v_consultor,c_joao,'João Carlos Oliveira','11122233344',24990,6.20,10,CURRENT_DATE+45,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','cenario',1,'inversor','Sofar 5kW','potencia_modulo_wp',620,'forma_pagamento','Boleto à vista'));

  INSERT INTO public.propostas (id, numero, status, consultor_id, cliente_id, cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd, validade, data_aprovacao, dados)
  VALUES (p_maria,'HOMO-FLUXO-D18-P-002','APROVADA',v_consultor,c_maria,'Maria Fernanda Silva','22233344455',31500,9.92,16,CURRENT_DATE+45,now(),
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','cenario',2,'inversor','Sofar 7.5kW','potencia_modulo_wp',620,'forma_pagamento','Financiamento BV'));

  INSERT INTO public.propostas (id, numero, status, consultor_id, cliente_id, cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd, validade, data_aprovacao, dados)
  VALUES (p_merc,'HOMO-FLUXO-D18-P-003','CONTRATO_PENDENTE',v_consultor,c_merc,'Mercado Ideal LTDA','12345678000101',58900,22.32,36,CURRENT_DATE+45,now()-interval '5 days',
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','cenario',3,'inversor','Sofar 15kW','potencia_modulo_wp',620,'forma_pagamento','Boleto 12x'));

  INSERT INTO public.propostas (id, numero, status, consultor_id, cliente_id, cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd, validade, data_aprovacao, dados)
  VALUES (p_farm,'HOMO-FLUXO-D18-P-004','CONTRATO_PENDENTE',v_consultor,c_farm,'Farmácia Vida LTDA','23456789000102',42800,12.40,20,CURRENT_DATE+45,now()-interval '7 days',
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','cenario',4,'inversor','Sofar 10kW','potencia_modulo_wp',620,'forma_pagamento','Financiamento Santander'));

  INSERT INTO public.propostas (id, numero, status, consultor_id, cliente_id, cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd, validade, data_aprovacao, dados)
  VALUES (p_posto,'HOMO-FLUXO-D18-P-005','CONTRATADA',v_consultor,c_posto,'Posto União Energia LTDA','34567890000103',115000,37.20,60,CURRENT_DATE+45,now()-interval '20 days',
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','cenario',5,'inversor','Sofar 20kW','potencia_modulo_wp',620,'forma_pagamento','BNDES'));

  INSERT INTO public.propostas (id, numero, status, consultor_id, cliente_id, cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd, validade, dados)
  VALUES (p_auto,'HOMO-FLUXO-D18-P-006','CANCELADA',v_consultor,c_auto,'Auto Elétrica Norte LTDA','45678901000104',18900,4.96,8,CURRENT_DATE+45,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','cenario',6,'inversor','Sofar 5kW','potencia_modulo_wp',620,'forma_pagamento','Boleto à vista'));

  INSERT INTO public.propostas (id, numero, status, consultor_id, cliente_id, cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd, validade, motivo_status, dados)
  VALUES (p_carlos,'HOMO-FLUXO-D18-P-007','CANCELADA',v_consultor,c_carlos,'Carlos Henrique Souza','33344455566',24990,6.20,10,CURRENT_DATE+45,'Cliente desistiu por motivo financeiro',
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','cenario',7,'inversor','Sofar 5kW','potencia_modulo_wp',620,'forma_pagamento','Boleto à vista'));

  INSERT INTO public.propostas (id, numero, status, consultor_id, cliente_id, cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd, validade, versao_num, motivo_status, dados) VALUES
    (p_patri_1,'HOMO-FLUXO-D18-P-008-V1','SUBSTITUIDA',v_consultor,c_patri,'Patrícia Mendes Rocha','44455566677',24990,6.20,10,CURRENT_DATE+45,1,'Substituída pela versão V2 — revisão de potência',
      jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','cenario',8,'versao','V1','inversor','Sofar 5kW','potencia_modulo_wp',620,'forma_pagamento','Boleto')),
    (p_patri_2,'HOMO-FLUXO-D18-P-008-V2','ATIVA',v_consultor,c_patri,'Patrícia Mendes Rocha','44455566677',31500,9.92,16,CURRENT_DATE+45,2,NULL,
      jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','cenario',8,'versao','V2','substitui',p_patri_1::text,'inversor','Sofar 7.5kW','potencia_modulo_wp',620,'forma_pagamento','Financiamento'));

  INSERT INTO public.propostas (id, numero, status, consultor_id, cliente_id, cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd, validade, dados)
  SELECT gen_random_uuid(),
    'HOMO-FLUXO-D18-P-' || lpad((8+i)::text,3,'0'),
    (ARRAY['RASCUNHO','GERADA','ATIVA','EXPIRADA'])[1+(i%4)],
    v_consultor, cli.id, cli.nome, cli.doc,
    (ARRAY[18900,24990,31500,42800,58900,79200,115000])[1+(i%7)],
    (ARRAY[4.96,6.20,9.92,12.40,22.32,37.20])[1+(i%6)],
    (ARRAY[8,10,16,20,36,60])[1+(i%6)],
    CURRENT_DATE+45,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','origem','HOMOLOGACAO_FLUXO_D18','generico',true,
      'inversor',(ARRAY['Sofar 5kW','Sofar 7.5kW','Sofar 10kW','Sofar 15kW','Sofar 20kW'])[1+(i%5)],
      'potencia_modulo_wp',620,'forma_pagamento',(ARRAY['Boleto','Financiamento BV','Cartão','BNDES'])[1+(i%4)])
  FROM generate_series(1,21) AS i
  CROSS JOIN LATERAL (
    SELECT id,nome,doc FROM public.clientes
    WHERE email LIKE 'fluxo-d18-%@fluxo-d18.local'
    ORDER BY nome LIMIT 1 OFFSET ((i-1)%12)
  ) cli;

  -- 2.4 CONTRATOS (15)
  INSERT INTO public.contratos (id, codigo, cliente_id, consultor_id, status, valor_total, valor_entrada, data_inicio, potencia_kwp, modulos_qtde, inversor, forma_pagamento, observacoes, proposta_id, dados)
  VALUES (ct_merc,'HOMO-FLUXO-D18-CT-003',c_merc,v_consultor,'Pendente',58900,5890,CURRENT_DATE,22.32,36,'Sofar 15kW','Boleto 12x',
    'HOMOLOGACAO_FLUXO_D18 • Cenário 3 — Contrato pendente de redação (minuta)',p_merc,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',3,'etapa','minuta'));

  INSERT INTO public.contratos (id, codigo, cliente_id, consultor_id, status, valor_total, valor_entrada, data_inicio, potencia_kwp, modulos_qtde, inversor, forma_pagamento, observacoes, proposta_id, contrato_redigido, dados)
  VALUES (ct_farm,'HOMO-FLUXO-D18-CT-004',c_farm,v_consultor,'GERADO',42800,4280,CURRENT_DATE,12.40,20,'Sofar 10kW','Financiamento Santander',
    'HOMOLOGACAO_FLUXO_D18 • Cenário 4 — Contrato gerado aguardando assinatura',p_farm,true,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',4,'etapa','gerado'));

  INSERT INTO public.contratos (id, codigo, cliente_id, consultor_id, status, valor_total, valor_entrada, data_assinatura, data_inicio, potencia_kwp, modulos_qtde, inversor, forma_pagamento, observacoes, proposta_id, contrato_redigido, assinado, assinado_em, assinado_aprovado, assinado_aprovado_em, liberado_para_contrato, liberado_em, dados)
  VALUES (ct_posto,'HOMO-FLUXO-D18-CT-005',c_posto,v_consultor,'Ativo',115000,11500,CURRENT_DATE-10,CURRENT_DATE-10,37.20,60,'Sofar 20kW','BNDES',
    'HOMOLOGACAO_FLUXO_D18 • Cenário 5 — Contrato assinado/ativo',p_posto,true,true,now()-interval '10 days',true,now()-interval '10 days',true,now()-interval '12 days',
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',5,'etapa','assinado'));

  INSERT INTO public.contratos (id, codigo, cliente_id, consultor_id, status, valor_total, valor_entrada, data_inicio, potencia_kwp, modulos_qtde, inversor, forma_pagamento, observacoes, proposta_id, cancelado, motivo_cancelamento, dados)
  VALUES (ct_auto,'HOMO-FLUXO-D18-CT-006',c_auto,v_consultor,'Cancelado',18900,1890,CURRENT_DATE-30,4.96,8,'Sofar 5kW','Boleto à vista',
    'HOMOLOGACAO_FLUXO_D18 • Cenário 6 — Contrato cancelado',p_auto,true,'Cliente desistiu antes do início da obra',
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',6,'etapa','cancelado'));

  INSERT INTO public.contrato_propostas (contrato_id, proposta_id) VALUES
    (ct_merc,p_merc),(ct_farm,p_farm),(ct_posto,p_posto),(ct_auto,p_auto);

  INSERT INTO public.contratos (id, codigo, cliente_id, consultor_id, status, valor_total, valor_entrada, data_inicio, potencia_kwp, modulos_qtde, inversor, forma_pagamento, observacoes, contrato_redigido, assinado, assinado_em, liberado_para_contrato, dados)
  SELECT gen_random_uuid(),
    'HOMO-FLUXO-D18-CT-' || lpad((6+i)::text,3,'0'),
    cli.id, v_consultor,
    (ARRAY['Pendente','GERADO','Ativo'])[1+(i%3)],
    (ARRAY[24990,31500,42800,79200])[1+(i%4)],
    (ARRAY[2499,3150,4280,7920])[1+(i%4)],
    CURRENT_DATE-(i*2),
    (ARRAY[6.20,9.92,12.40,22.32])[1+(i%4)],
    (ARRAY[10,16,20,36])[1+(i%4)],
    (ARRAY['Sofar 5kW','Sofar 7.5kW','Sofar 10kW','Sofar 15kW'])[1+(i%4)],
    (ARRAY['Boleto','Financiamento BV','Cartão','BNDES'])[1+(i%4)],
    'HOMOLOGACAO_FLUXO_D18 • Genérico CT-' || lpad((6+i)::text,3,'0'),
    ((i%3) >= 1), ((i%3)=2),
    CASE WHEN ((i%3)=2) THEN now()-(i*interval '1 day') ELSE NULL END,
    ((i%3)=2),
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','generico',true)
  FROM generate_series(1,11) AS i
  CROSS JOIN LATERAL (
    SELECT id FROM public.clientes WHERE email LIKE 'fluxo-d18-%@fluxo-d18.local'
    ORDER BY nome LIMIT 1 OFFSET ((i-1)%12)
  ) cli;

  -- 2.5 PROJETOS (25)
  INSERT INTO public.projetos (id, codigo, cliente_id, contrato_id, consultor_id, tipo, status, potencia_kwp, modulos_qtde, inversor, cidade, uf, valor_estimado, dados)
  VALUES (pj_posto,'HOMO-FLUXO-D18-PJ-001',c_posto,ct_posto,v_consultor,'Contrato','Em execução',37.20,60,'Sofar 20kW','Senador Canedo','GO',115000,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',5));

  INSERT INTO public.projetos (id, codigo, cliente_id, contrato_id, consultor_id, tipo, status, potencia_kwp, modulos_qtde, inversor, cidade, uf, valor_estimado, dados)
  SELECT gen_random_uuid(),
    'HOMO-FLUXO-D18-PJ-' || lpad((1+i)::text,3,'0'),
    ct.cliente_id, ct.id, v_consultor, 'Contrato',
    (ARRAY['Rascunho','Em execução','Finalizado'])[1+(i%3)],
    ct.potencia_kwp, ct.modulos_qtde, ct.inversor,'Goiânia','GO',ct.valor_total,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','generico',true)
  FROM generate_series(1,24) AS i
  CROSS JOIN LATERAL (
    SELECT id,cliente_id,potencia_kwp,modulos_qtde,inversor,valor_total
    FROM public.contratos WHERE codigo LIKE 'HOMO-FLUXO-D18-CT-%'
    ORDER BY codigo LIMIT 1 OFFSET ((i-1)%15)
  ) ct;

  -- 2.6 ADITIVOS (8)
  INSERT INTO public.aditivos (id, codigo, contrato_id, projeto_id, consultor_id, numero, tipo, tipo_escopo, tipo_aditivo, status, valor_delta, valor_anterior, valor_novo, motivo, dados, payload_alteracoes)
  SELECT gen_random_uuid(),
    'HOMO-FLUXO-D18-AD-' || lpad(i::text,3,'0'),
    ct_posto, pj_posto, v_consultor, i,'Valor','PROJETO','NORMAL',
    (ARRAY['RASCUNHO','EM_APROVACAO','APLICADO'])[1+(i%3)],
    1500*i, 115000+(1500*(i-1)), 115000+(1500*i),
    'Ajuste de escopo — aditivo de homologação ' || i,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','cenario',5),
    jsonb_build_object('valor_delta',1500*i)
  FROM generate_series(1,8) AS i;

  -- 2.7 COMISSÕES (20)
  INSERT INTO public.comercial_comissoes (id, codigo, contrato_id, vendedor_id, vendedor_nome, percentual, valor_base, valor_calculado, status, prevista_em, beneficiario_id, beneficiario_nome, tipo_beneficiario, origem, observacao)
  SELECT gen_random_uuid(),
    'HOMO-FLUXO-D18-CM-' || lpad(i::text,3,'0'),
    ct.id, v_consultor,'Consultor Fluxo D18',3.0,
    ct.valor_total, ROUND(ct.valor_total*0.03,2),
    (ARRAY['PREVISTA','LIBERADA','PAGA'])[1+(i%3)]::comercial_comissao_status,
    now()-(i*interval '1 day'),
    v_consultor,'Consultor Fluxo D18','CONSULTOR'::comercial_comissao_tipo_beneficiario,'CONTRATO'::comercial_comissao_origem,
    'HOMOLOGACAO_FLUXO_D18'
  FROM generate_series(1,20) AS i
  CROSS JOIN LATERAL (
    SELECT id,valor_total FROM public.contratos WHERE codigo LIKE 'HOMO-FLUXO-D18-CT-%'
    ORDER BY codigo LIMIT 1 OFFSET ((i-1)%15)
  ) ct;

  -- 2.8 ANEXOS (60) — entidade_tipo='contratos' (plural) + categorias válidas
  INSERT INTO public.anexos (entidade_tipo, entidade_id, categoria, storage_path, nome, mime, tamanho, observacao, owner_id)
  SELECT 'contratos', ct_id, cat,
    'homologacao/d18-fluxo/' || cat || '/' || nm,
    nm, 'application/pdf',
    102400 + (random()*512000)::bigint,
    'HOMOLOGACAO_FLUXO_D18', v_admin
  FROM (VALUES
    (ct_merc, 'contrato',         'HOMO-FLUXO-D18-AX-MERC-CONTRATO.pdf'),
    (ct_merc, 'projeto',          'HOMO-FLUXO-D18-AX-MERC-PROJETO.pdf'),
    (ct_merc, 'documento_cliente','HOMO-FLUXO-D18-AX-MERC-RG-SOCIO.pdf'),
    (ct_merc, 'outros',           'HOMO-FLUXO-D18-AX-MERC-COMP-ENDERECO.pdf'),
    (ct_farm, 'contrato',         'HOMO-FLUXO-D18-AX-FARM-CONTRATO.pdf'),
    (ct_farm, 'projeto',          'HOMO-FLUXO-D18-AX-FARM-PROJETO.pdf'),
    (ct_farm, 'documento_cliente','HOMO-FLUXO-D18-AX-FARM-CONTRATO-SOCIAL.pdf'),
    (ct_farm, 'outros',           'HOMO-FLUXO-D18-AX-FARM-CNH.pdf'),
    (ct_posto,'contrato',         'HOMO-FLUXO-D18-AX-POSTO-CONTRATO.pdf'),
    (ct_posto,'projeto',          'HOMO-FLUXO-D18-AX-POSTO-PROJETO.pdf'),
    (ct_posto,'documento_cliente','HOMO-FLUXO-D18-AX-POSTO-PROCURACAO.pdf'),
    (ct_posto,'outros',           'HOMO-FLUXO-D18-AX-POSTO-OUTROS.pdf'),
    (ct_auto, 'contrato',         'HOMO-FLUXO-D18-AX-AUTO-CONTRATO.pdf'),
    (ct_auto, 'projeto',          'HOMO-FLUXO-D18-AX-AUTO-PROJETO.pdf'),
    (ct_auto, 'documento_cliente','HOMO-FLUXO-D18-AX-AUTO-RG.pdf'),
    (ct_auto, 'outros',           'HOMO-FLUXO-D18-AX-AUTO-CANCELAMENTO.pdf')
  ) AS x(ct_id, cat, nm);

  INSERT INTO public.anexos (entidade_tipo, entidade_id, categoria, storage_path, nome, mime, tamanho, observacao, owner_id)
  SELECT 'contratos', ct.id,
    (ARRAY['contrato','projeto','documento_cliente','outros'])[1+(i%4)],
    'homologacao/d18-fluxo/generico/HOMO-FLUXO-D18-AX-' || lpad(i::text,3,'0') || '.pdf',
    'HOMO-FLUXO-D18-AX-' || lpad(i::text,3,'0') || '.pdf',
    'application/pdf',
    102400 + (random()*512000)::bigint,
    'HOMOLOGACAO_FLUXO_D18', v_admin
  FROM generate_series(1,44) AS i
  CROSS JOIN LATERAL (
    SELECT id FROM public.contratos WHERE codigo LIKE 'HOMO-FLUXO-D18-CT-%'
    ORDER BY codigo LIMIT 1 OFFSET ((i-1)%15)
  ) ct;

  -- 2.9 EVENTOS_TIMELINE (120)
  INSERT INTO public.eventos_timeline (objeto_tipo, objeto_id, evento_tipo, titulo, descricao, usuario_id, payload)
  SELECT 'contrato', ct.id, evt.tipo, evt.titulo, evt.descricao, v_consultor,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','contrato',ct.codigo)
  FROM public.contratos ct
  CROSS JOIN LATERAL (VALUES
    ('CRIADO','Contrato criado','Registro inicial do contrato.'),
    ('REDIGIDO','Minuta redigida','Cláusulas e forma de pagamento preenchidas.'),
    ('GERADO','Contrato gerado','Contrato final gerado, aguardando assinatura.'),
    ('ASSINADO','Contrato assinado','Cliente assinou o contrato.'),
    ('OBSERVACAO','Observação registrada','Anotação operacional de homologação.')
  ) AS evt(tipo,titulo,descricao)
  WHERE ct.codigo LIKE 'HOMO-FLUXO-D18-CT-%';

  INSERT INTO public.eventos_timeline (objeto_tipo, objeto_id, evento_tipo, titulo, descricao, usuario_id, payload)
  SELECT 'proposta', p.id, evt.tipo, evt.titulo, evt.descricao, v_consultor,
    jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','proposta',p.numero)
  FROM public.propostas p
  CROSS JOIN LATERAL (VALUES
    ('CRIADA','Proposta criada','Proposta registrada para o cliente.'),
    ('ENVIADA','Proposta enviada','Proposta enviada para análise do cliente.'),
    ('ATUALIZADA','Status atualizado','Status atualizado conforme cenário de homologação.')
  ) AS evt(tipo,titulo,descricao)
  WHERE p.numero IN (
    'HOMO-FLUXO-D18-P-001','HOMO-FLUXO-D18-P-002','HOMO-FLUXO-D18-P-003','HOMO-FLUXO-D18-P-004',
    'HOMO-FLUXO-D18-P-005','HOMO-FLUXO-D18-P-006','HOMO-FLUXO-D18-P-007',
    'HOMO-FLUXO-D18-P-008-V1','HOMO-FLUXO-D18-P-008-V2'
  );

  INSERT INTO public.eventos_timeline (objeto_tipo, objeto_id, evento_tipo, titulo, descricao, usuario_id, payload)
  SELECT 'cliente', c.id, 'CONTATO','Contato registrado',
    'Atendimento de homologação ' || lpad(i::text,2,'0'),
    v_consultor, jsonb_build_object('tag','HOMOLOGACAO_FLUXO_D18','seq',i)
  FROM generate_series(1,18) AS i
  CROSS JOIN LATERAL (
    SELECT id FROM public.clientes
    WHERE email LIKE '%@fluxo-d18.local'
    ORDER BY nome LIMIT 1 OFFSET ((i-1)%20)
  ) c;
END $seed$;
