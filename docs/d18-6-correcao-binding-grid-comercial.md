# D18.6 — Correção de binding da grid Comercial / Propostas

## 1. Mapa técnico real

```
Supabase: public.propostas (colunas tabulares + jsonb `dados`)
   ↓
Repository: src/lib/repositories/propostas-repo.ts → fetchAllPropostas()
   ↓ rowToProposta(r)
Store: src/modules/propostas/store.ts → makeSupabasePropostasStore()
   ↓ usePropostas()
Page: src/modules/propostas/PropostasPage.tsx (montada via /comercial → aba "orcamentos")
   ↓ <PropostaList propostas={...} />
Grid: src/modules/propostas/components/PropostaList.tsx
   ↓ buildLeads(propostas) → Lead[]
   ↓ renderCell(lead, colKey)
Colunas: Cliente · Consultor · Cidade · Consumo (kWh) · Módulos ·
         Potência (kWp) · Inversores · Valor · R$/kWp · Status
```

## 2. Causa raiz

A massa `HOMOLOGACAO_FIXA_D18` foi salva em snake_case no jsonb `dados`
(`consultor_nome`, `consumo_kwh`, `potencia_modulo_wp`, `quantidade_modulos`,
`inversor`, `uf`, …) e os números operacionais nas colunas tabulares
(`valor_final`, `potencia_kwp`, `modulos_qtd`, `consultor_id`, `cliente_nome`).

`rowToProposta` apenas espalhava `dados` em `PropostaFV` (camelCase) e
mapeava 5–6 colunas. Resultado: `Lead.ultima.consultor`,
`.modulosQtd`, `.moduloPotenciaWp`, `.consumoMedio`, `.inversores`,
`.valorFinalManual`, `.cidade`, `.estado` chegavam vazios → grid mostrava
"—" e R$ 0,00. A massa estava certa, o mapper é que estava errado.

Adicionalmente, a coluna *Cidade* concatenava `${cidade}/${estado || ""}`,
produzindo `Cacoal/` quando UF estava ausente.

## 3. Divergências detectadas (snake_case ↔ camelCase)

| Coluna da grid     | Campo PropostaFV (esperado) | Origem no banco (real)                        |
|--------------------|-----------------------------|-----------------------------------------------|
| Cliente            | `clienteNome`               | `propostas.cliente_nome` ✅ (já mapeado)      |
| Consultor          | `consultor`                 | `dados.consultor_nome`                        |
| Cidade             | `cidade`                    | `dados.cidade`                                |
| UF                 | `estado`                    | `dados.uf`                                    |
| Consumo (kWh)      | `consumoMedio`              | `dados.consumo_kwh`                           |
| Módulos            | `modulosQtd`                | `propostas.modulos_qtd` / `dados.quantidade_modulos` |
| Potência módulo    | `moduloPotenciaWp`          | `dados.potencia_modulo_wp`                    |
| Potência (kWp)     | derivada via `calcDimensionamento` | depende de `modulosQtd × moduloPotenciaWp` |
| Inversores         | `inversores[]` / `inversorMarca` | `dados.inversor` (string única)          |
| Valor proposta     | `valorFinalManual`          | `propostas.valor_final`                       |
| R$/kWp             | derivada `valor / kwp`      | —                                             |

## 4. Correções aplicadas

### `src/lib/repositories/propostas-repo.ts` — `rowToProposta`
- Lê colunas tabulares (`r.valor_final`, `r.modulos_qtd`) e chaves
  snake_case em `dados` e popula os campos camelCase que a grid consome.
- `valor_final` é colocado em `valorFinalManual` para que
  `calcPrecificacao().valorFinal` retorne o número real sem `|| 0`
  silencioso.
- Sinônimos cobertos: `consultor_nome`/`consultorNome`/`vendedor`,
  `consumo_kwh`/`consumo_medio`/`consumo_mensal`,
  `quantidade_modulos`/`modulos_qtd`,
  `potencia_modulo_wp`/`modulo_wp`,
  `valor_total`/`valor_proposta`,
  `uf`/`estado`,
  `inversor`/`modelo_inversor` → vira array `[{ inversorId, quantidade: 1 }]`
  e também alimenta `inversorMarca` (fallback do agregador de Lead).

### `src/modules/propostas/components/PropostaList.tsx` — `renderCell`
- **Cidade**: nunca renderiza `Cidade/` ou `/UF`. Junta com `/UF` somente
  quando UF existe; senão mostra apenas a cidade.
- **Valor**: em propostas ativas (GERADA/ENVIADA/APROVADA/CONTRATADA/ATIVA)
  com valor 0/null, exibe badge **Dados inconsistentes** em vez de
  `R$ 0,00` silencioso.
- **R$/kWp**: agora sufixa `/kWp` no rótulo.

## 5. O que NÃO foi tocado

- Nenhuma linha da massa `HOMOLOGACAO_FIXA_D18` foi alterada.
- Nenhuma RPC, RLS, trigger, view, workflow ou regra de negócio
  alterada.
- Nenhum fallback `|| 0` adicionado em código transacional — a única
  manipulação numérica é mover o valor existente para `valorFinalManual`
  preservando `null/undefined` como `undefined`.
- Não foi alterada a fonte (continua `propostas` via repository oficial).

## 6. Resultado esperado na grid `/comercial → Orçamentos`

Buscando `HOMO-D18`, cada linha agora exibe:

- Cliente: nome real (`Patrícia Mendes Rocha`, `Posto União LTDA`, …)
- Consultor: nome real (`Fernanda Lima`, `Ana Martins`, …)
- Cidade: `Vilhena/RO`, `Ji-Paraná/RO`, `Cacoal/RO`, … (sem barra órfã)
- Consumo (kWh): `1.250 kWh`, `2.600 kWh`, …
- Módulos: `30`, `20`, …
- Potência (kWp): `18,60 kWp`, `12,40 kWp`, …
- Inversores: `20`, `15`, … (numeral padrão sistema, derivado de
  `dados.inversor`)
- Valor: `R$ 57.500,00`, `R$ 42.800,00`, …
- R$/kWp: `R$ 3.091,40/kWp`, …
- Status: badge canônico (RASCUNHO/GERADA/APROVADA/CONTRATADA/SUBSTITUIDA/
  CANCELADA) já vigente no kanban.

## 7. Riscos

- O agregador `buildLeads` continua agrupando por `leadId`/`clienteDoc`/nome;
  ao haver várias versões da mesma proposta, ele usa a **última** (mais
  recente por `atualizadoEm`). Comportamento inalterado.
- `inversores` derivado da string `dados.inversor` é renderizado pelo
  padrão sistema (apenas numeral). Caso a operação queira manter o rótulo
  completo (`Sofar 20kW`) na grid, é uma decisão de UI separada — fora do
  escopo D18.6.
- `Lead.fase` (GERANDO/GERADO/ASSINADO) ainda depende de `contratos-store`
  legado em LS; HOMO-D18 não cria contratos LS, então a coluna Status
  mostrará o status puro da proposta — esperado.

## 8. Próxima recomendação

- D18.7: revisar `comercial.clientes.$clienteId.tsx` para reaproveitar
  o mesmo binding (já lê `dados`, mas pode se beneficiar das mesmas
  chaves snake_case).
- D19: migrar definitivamente `PropostasPage` LEGADO LS → componente
  Supabase nativo (hoje o store é Supabase mas a UI ainda foi escrita
  para o shape antigo).
