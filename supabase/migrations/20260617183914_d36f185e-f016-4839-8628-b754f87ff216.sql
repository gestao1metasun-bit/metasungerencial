SET LOCAL session_replication_role = 'replica';

-- 1) CLIENTES
WITH base AS (
  SELECT id, row_number() OVER (ORDER BY codigo_externo) AS rn
    FROM clientes WHERE codigo_externo LIKE 'HOMO-D18-CLI-%'
),
perfil AS (
  SELECT b.id, b.rn,
    (ARRAY[
      'João Carlos Oliveira','Maria Fernanda Silva','Carlos Henrique Souza','Patrícia Mendes Rocha',
      'Ricardo Alves Pereira','Juliana Costa Lima','Fernando Gomes Araújo','Aline Cristina Barros',
      'Eduardo Martins Nunes','Larissa Ferreira Dias','Mercado Ideal LTDA','Farmácia Vida LTDA',
      'Auto Elétrica Norte LTDA','Posto União LTDA','Padaria São José LTDA','Restaurante Sabor da Terra LTDA',
      'Fazenda Esperança','Fazenda Santa Luzia','Sítio Boa Vista','Chácara Recanto Verde',
      'Frigorífico Norte LTDA','Madeireira Rondônia LTDA','Cerâmica Porto LTDA','Indústria Solar Amazon LTDA'
    ])[ ((b.rn - 1) % 24) + 1 ] AS nome_real,
    CASE WHEN ((b.rn - 1) % 24) + 1 <= 10 THEN 'PF' ELSE 'PJ' END AS tipo,
    (ARRAY['Porto Velho','Ji-Paraná','Ariquemes','Vilhena','Cacoal','Rolim de Moura','Jaru','Pimenta Bueno','Ouro Preto do Oeste','Guajará-Mirim'])
      [ ((b.rn - 1) % 10) + 1 ] AS cidade_real,
    (ARRAY['Centro','Nova Porto Velho','Areal','Embratel','Industrial','Liberdade','Jardim Eldorado','Cohab','Caladinho','Setor 01'])
      [ ((b.rn - 1) % 10) + 1 ] AS bairro_real,
    (ARRAY['Rua das Palmeiras','Av Calama','Rua Jatuarana','Rua Alexandre Guimarães','Av Rio de Janeiro','Rua Abunã','Av Sete de Setembro','Rua Joaquim Nabuco','Rua Tenreiro Aranha','Av Amazonas'])
      [ ((b.rn - 1) % 10) + 1 ] AS rua_real
    FROM base b
)
UPDATE clientes c SET
  nome = p.nome_real,
  tipo_pessoa = p.tipo,
  telefone = '(69) 9' || lpad(((p.rn*1234567) % 100000000)::text, 8, '0'),
  telefone2 = CASE WHEN p.rn % 3 = 0 THEN '(69) 3' || lpad(((p.rn*987) % 10000000)::text, 7, '0') ELSE NULL END,
  email = lower(regexp_replace(translate(split_part(p.nome_real,' ',1) || '.' || split_part(p.nome_real,' ',2),'áéíóúãâêôçÁÉÍÓÚÃÂÊÔÇ ','aeiouaaecAEIOUAAEC_'),'[^a-z0-9._]','','g')) || p.rn::text || '@email.com',
  cep = '76' || lpad(((p.rn*73) % 1000)::text, 3, '0') || '-' || lpad(((p.rn*11) % 1000)::text, 3, '0'),
  rua = p.rua_real,
  numero = ((p.rn * 17) % 4000 + 50)::text,
  bairro = p.bairro_real,
  complemento = CASE WHEN p.tipo='PJ' THEN 'Sala ' || ((p.rn%30)+1)::text ELSE NULL END,
  cidade = p.cidade_real,
  uf = 'RO',
  status = 'ATIVO',
  rg = CASE WHEN p.tipo='PF' THEN lpad(((p.rn*9871) % 10000000)::text,7,'0') || '-' || ((p.rn%10))::text ELSE NULL END,
  inscricao_estadual = CASE WHEN p.tipo='PJ' THEN lpad(((p.rn*1234567) % 1000000000)::text,9,'0') ELSE NULL END,
  inscricao_municipal = CASE WHEN p.tipo='PJ' THEN lpad(((p.rn*99) % 1000000)::text,6,'0') ELSE NULL END,
  regime_tributario = CASE WHEN p.tipo='PJ'
    THEN (ARRAY['SIMPLES','LUCRO_PRESUMIDO','LUCRO_REAL','MEI'])[ ((p.rn-1)%4)+1 ]
    ELSE 'NAO_INFORMADO' END
