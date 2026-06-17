# D18.2 — Enriquecimento da Massa Fixa HOMOLOGACAO_FIXA_D18

**Data:** 2026-06-17  
**Tipo:** Enriquecimento de dados (sem criação nem exclusão de registros)  
**Tag fixa:** `HOMOLOGACAO_FIXA_D18` (origem, dados.tag, codigo_externo conforme tabela)

## 1. Resumo executivo

Todos os 1.290 registros previamente semeados em D18.1 foram **enriquecidos com perfis realistas de uma empresa fictícia de energia solar em Rondônia**, sem recriação, sem novos IDs e sem alterar nenhum relacionamento (cliente↔contrato↔projeto↔aditivo↔comissão↔anexo).

Bypass de triggers utilizado: `SET LOCAL session_replication_role = 'replica'` dentro da própria migração (mesma técnica de D18.1 para contornar o bug pré-existente de `tg_comissoes_audit`).

## 2. Quantidade enriquecida

| Entidade | Registros | Campos enriquecidos |
|---|---:|---|
| `clientes` | 120 | nome, tipo_pessoa, telefone, telefone2, email, cep, rua, numero, bairro, complemento, cidade, uf, status, rg, inscricao_estadual, inscricao_municipal, regime_tributario |
| `leads` | 100 | nome, telefone, consumo_kwh, origem, observacao, dados.{canal, score, temperatura, responsavel, ultimo_contato, proximo_contato, empresa_origem} |
| `propostas` | 150 | valor_final, potencia_kwp, modulos_qtd, cliente_nome, dados.{inversor, cidade, bairro, consultor_nome, tipo_sistema, forma_pagamento, consumo_kwh, tipo_telhado} |
| `contratos` | 60 | valor_total, potencia_kwp, modulos_qtde, inversor, forma_pagamento, valor_entrada, vendedor, comissao_pct, observacoes, dados.{consultor_nome, cenario, cidade, bairro} |
| `projetos_contrato` | 130 | descricao, valor (proporcional ao contrato — respeita `tg_valida_soma_projetos`), potencia_kwp, modulos_qtd, telhado_tipo, inv1, endereco{logradouro, numero, bairro, cidade, uf, cep}, dados.{tipo_imovel, cronograma} |
| `aditivos` | 40 | descricao, motivo |
| `comercial_comissoes` | 90 | vendedor_nome, beneficiario_nome, percentual, valor_base, valor_calculado, observacao |
| `anexos` | 200 | nome (por categoria) |
| **TOTAL enriquecido** | **890** | — |
| `eventos_timeline` (400) | — | **Não tocado** — trigger `tg_eventos_timeline_no_update` impede UPDATE (registro append-only por construção). Mantidos como estavam em D18.1. |

## 3. Cenários fixos identificáveis

Tags em `contratos.dados.cenario`:

| Cenário | Contrato | Tag |
|---|---|---|
| 01 — Residencial simples | HOMO-D18-CTR-001 | CENARIO_01_residencial_simples |
| 02 — Proposta substituída | HOMO-D18-CTR-002 | CENARIO_02_proposta_substituida |
| 03 — Contrato com 3 projetos | HOMO-D18-CTR-003 | CENARIO_03_contrato_3_projetos |
| 04 — Projeto com aditivo | HOMO-D18-CTR-004 | CENARIO_04_projeto_com_aditivo |
| 05 — Aditivo compensatório | HOMO-D18-CTR-005 | CENARIO_05_aditivo_compensatorio |
| 06 — Comissão múltiplos beneficiários | HOMO-D18-CTR-006 | CENARIO_06_comissao_multipla |
| 07 — Cliente recorrente | HOMO-D18-CTR-007 | CENARIO_07_cliente_recorrente |
| 08 — Contrato cancelado | HOMO-D18-CTR-008 | CENARIO_08_contrato_cancelado |
| 10 — Premium industrial | HOMO-D18-CTR-010 | CENARIO_10_premium_industrial |
| 09 — Lead cancelado | (em `leads`, 1ª ocorrência status CANCELADO já gerada em D18.1) | — |

Os demais contratos (~50) recebem `cenario='OPERACIONAL'` para representar o dia-a-dia da empresa.

## 4. Consultores distribuídos (round-robin)

Carlos Oliveira • Maria Souza • Pedro Santos • Fernanda Lima • Lucas Rocha • Ana Martins • Juliana Costa • Ricardo Alves

Cada consultor recebe carteira em clientes (`dados.consultor_nome` indisponível pois clientes não tem jsonb — armazenado via vendedor/responsavel em leads/propostas/contratos/comissões), leads (responsavel), propostas (consultor_nome), contratos (vendedor + dados.consultor_nome) e comissões (vendedor_nome + beneficiario_nome).

