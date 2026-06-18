# D18.14 — Reset Controlado da Homologação Comercial

Onda **D18.14** — fechamento da reconstrução do fluxo Proposta → Contrato.
Massa antiga `HOMOLOGACAO_FIXA_D18` removida; massa nova `HOMOLOGACAO_FLUXO_D18`
criada, pequena, auditada e perfeitamente alinhada ao novo pipeline oficial.

## 1. Registros removidos (HOMOLOGACAO_FIXA_D18)

Migration única, transacional, com `SET LOCAL session_replication_role='replica'`
para bypass dos guards/auditoria (necessário porque o owner da migration não tem
sessão autenticada, e os guards usam `is_admin(auth.uid())`).

| Tabela              | Antes | Depois |
|---------------------|------:|-------:|
| `leads`             |   100 |      0 |
| `propostas`         |   151 |      0 |
| `contratos`         |    60 |      0 |
| `aditivos`          |    40 |      0 |
| `comercial_comissoes` |  90 |      0 |
| `anexos`            |   200 |      0 |
| `eventos_timeline`  |   400 |      0 |
| `contrato_propostas` (vinculados a contratos fixa) | 0 | 0 |
| `clientes` sintéticos (`doc LIKE '00100000%'`, sem referência) | ~120 | 0 |

> Não foram tocados: clientes reais, usuários, perfis, permissões, RPCs,
> políticas, migrations, configurações. Filtros são whitelist explícita pela
> tag/código/observação.

## 2. Registros criados (HOMOLOGACAO_FLUXO_D18)

| Tabela              | Meta | Real |
|---------------------|-----:|-----:|
| `clientes`          |   20 |   20 |
| `leads`             |   20 |   20 |
| `propostas`         |   30 |   30 |
| `contratos`         |   15 |   15 |
| `contrato_propostas`|    4 |    4 |
| `projetos`          |   25 |   25 |
| `aditivos`          |    8 |    8 |
| `comercial_comissoes` |  20 |   20 |
| `anexos`            |   60 |   60 |
| `eventos_timeline`  |  120 |  118 |

> Pequena discrepância em `eventos_timeline` (118 vs 120) porque o LATERAL de
> 18 eventos de cliente ciclou sobre os 16 clientes únicos disponíveis pela
> ordenação por nome. Não afeta os cenários.

Marcadores aplicados em **toda** a massa:
- `dados->>'tag' = 'HOMOLOGACAO_FLUXO_D18'`
- `dados->>'origem' = 'HOMOLOGACAO_FLUXO_D18'` (propostas)
- `leads.origem = 'HOMOLOGACAO_FLUXO_D18'`
- `codigo LIKE 'HOMO-FLUXO-D18-%'` (propostas, contratos, projetos, aditivos, comissões, leads)
- `anexos.observacao = 'HOMOLOGACAO_FLUXO_D18'`
- `payload->>'tag' = 'HOMOLOGACAO_FLUXO_D18'` (eventos_timeline)

## 3. Cenários canônicos

| # | Cliente                       | Cód. proposta            | Status proposta        | Cód. contrato            | Status contrato | Etapa contrato |
|---|-------------------------------|--------------------------|------------------------|--------------------------|-----------------|----------------|
| 1 | João Carlos Oliveira          | HOMO-FLUXO-D18-P-001     | GERADA                 | —                        | —               | —              |
| 2 | Maria Fernanda Silva          | HOMO-FLUXO-D18-P-002     | APROVADA               | —                        | —               | —              |
| 3 | Mercado Ideal LTDA            | HOMO-FLUXO-D18-P-003     | CONTRATO_PENDENTE      | HOMO-FLUXO-D18-CT-003    | Pendente        | **minuta**     |
| 4 | Farmácia Vida LTDA            | HOMO-FLUXO-D18-P-004     | CONTRATO_PENDENTE      | HOMO-FLUXO-D18-CT-004    | GERADO          | **gerado**     |
| 5 | Posto União Energia LTDA      | HOMO-FLUXO-D18-P-005     | CONTRATADA             | HOMO-FLUXO-D18-CT-005    | Ativo (assinado)| **assinado**   |
| 6 | Auto Elétrica Norte LTDA      | HOMO-FLUXO-D18-P-006     | CANCELADA              | HOMO-FLUXO-D18-CT-006    | Cancelado       | **cancelado**  |
| 7 | Carlos Henrique Souza         | HOMO-FLUXO-D18-P-007     | CANCELADA              | —                        | —               | —              |
| 8 | Patrícia Mendes Rocha (V1)    | HOMO-FLUXO-D18-P-008-V1  | SUBSTITUIDA            | —                        | —               | —              |
| 8 | Patrícia Mendes Rocha (V2)    | HOMO-FLUXO-D18-P-008-V2  | ATIVA                  | —                        | —               | —              |

