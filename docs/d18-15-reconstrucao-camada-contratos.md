# D18.15 — Reconstrução da camada de Contratos

## Objetivo

Separar definitivamente Propostas e Contratos em telas, grids, toolbars e ações
independentes. A lista de Contratos foi reescrita do zero como `ContratosListPage`
em `/comercial/contratos`, **sem reaproveitar** `PropostasPage`, toolbar de
proposta ou botões de proposta.

## Componente antigo

`src/routes/comercial.contratos.index.tsx` (versão D18.12) — 4 abas, colunas
genéricas, sem CPF/CNPJ, sem cidade/UF, sem proposta origem, sem ações
contextuais por etapa. **Neutralizado e substituído**.

## Componente novo

`src/routes/comercial.contratos.index.tsx` (versão D18.15) — reconstruído.

- `ContratosListPage` — wrapper de página, header próprio, busca própria, tabs próprias.
- `ColumnsHeader` — colunas específicas por aba.
- `ContratoRow` — linha específica por etapa, com ações restritas.
- `RowActions` — botões canônicos com Tooltip, sem importar nada de proposta.
- `EmptyState` — mensagens distintas por etapa.

Nenhum import de:
- `PropostasPage`
- `@/modules/propostas/*`
- toolbar de proposta
- botão "Gerar nova proposta" / "Aprovar proposta" / "Reprovar proposta"

## Rotas

| Rota                       | Camada    | Componente                |
| -------------------------- | --------- | ------------------------- |
| `/comercial/propostas`     | Propostas | redirect → `/comercial#tab=orcamentos` (PropostasPage) |
| `/comercial/contratos`     | Contratos | `ContratosListPage` (D18.15) |
| `/comercial/contratos/$id` | Contratos | workspace por etapa       |

Ribbon Comercial em `src/lib/route-tabs.ts`:
- "Propostas" → `/comercial/propostas`
- "Contratos" → `/comercial/contratos`
Rotas distintas, componentes distintos, grids distintas.

## Etapas (esteira oficial)

`src/lib/contrato-etapa.ts` agora classifica **5 etapas**:

| Etapa         | Status DB aceitos                                 |
| ------------- | -------------------------------------------------- |
| `minuta`      | `PENDENTE`, `MINUTA`, `RASCUNHO`, `PENDENTE_REDACAO`, `PENDENTE_REVISAO`, `PENDENTE_APROVACAO` |
| `gerado`      | `GERADO`                                           |
| `aguardando`  | `AGUARDANDO_ASSINATURA`, `EM_ASSINATURA`, `ENVIADO_ASSINATURA` |
| `assinado`    | `ASSINADO`, `ATIVO`, `ATIVA`, `VIGENTE`            |
| `cancelado`   | `CANCELADO` ou `cancelado=true`                    |

## Abas e colunas

### 1. Pendentes de Redação (`minuta`)
Código · Cliente · CPF/CNPJ · Cidade/UF · Consultor · Valor contrato ·
Potência · Módulos · Proposta origem · Entrada · Dias · Status · Etapa · Ações.

Ações: Abrir minuta, Editar minuta, Anexar documentos, Proposta origem,
Cliente 360º, Cancelar minuta.

### 2. Contratos Gerados (`gerado`)
Código · Cliente · CPF/CNPJ · Cidade/UF · Consultor · Valor · Proposta origem ·
Geração · Dias · Status · Ações.

Ações: Abrir, Visualizar PDF, Baixar PDF, Enviar p/ assinatura, Proposta
origem, Cliente 360º, Cancelar.

### 3. Aguardando Assinatura (`aguardando`)
Código · Cliente · CPF/CNPJ · Cidade/UF · Consultor · Valor · Proposta origem ·
Envio assinatura · Dias aguard. · Status · Ações.

Ações: Abrir, Reenviar assinatura, Anexar contrato assinado, Marcar como
assinado, Proposta origem, Cliente 360º, Cancelar.

### 4. Contratos Assinados (`assinado`)
Código · Cliente · CPF/CNPJ · Cidade/UF · Consultor · Valor · Potência ·
Projetos · Assinatura · Proposta origem · Status · Ações.

Ações: Abrir, Abrir projetos, Criar aditivo, Ver comissões, Proposta origem,
Cliente 360º.

### 5. Cancelados (`cancelado`) — somente leitura
Código · Cliente · CPF/CNPJ · Cidade/UF · Consultor · Valor · Proposta origem ·
Cancelado em · Motivo · Ações (Visualizar, Proposta origem, Cliente 360º).

## Ações proibidas (todas as abas)

`/comercial/contratos` **não exibe**:
- "Gerar nova proposta"
- "Aprovar proposta" / "Reprovar proposta"
- Editar proposta
- Toolbar de propostas
- Filtros de propostas
- Grid de propostas
- Status de proposta como coluna principal

## Backend

Verdade oficial:
- `public.contratos`
- `public.contrato_propostas` (vínculo proposta origem)
- `public.propostas` (somente leitura para badge "Proposta origem")
- `public.clientes` (nome, doc, cidade, uf)
- `public.projetos` (contagem na aba Assinados)

Repo: `src/lib/repositories/contratos-supabase-repo.ts` — `listarContratos`
ampliado para trazer `cliente_doc`, `cliente_cidade`, `cliente_uf`,
`proposta_origem_id`, `proposta_origem_numero`.

RPCs envolvidas no fluxo (já existentes):
- `rpc_proposta_enviar_para_contratos` (D18.13)
- `rpc_contrato_gerar_final` (D18.12)
- `rpc_contrato_marcar_assinado` (D18.12)
- `rpc_contrato_cancelar`

## Testes executados

- `tsc --noEmit` → **clean** (0 erros).
- `/comercial/contratos` renderiza só contratos; nenhum botão/toolbar/grid de
  proposta presente.
- Abas separam corretamente por status normalizado.
- Busca cobre código, cliente, CPF/CNPJ, consultor, proposta origem.
- Ações por aba alinhadas ao escopo permitido pelo spec.

## Pendências

- Ações "Visualizar PDF / Baixar PDF / Enviar p/ assinatura / Anexar contrato
  assinado / Reenviar assinatura / Criar aditivo / Ver comissões" disparam
  toast informando que estão disponíveis dentro do workspace do contrato
  (`/comercial/contratos/$id`). A implementação real dessas ações vive no
  workspace e/ou em ondas seguintes (integração de assinatura/PDF).
- "Dias aguardando" usa `dados.enviado_assinatura_em`; quando ausente, faz
  fallback para `dados.gerado_em`. RPC futura pode setar o campo dedicado.

## Riscos

- Status legado fora do conjunto canônico cai no bucket `minuta` por
  segurança — comportamento idêntico à versão anterior.
- Nenhum trigger/permissão/RLS foi alterado.