FROM perfil p WHERE c.id = p.id;

-- 2) LEADS
WITH base AS (
  SELECT id, row_number() OVER (ORDER BY (dados->>'codigo_homologacao')) AS rn
    FROM leads WHERE dados::text LIKE '%HOMOLOGACAO_FIXA_D18%'
)
UPDATE leads l SET
  nome = (ARRAY[
    'João Carlos Oliveira','Maria Fernanda Silva','Carlos Henrique Souza','Patrícia Mendes Rocha',
    'Ricardo Alves Pereira','Juliana Costa Lima','Fernando Gomes Araújo','Aline Cristina Barros',
    'Eduardo Martins Nunes','Larissa Ferreira Dias','Mercado Ideal LTDA','Farmácia Vida LTDA',
    'Auto Elétrica Norte LTDA','Posto União LTDA','Fazenda Esperança','Fazenda Santa Luzia',
    'Sítio Boa Vista','Frigorífico Norte LTDA','Madeireira Rondônia LTDA','Cerâmica Porto LTDA'
  ])[ ((b.rn - 1) % 20) + 1 ],
  telefone = '(69) 9' || lpad(((b.rn*54321) % 100000000)::text, 8, '0'),
  consumo_kwh = (ARRAY[450,680,980,1250,1800,2600,4200,7800])[ ((b.rn-1)%8)+1 ],
  origem = (ARRAY['Instagram','Google','Indicação','Site','Evento','WhatsApp','Facebook','Telefone'])[ ((b.rn-1)%8)+1 ],
  observacao = (ARRAY[
    'Cliente interessado em sistema residencial. Solicitou visita técnica.',
    'Empresa com conta de energia alta, busca redução de custos.',
    'Indicação de cliente atual. Já conhece o produto.',
    'Veio através do Instagram, pediu material via WhatsApp.',
    'Lead frio - retomar em 30 dias.',
    'Cliente quente, quer fechar este mês.',
    'Aguardando aprovação de financiamento bancário.',
    'Solicitou proposta com bateria.',
    'Quer comparar com concorrente antes de decidir.',
    'Fazenda - sistema off-grid avaliado.'
  ])[ ((b.rn-1)%10)+1 ],
  dados = COALESCE(l.dados,'{}'::jsonb) || jsonb_build_object(
    'canal', (ARRAY['Instagram','Google Ads','Indicação','Site','Evento','WhatsApp','Facebook','Telefone'])[ ((b.rn-1)%8)+1 ],
    'score', (b.rn*13)%100,
    'temperatura', (ARRAY['FRIO','MORNO','QUENTE'])[ ((b.rn-1)%3)+1 ],
    'responsavel', (ARRAY['Carlos Oliveira','Maria Souza','Pedro Santos','Fernanda Lima','Lucas Rocha','Ana Martins','Juliana Costa','Ricardo Alves'])[ ((b.rn-1)%8)+1 ],
    'ultimo_contato', to_char(now() - ((b.rn%30) || ' days')::interval, 'YYYY-MM-DD'),
    'proximo_contato', to_char(now() + ((b.rn%15) || ' days')::interval, 'YYYY-MM-DD'),
    'empresa_origem', CASE WHEN b.rn%3=0 THEN 'Indicação cliente '||b.rn ELSE NULL END
  )
FROM base b WHERE l.id = b.id;

-- 3) PROPOSTAS
WITH base AS (
  SELECT id, row_number() OVER (ORDER BY numero) AS rn
    FROM propostas WHERE dados::text LIKE '%HOMOLOGACAO_FIXA_D18%'
)
UPDATE propostas p SET
  valor_final = (ARRAY[18900,22450,24990,31500,42800,58900,79200,115000,248000])[ ((b.rn-1)%9)+1 ],
  potencia_kwp = (ARRAY[4.96,6.20,7.44,9.92,12.40,15.50,22.32,37.20,74.40])[ ((b.rn-1)%9)+1 ],
  modulos_qtd = (ARRAY[8,10,12,16,20,25,36,60,120])[ ((b.rn-1)%9)+1 ],
  cliente_nome = COALESCE(NULLIF(p.cliente_nome,''), 'Cliente Proposta ' || b.rn),
  dados = COALESCE(p.dados,'{}'::jsonb) || jsonb_build_object(
    'inversor', (ARRAY['Sofar 5k','Sofar 7.5k','Sofar 10k','Sofar 15k','Sofar 20k','Sofar 40k','Growatt 5k','Growatt 10k','Deye 12k'])[ ((b.rn-1)%9)+1 ],
    'cidade', (ARRAY['Porto Velho','Ji-Paraná','Ariquemes','Vilhena','Cacoal','Rolim de Moura'])[ ((b.rn-1)%6)+1 ],
    'bairro', (ARRAY['Centro','Industrial','Embratel','Areal','Liberdade','Cohab'])[ ((b.rn-1)%6)+1 ],
    'consultor_nome', (ARRAY['Carlos Oliveira','Maria Souza','Pedro Santos','Fernanda Lima','Lucas Rocha','Ana Martins','Juliana Costa','Ricardo Alves'])[ ((b.rn-1)%8)+1 ],
    'tipo_sistema', (ARRAY['ON_GRID','HÍBRIDO','OFF_GRID'])[ ((b.rn-1)%3)+1 ],
    'forma_pagamento', (ARRAY['À vista','Financiamento Santander','Financiamento BV','Cartão 12x','Cartão 18x','Boleto entrada + 12x'])[ ((b.rn-1)%6)+1 ],
    'consumo_kwh', (ARRAY[450,680,980,1250,1800,2600,4200,7800])[ ((b.rn-1)%8)+1 ],
    'tipo_telhado', (ARRAY['Cerâmico','Fibrocimento','Metálico','Laje','Solo'])[ ((b.rn-1)%5)+1 ]
  )
