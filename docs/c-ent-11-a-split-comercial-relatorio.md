# C-ENT.11.a — Split estrutural de `comercial.tsx`

**Onda:** C-ENT.11 — Corte do legado LS no Comercial
**Subonda:** 11.a — Split seguro (pré-requisito mecânico para 11.b..f)
**Data:** 2026-06-17
**Modo:** Estrutural puro. ZERO mudança funcional. ZERO recableamento LS→Supabase. ZERO regra de negócio alterada. ZERO remoção de funcionalidade. ZERO migração de dados.

---

## 1. Resultado mensurável

| Métrica | Antes | Depois | Δ |
|---|---|---|---|
| `src/routes/comercial.tsx` (linhas) | **5.793** | **4.797** | **−996 (−17,2 %)** |
| Funções/tipos/constantes ainda no monólito | ~50 | ~40 | −10 unidades movidas |
| Módulos em `src/modules/comercial/` | 2 (CarteiraTab, ComissoesTab) | **7** | +5 (5 novos arquivos) |
| Erros `tsc --noEmit` introduzidos | n/a | **0** | ✅ |
| Linter Supabase (warnings novos) | 248 | 248 | 0 ✅ |
| Dependências runtime alteradas | — | — | nenhuma |

---

## 2. Arquivos criados (5)

| Arquivo | Linhas | Conteúdo |
|---|---|---|
| `src/modules/comercial/_shared.tsx` | 161 | Utilitários puros: `maskDoc`, `maskTel`, `onlyDigits`, `isDocValid`, `isTelValid`, `fmtDataBR`, `fmtContratoId`, `valorContrato`, `useAuthCurrent`, `KpiBlock`, `KpiSmall`. Constantes: `MESES`, `CHART_COLORS`, `volumeSeed`. Tipos: `Contrato`, `Vendedor`, `Proposta`, `VolumeMes`. |
| `src/modules/comercial/ContratosSection.tsx` | 164 | `ContratosUnificadosTab` (3 grupos Pendentes/Em contrato/Fechado) + `ContratosKanbanView` + `CONTRATOS_KANBAN_DEFAULTS` + `defaultColContrato`. Recebe sub-tabs como render props (`renderAberto/renderContrato/renderFechado`) para preservar acoplamento com dialogs internos que ainda residem em `comercial.tsx`. |
| `src/modules/comercial/VendedoresTab.tsx` | 185 | `VendedoresTab` + `HistoricoVendedorDialog` + `NovoVendedorDialog`. Lê mock `vendedoresSeed`; comportamento idêntico ao original. |
| `src/modules/comercial/AnaliseExecutivaTab.tsx` | 399 | `AnaliseExecutivaTab` (alertas + meta + tendência) **e** `IndicadoresTab` (KPIs avançados, funil, pizza, multi-ano, sazonalidade, performance por vendedor). Constantes: `STATUS_COLORS`, `SERIE_ANOS`. |
| `src/modules/comercial/AditivosTab.tsx` | 261 | `AditivosTab` (LS — consome `aditivos-store`; **substituição por Supabase fica para C-ENT.11.c**). Toolbar Enterprise + BulkActionBar + dialog de painel preservados. |

---

## 3. Arquivos alterados (1)

| Arquivo | Mudança |
|---|---|
| `src/routes/comercial.tsx` | Adiciona 18 linhas de imports do barrel modular. Remove ~1.014 linhas (5 blocos de funções extraídas + `valorContrato` + comentários). Atualiza chamada `<ContratosUnificadosTab>` para fornecer `renderAberto/renderContrato/renderFechado` (dispatcher mantém os componentes pesados `ContratosTab`/`ContratoAssinadoTab`/`ContratosCanceladosTab` em escopo local). Re-exporta `IndicadoresTab` para preservar `import { IndicadoresTab } from "@/routes/comercial"` usado em `src/routes/dashboard.tsx:30`. |

---

## 4. Componentes extraídos

- `ContratosUnificadosTab` (com render props para sub-tabs)
- `ContratosKanbanView` + `CONTRATOS_KANBAN_DEFAULTS` + `defaultColContrato`
- `VendedoresTab` + `HistoricoVendedorDialog` + `NovoVendedorDialog`
- `AnaliseExecutivaTab`
- `IndicadoresTab` (re-exportado para compat de `/dashboard`)
- `KpiBlock`, `KpiSmall`
- `AditivosTab`
- `valorContrato`, `fmtContratoId`, `useAuthCurrent`
- Tipos `Contrato`/`Vendedor`/`Proposta`/`VolumeMes`
- Constantes `CHART_COLORS`/`MESES`/`volumeSeed`
- Utilitários `maskDoc`/`maskTel`/`isDocValid`/`isTelValid`/`fmtDataBR`/`onlyDigits` (movidos por consistência, embora ainda **referenciados internamente em `comercial.tsx`** via re-export do barrel)

---

## 5. Itens mencionados pelo usuário e seu destino