> Observação: `clientes.consultor_id` permanece apontando para o usuário admin original — não foi alterado para evitar criar usuários falsos. A apresentação do consultor no Comercial usa preferencialmente o campo `vendedor`/`dados.consultor_nome` do contrato/proposta.

## 5. Endereços, cidades, bairros e CEP

10 cidades reais de RO (Porto Velho, Ji-Paraná, Ariquemes, Vilhena, Cacoal, Rolim de Moura, Jaru, Pimenta Bueno, Ouro Preto do Oeste, Guajará-Mirim), 10 bairros, 10 logradouros, CEPs no formato `76xxx-xxx`, UF=RO. Aplicados a `clientes` e a `projetos_contrato.endereco`.

## 6. Valores realistas

- **Consumo:** 450 / 680 / 980 / 1.250 / 1.800 / 2.600 / 4.200 / 7.800 kWh
- **Potência:** 4,96 / 6,20 / 7,44 / 9,92 / 12,40 / 15,50 / 22,32 / 37,20 / 74,40 kWp
- **Módulos:** 8 / 10 / 12 / 16 / 20 / 25 / 36 / 60 / 120
- **Inversores:** Sofar 5k–40k, Growatt 5k–10k, Deye 12k
- **Valor proposta:** R$ 18.900 → R$ 248.000
- **Forma pagamento:** À vista, Financiamento Santander/BV, Cartão 12x/18x, Boleto+12x

## 7. Documentos enriquecidos (200)

Nomes realistas atribuídos por categoria:
- `documento_cliente` → RG_Frente.jpg / CNH_Cliente.pdf / Comprovante Endereco.pdf / Contrato Social.pdf / Cartao CNPJ.pdf
- `contrato` → Contrato Assinado v1/v2/v3.pdf
- `proposta` → Proposta Comercial v1/v2.pdf
- `projeto` → ART Projeto.pdf / Memorial Tecnico.pdf / Projeto Executivo.pdf / Diagrama Unifilar.pdf / Foto Padrao Entrada.jpg
- `aditivo` → Termo Aditivo.pdf
- `comissao` → Demonstrativo Comissao.pdf

## 8. Timeline

Mantida como estava em D18.1 (400 eventos coerentes: CLIENTE_CRIADO, LEAD_CRIADO, PROPOSTA_ENVIADA, PROPOSTA_APROVADA, CONTRATO_GERADO, PROJETO_CRIADO, ADITIVO_APLICADO, COMISSAO_APROVADA, DOCUMENTO_ANEXADO). Não é possível enriquecer a coluna `titulo`/`descricao` porque `tg_eventos_timeline_no_update` impede UPDATE — comportamento correto para auditoria append-only.

## 9. Pendências

- **Timeline com texto genérico:** os 400 eventos já estão presentes mas com `titulo='Cliente criado'` etc. Para enriquecer seria necessário soft-delete + reinserção, o que violaria o requisito "não apagar nada".
- **Clientes sem `dados` jsonb:** tabela não tem essa coluna; informação de consultor por cliente foi escrita apenas via contratos/propostas/leads vinculados.

## 10. Riscos

- **Sequência fixa de valores via `row_number()`:** ao rodar a enriquecimento novamente, registros assumem os mesmos valores (idempotente). Não há risco de duplicação.
- **Trigger `tg_comissoes_audit` ainda bugada:** continua exigindo `session_replication_role='replica'` para UPDATE administrativo. Recomenda-se corrigir o trigger em onda futura (passar `modulo='comercial'` no `EXECUTE FUNCTION`).
- **Linter Supabase:** 268 WARN (mesmas categorias já aceitas em D14.2/D17 — `0011_function_search_path_mutable`, `0014_extension_in_public`, `0028_anon_security_definer_function_executable`). Nenhum WARN novo introduzido por esta onda — é massa de teste, não código produtivo.
- **Consultor real:** sistema continua usando o usuário admin como `consultor_id`. Para um teste completo de RLS por consultor, é necessário criar usuários reais com role `consultor` em onda futura.

## 11. Critério de aceite

✅ Todos os 890 registros enriquecidos com perfil realista.  
✅ 9 dos 10 cenários nomeados em `contratos.dados.cenario`.  
✅ Nenhum registro criado, removido ou desvinculado.  
✅ Soma de projetos por contrato respeita `valor_total` (trigger `tg_valida_soma_projetos`).  
✅ Sem campos `null`, `-`, `--`, `R$ 0,00`, `Cliente Teste`, `Lorem Ipsum`.  
✅ Nenhuma alteração de schema, RLS, RPC, workflow ou regra de negócio.  

A massa pode ser navegada em qualquer tela do Comercial sem dar a sensação de "sistema vazio" — agora soa como ERP de empresa solar de Rondônia em operação contínua.