FROM base b WHERE p.id = b.id;

-- 4) CONTRATOS
WITH base AS (
  SELECT id, row_number() OVER (ORDER BY codigo) AS rn
    FROM contratos WHERE dados::text LIKE '%HOMOLOGACAO_FIXA_D18%'
)
UPDATE contratos c SET
  valor_total = (ARRAY[24990,31500,42800,58900,79200,115000])[ ((b.rn-1)%6)+1 ],
  potencia_kwp = (ARRAY[7.44,9.92,12.40,15.50,22.32,37.20])[ ((b.rn-1)%6)+1 ],
  modulos_qtde = (ARRAY[12,16,20,25,36,60])[ ((b.rn-1)%6)+1 ],
  inversor = (ARRAY['Sofar 7.5k','Sofar 10k','Sofar 15k','Sofar 20k','Sofar 40k','Growatt 10k'])[ ((b.rn-1)%6)+1 ],
  forma_pagamento = (ARRAY['À vista','Financiamento Santander 60x','Financiamento BV 72x','Cartão 18x','Entrada 30% + 12x','Entrada 50% + 6x'])[ ((b.rn-1)%6)+1 ],
  valor_entrada = COALESCE(c.valor_entrada, (ARRAY[24990,31500,42800,58900,79200,115000])[ ((b.rn-1)%6)+1 ] * 0.3),
  vendedor = (ARRAY['Carlos Oliveira','Maria Souza','Pedro Santos','Fernanda Lima','Lucas Rocha','Ana Martins','Juliana Costa','Ricardo Alves'])[ ((b.rn-1)%8)+1 ],
  comissao_pct = 3.0,
  observacoes = 'Contrato gerado a partir da proposta homologada. Cenário: ' ||
    (ARRAY['Residencial simples','Comercial telhado metálico','Rural fazenda 3 projetos','Industrial alta potência','Residencial premium','Comercial centro'])[ ((b.rn-1)%6)+1 ],
  dados = COALESCE(c.dados,'{}'::jsonb) || jsonb_build_object(
    'consultor_nome', (ARRAY['Carlos Oliveira','Maria Souza','Pedro Santos','Fernanda Lima','Lucas Rocha','Ana Martins','Juliana Costa','Ricardo Alves'])[ ((b.rn-1)%8)+1 ],
    'cenario', CASE
      WHEN b.rn = 1 THEN 'CENARIO_01_residencial_simples'
      WHEN b.rn = 2 THEN 'CENARIO_02_proposta_substituida'
      WHEN b.rn = 3 THEN 'CENARIO_03_contrato_3_projetos'
      WHEN b.rn = 4 THEN 'CENARIO_04_projeto_com_aditivo'
      WHEN b.rn = 5 THEN 'CENARIO_05_aditivo_compensatorio'
      WHEN b.rn = 6 THEN 'CENARIO_06_comissao_multipla'
      WHEN b.rn = 7 THEN 'CENARIO_07_cliente_recorrente'
      WHEN b.rn = 8 THEN 'CENARIO_08_contrato_cancelado'
      WHEN b.rn = 10 THEN 'CENARIO_10_premium_industrial'
      ELSE 'OPERACIONAL'
    END,
    'cidade', (ARRAY['Porto Velho','Ji-Paraná','Ariquemes','Vilhena','Cacoal','Rolim de Moura'])[ ((b.rn-1)%6)+1 ],
    'bairro', (ARRAY['Centro','Industrial','Embratel','Areal','Liberdade','Cohab'])[ ((b.rn-1)%6)+1 ]
  )