| Pedido | Status | Observação |
|---|---|---|
| `ComercialPageLayout` | **Já é a função `ComercialPage`** (linhas 175–212). Tem 38 linhas — abaixo do limiar útil para nova extração. Documentado e mantido. |
| `ComercialTabs` | **Idem** — o wrapper `<Tabs>` é trivial dentro de `ComercialPage`. Extração separada não agrega clareza. |
| `ClientesSection` | **Não existe como seção** em `/comercial`. Clientes vivem em rotas próprias (`/comercial/clientes` e `/comercial/clientes/$id`). O cadastro embutido em diálogos (`RedigirContratoDialog`, `CompletarDadosClienteDialog`, `NovoClienteDialog`) permanece junto desses diálogos por dependência forte de estado. Mover só em 11.b/11.d quando esses diálogos forem recablados. |
| `LeadsSection` | **Não existe como aba** em `/comercial`. Leads são consumidos por `CarteiraTab` (já extraído) e por `DashboardComercial` (que segue no monólito — Dashboard Comercial é candidato a 11.a.bis em turno futuro por complexidade). Não há `LeadsSection` para extrair. |
| `PropostasSection` | **Já é externa**: o conteúdo da aba "orçamentos" é `<PropostasPage embedded />` (módulo `@/modules/propostas`). Nada a extrair de `comercial.tsx`. |
| `ContratosSection` | ✅ Extraído como `ContratosUnificadosTab` no novo `ContratosSection.tsx`. |
| `Dialogs comerciais ainda usados` | **Mantidos no monólito por enquanto** (próximo item). |

---

## 6. O que permanece em `comercial.tsx` (4.797 linhas) e por quê

Dialogs e tabs que **ainda dependem fortemente de stores LS** (`contratos-store`, `aditivos-store`, `clientes-store`, `fin-titulos-store`, `contrato-base-store`) e/ou que se cruzam em referências mútuas. Movê-los agora violaria a regra "ZERO mudança funcional":

- `ContratosTab` (cadastro CPF/CNPJ → contrato redigido, ~450 l)
- `ContratoAssinadoTab` + `ContratoAssinadoRow` (~370 l)
- `ContratosCanceladosTab` (~85 l)
- `RedigirContratoDialog` (~595 l)
- `CompletarDadosClienteDialog` (~165 l)
- `ModeloBaseContratoDialog` (~108 l)
- `EditarContratoDialog` (~316 l)
- `AprovarEnviarDialog` (~85 l)
- `ProjetoEditCard` + `ProjetosManager` + `ConciliacaoCell` + `emptyProjeto` (~290 l)
- `DashboardComercial` + `DetailContratosModal` (~825 l) — alta densidade de filtros e cruzamentos com leads/contratos/vendedores; extração isolada é viável mas requer turno próprio
- `NegociacaoTab`, `VolumeMensalTab`, `NovoVolumeDialog` (~210 l)
- `CadastrarContratoTab` + `ClientePicker` + `NovoClienteDialog` (~510 l)
- `ValidarContratoButton`, `SolicitarAlteracaoButton`, `AprovarContratoButton` (~150 l)
- `PedidosVendaTab` (~140 l) — consome `KpiSmall` (agora via import)
- Helpers de anexo (`ANEXO_URLS`, `setAnexoUrl`, `getAnexoUrl`, `abrirAnexoContrato`, `useAnexarHandler`) (~55 l) — usados apenas por `ContratoAssinadoRow`; movem em conjunto com ele em onda futura
- Helpers utilitários `nextContratoId`, `comissaoFromParametro`, `mapTipoTopo` (~30 l)
- `useState` de `vendedoresList`/`propostas`/`volume` + 3 acessos diretos a `localStorage` (linhas 4628–4634 e 4787) — **débito declarado**; remoção exige migração LS→Supabase (C-ENT.11.b/11.f)

Esses 4.797 fluem para 11.b (recablear contratos+comissões para Supabase) e 11.c (eliminar aditivos LS), que abrirão espaço para extração segura desses dialogs.

---

## 7. Riscos e mitigações

| Risco | Severidade | Mitigação adotada |
|---|---|---|
| Quebra de `<ContratosUnificadosTab>` no roteamento `/comercial#tab=contratos` por troca de assinatura (props `render*` em vez de filhos hardcoded) | Médio | Render-props deixam `ContratosTab`/`ContratoAssinadoTab`/`ContratosCanceladosTab` no escopo original (zero dependência circular). Mesmos componentes, mesmas props, mesmo comportamento. |
| `IndicadoresTab` deixou de existir em `comercial.tsx` e quebra import em `dashboard.tsx` | Alto | Re-export explícito: `export const IndicadoresTab = IndicadoresTabImpl;` mantém o caminho `@/routes/comercial`. Comentário inline documenta o motivo. |
| Conflitos de nome (`valorContrato` colide com locais homônimos em `EditarContratoDialog`/`ProjetoEditCard`/`ProjetosManager`) | Baixo | JS/TS permite shadowing local. Variáveis `const valorContrato = Number(...)` em escopo de função continuam tendo precedência sobre o import — comportamento idêntico ao código original. |
| `useAuthCurrent` agora importado em vez de declarado | Baixo | Implementação byte-idêntica. Mesmo fallback (`"sistema"` em SSR, `"operador"` quando falha). |
| Linter Supabase / RLS | n/a | Onda 100 % front; banco/migrations/RLS intactos. |
| TypeScript estrito | Baixo | `tsc --noEmit` limpo após cada bloco (validado pelo harness). |