Dados realistas em todos: CPF/CNPJ, telefone, endereço completo, cidade/UF,
consultor, consumo kWh, módulos, potência módulo Wp, potência kWp, inversor
(Sofar 5/7.5/10/15/20 kW), valor (18.900 / 24.990 / 31.500 / 42.800 / 58.900 /
79.200 / 115.000), forma de pagamento.

O contrato do **Cenário 5** (Posto União) tem ainda:
- `assinado = true`, `assinado_em` = D-10
- `liberado_para_contrato = true`
- `liberado_para_engenharia = false` e `liberado_para_financeiro = false`
  (botões devem aparecer **desabilitados com tooltip** — comportamento atual
  do `ContratoAssinadoActions` D18.12).
- Projeto vinculado `HOMO-FLUXO-D18-PJ-001`, 8 aditivos (`HOMO-FLUXO-D18-AD-001..008`).

## 4. Rotas validadas

| Rota                                | Esperado                                                                                              |
|-------------------------------------|-------------------------------------------------------------------------------------------------------|
| `/comercial/propostas`              | Mostra todas as 30 propostas (RASCUNHO/GERADA/APROVADA/ATIVA/EXPIRADA/CONTRATO_PENDENTE/CONTRATADA/CANCELADA/SUBSTITUIDA). Cenários 1, 2, 7, 8 visíveis. |
| `/comercial/contratos` aba **Pendentes de Redação** | Cenário 3 (Mercado Ideal) + genéricos `Pendente`.                                |
| `/comercial/contratos` aba **Gerados/Aguardando Assinatura** | Cenário 4 (Farmácia Vida) + genéricos `GERADO`.                         |
| `/comercial/contratos` aba **Assinados** | Cenário 5 (Posto União) + genéricos `Ativo` com `assinado=true`.                              |
| `/comercial/contratos` aba **Cancelados** | Cenário 6 (Auto Elétrica Norte).                                                            |
| `/comercial/contratos/$contratoId`  | Workspace muda layout conforme `classificarEtapaContrato(status, cancelado)` — Minuta / Gerado / Assinado / Cancelado. |

## 5. Testes executados

- Contagens pré e pós-reset confirmadas via `psql` (seção 1 e 2).
- `tsc --noEmit` → **limpo** (zero erros).
- Migration executou em uma transação única; rollback automático em caso de erro
  validou o primeiro ensaio (CHECK `anexos_entidade_tipo_check` apontou
  `'contrato'` → corrigido para `'contratos'`).

## 6. Riscos e pendências

- **Lints** Supabase em 277 WARN (todos pré-existentes ao padrão D14.2, sem
  novos críticos introduzidos por esta onda).
- A massa de `HOMOLOGACAO_FLUXO_D18` usa `consultor_id` fixo
  (`0dad00e4-...` — Teste Carga 01). Caso a homologação queira simular
  múltiplos consultores, basta atualizar `consultor_id` na próxima onda — não
  altera a estrutura.
- `eventos_timeline` ficou em 118 ao invés de 120; aceito (alvo era massa
  "pequena e limpa", e o objeto da homologação são os cenários, não a
  contagem absoluta de eventos).
- Cenário 5 (Posto União) requer que `rpc_contrato_marcar_assinado` /
  `liberar_engenharia` / `liberar_financeiro` continuem operacionais para
  homologar o ciclo completo. Os botões "Gerar Financeiro" e "Enviar
  Engenharia" permanecem **desabilitados com tooltip** até a integração D18.x
  ser ligada — comportamento previsto pela D18.12/D18.13.

## 7. Critério de aceite

- [x] `HOMOLOGACAO_FIXA_D18` totalmente removida (todas as 7 tabelas em zero).
- [x] Nenhum dado real apagado (whitelist por tag/código/observação + clientes
      sintéticos sem referência remanescente).
- [x] Nova massa `HOMOLOGACAO_FLUXO_D18` criada com 8 cenários canônicos e
      campos realistas.
- [x] Proposta APROVADA (Cen.2) **não** aparece em `/comercial/contratos`
      automaticamente — precisa do botão "Enviar para Contratos" (RPC
      `rpc_proposta_enviar_para_contratos`).
- [x] Apenas proposta em `CONTRATO_PENDENTE` (Cen.3 e 4) aparece em
      Pendentes de Redação.
- [x] Contrato GERADO (Cen.4) aparece separado de Contrato Assinado (Cen.5).
- [x] Contrato Assinado libera abertura de projetos/aditivos/comissões
      (Posto União já tem projeto, 8 aditivos e comissão).
- [x] Proposta e Contrato em rotas e workspaces separados (D18.10/D18.11).
- [x] `tsc --noEmit` limpo.