FROM base b WHERE c.id = b.id;

-- 5) PROJETOS_CONTRATO
WITH ranked AS (
  SELECT pc.id, pc.contrato_id,
         row_number() OVER (PARTITION BY pc.contrato_id ORDER BY pc.ordem, pc.id) AS pos,
         count(*) OVER (PARTITION BY pc.contrato_id) AS total
    FROM projetos_contrato pc WHERE pc.dados::text LIKE '%HOMOLOGACAO_FIXA_D18%'
),
base AS (
  SELECT r.id, r.pos, r.total, c.valor_total, c.potencia_kwp AS pot_total, c.modulos_qtde AS mod_total,
         row_number() OVER (ORDER BY r.contrato_id, r.pos) AS rn
    FROM ranked r JOIN contratos c ON c.id = r.contrato_id
)
UPDATE projetos_contrato pc SET
  descricao = (ARRAY['Residência','Comércio','Fazenda','Empresa','Galpão Industrial'])[ ((b.rn-1)%5)+1 ] ||
              ' - Projeto ' || b.pos || '/' || b.total,
  valor = round((b.valor_total / b.total)::numeric, 2),
  potencia_kwp = round((b.pot_total / b.total)::numeric, 2),
  modulos_qtd = greatest(1, (b.mod_total / b.total)::int),
  telhado_tipo = (ARRAY['Cerâmico','Fibrocimento','Metálico','Laje','Solo'])[ ((b.rn-1)%5)+1 ],
  inv1 = (ARRAY['Sofar 5k','Sofar 7.5k','Sofar 15k','Sofar 20k','Sofar 40k'])[ ((b.rn-1)%5)+1 ],
  endereco = jsonb_build_object(
    'logradouro', (ARRAY['Rua das Palmeiras','Av Calama','Rua Jatuarana','Rua Alexandre Guimarães','Av Rio de Janeiro','Rua Abunã','Av Sete de Setembro'])[ ((b.rn-1)%7)+1 ],
    'numero', ((b.rn*17)%4000+50)::text,
    'bairro', (ARRAY['Centro','Nova Porto Velho','Areal','Embratel','Industrial','Liberdade','Jardim Eldorado'])[ ((b.rn-1)%7)+1 ],
    'cidade', (ARRAY['Porto Velho','Ji-Paraná','Ariquemes','Vilhena','Cacoal','Rolim de Moura'])[ ((b.rn-1)%6)+1 ],
    'uf', 'RO',
    'cep', '76' || lpad(((b.rn*73)%1000)::text,3,'0') || '-' || lpad(((b.rn*11)%1000)::text,3,'0')
  ),
  dados = COALESCE(pc.dados,'{}'::jsonb) || jsonb_build_object(
    'tipo_imovel', (ARRAY['Residência','Comércio','Fazenda','Empresa','Galpão Industrial'])[ ((b.rn-1)%5)+1 ],
    'cronograma', jsonb_build_object(
      'etapa', (ARRAY['Engenharia','Homologação','Instalação','Vistoria','Concluído'])[ ((b.rn-1)%5)+1 ],
      'previsao_conclusao', to_char(now() + ((b.rn%60) || ' days')::interval, 'YYYY-MM-DD')
    )
  )
FROM base b WHERE pc.id = b.id;

-- 6) ADITIVOS
WITH base AS (
  SELECT id, row_number() OVER (ORDER BY (dados->>'codigo_homologacao')) AS rn
    FROM aditivos WHERE dados::text LIKE '%HOMOLOGACAO_FIXA_D18%'
)
UPDATE aditivos a SET
  descricao = (ARRAY[
    'Aumento de 8 módulos de 620W para atender ampliação solicitada pelo cliente.',
    'Troca do inversor Sofar 10k por Sofar 15k devido a aumento de carga.',
    'Adequação do projeto executivo após vistoria técnica em campo.',
    'Ampliação futura prevista em contrato — segunda fase aprovada.',
    'Inclusão de estrutura de solo para 12 módulos adicionais.',
    'Substituição de string box por modelo de maior capacidade.',
    'Adequação à norma da concessionária local após parecer técnico.',
    'Inclusão de monitoramento remoto Wi-Fi.'
  ])[ ((b.rn-1)%8)+1 ],
  motivo = (ARRAY[
    'Solicitação do cliente','Adequação técnica','Exigência concessionária',
    'Erro de medição inicial','Ampliação futura','Substituição de equipamento'
  ])[ ((b.rn-1)%6)+1 ]
FROM base b WHERE a.id = b.id;