---

## 8. Checklist técnico

- [x] `tsc --noEmit` limpo (sem erros após o swap)
- [x] Sem nova migration / sem mudança em RPC / sem mudança em RLS
- [x] Sem novo warning no Supabase Linter (248 estável)
- [x] Sem novo import LS além dos já existentes
- [x] Sem alteração em workflow, auditoria, governance, perf
- [x] Re-export de `IndicadoresTab` preservado para `/dashboard`
- [x] Render-props preservam dispatcher de sub-tabs de contratos

---

## 9. Validação funcional mínima sugerida (manual em preview)

Comparar com baseline pré-onda — esperado: 100 % comportamento idêntico.

- `/comercial#tab=dashboard` — abre, KPIs e charts renderizam ✓ (dashboard intacto, ainda no monólito)
- `/comercial#tab=orcamentos` — abre `<PropostasPage embedded />` ✓ (não tocado)
- `/comercial#tab=contratos` — abre toggle Pendentes/Em contrato/Fechado; trocar entre os 3 mostra `ContratosTab`/`ContratoAssinadoTab`/`ContratosCanceladosTab` (render-props) e alternar Tabela/Kanban ainda funciona
- `/comercial#tab=aditivos` — abre `AditivosTab` (LS — comportamento idêntico)
- `/comercial#tab=carteira` — abre `CarteiraTab` (já extraído antes; intocado)
- `/comercial#tab=comissoes` — abre `ComissoesTab` (já extraído antes; intocado)
- `/comercial#tab=vendedores` — abre `VendedoresTab` (novo módulo)
- `/comercial#tab=analise` — abre `AnaliseExecutivaTab` (novo módulo)
- `/dashboard` aba indicadores — `IndicadoresTab` segue acessível via re-export

---

## 10. Pendências (declaradas, não executadas nesta subonda)

1. **`DashboardComercial` + `DetailContratosModal`** (~825 l) — candidato à 11.a.bis em turno isolado.
2. **Editor de contrato (`RedigirContratoDialog` + `CompletarDadosClienteDialog` + `EditarContratoDialog` + `ProjetosManager`)** — alvo de 11.b (recableamento Supabase).
3. **`ContratoAssinadoRow` + helpers de anexo** — vão junto com 11.b por estarem ligados a aprovação/cancelamento.
4. **3 acessos diretos a `localStorage` em `comercial.tsx`** (linhas 4628–4634, 4787) — violam Charter D15; ficam para 11.f.
5. **`gerarAPdeComissao` LS** (ainda em `ContratoAssinadoRow`) — alvo prioritário de 11.b (a comissão duplicada LS + trigger Supabase é o pior risco operacional restante).
6. **`AditivosTab` (LS)** — alvo de 11.c (substituir por `AditivosListPanel` Supabase).
7. **`vendedoresList`** vive em `useState` com seed mock — não há tabela Supabase; documentação em pendência de produto.

---

## 11. Mudança funcional involuntária

**Nenhuma identificada.** Toda a refatoração foi mecânica:
- Funções movidas com assinatura idêntica.
- `valorContrato` extraída com corpo idêntico.
- `IndicadoresTab` re-exportada para preservar import externo.
- `ContratosUnificadosTab` agora recebe sub-tabs via render-props; a composição em `ComercialPage` reconstrói a árvore React **idêntica** à anterior (mesmos componentes, mesmas props).
- Nenhum dado, nenhum store, nenhuma RPC, nenhuma policy alterada.

---

## 12. Próxima onda recomendada

**C-ENT.11.b — Recablear Contratos e Comissões para Supabase** (escopo definido na auditoria `auditoria-modulo-comercial-relatorio.md` §1.2 e §1.3):

1. Trocar `cancelarContrato`/`aprovarContratoAssinado`/`liberarContratoParaGerar` (LS) por `rpc_contrato_cancelar`/`rpc_contrato_aprovar`/`rpc_contrato_libera_*` (já implementadas em C5/C6).
2. Remover `gerarAPdeComissao` LS de `ContratoAssinadoRow` — o trigger `tg_comercial_comissao_criar_de_assinatura` já cria a comissão automaticamente em Supabase.
3. Ativar 4 permissões hoje declaradas e ociosas (`contrato.assinar`, `enviar_engenharia`, `enviar_financeiro`, `marcar_engenharia_liberada`, `marcar_financeiro_liberado`).
4. Consumir 6 RPCs órfãs (`rpc_contrato_assinar`, `rpc_contrato_enviar_assinatura`, `rpc_contrato_enviar_engenharia`, `rpc_contrato_enviar_financeiro`, `rpc_contrato_enviar_financiamento`).

A redução de superfície permitida pela 11.a torna 11.b viável sem reescrever `comercial.tsx` inteiro de novo.

**Aguardando validação do usuário antes de iniciar 11.b.**
