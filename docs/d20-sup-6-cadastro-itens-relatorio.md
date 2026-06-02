# D20.SUP.6 — Cadastro Unificado de Itens & Serviços

**Data:** 2026-06-02
**Escopo:** Catálogo unificado MATERIAL/SERVIÇO + filtro estrutural na Requisição.

## Migração aplicada

1. **Extensão de `produtos`** (catálogo único):
   - `descricao, subcategoria, controla_estoque, exige_fornecedor,
     valor_referencia, natureza_padrao_id, centro_custo_padrao_id,
     centro_resultado_padrao_id, observacao`.
   - `tipo_item` agora `NOT NULL DEFAULT 'MATERIAL'` (registros antigos backfilled).
   - `SERVICO` força `controla_estoque=false` (UPDATE + trigger
     `tg_produto_consistencia_tipo`).

2. **Trigger `tg_sup_req_item_validar`** em `suprimentos_requisicao_itens`:
   - Bloqueia item de SERVIÇO em requisição MATERIAL e vice-versa.
   - Bloqueia item inativo.
   - Bloqueia SERVIÇO indo para Almoxarifado (`destino_almoxarifado=true`).
   - Preenche `unidade`/`tipo_item` a partir do catálogo/cabeçalho.

3. **`rpc_sup_requisicao_criar`** reescrita: agora insere os itens junto com
   o cabeçalho, transacional, respeitando o trigger acima. Compatível com
   itens "livres" (sem `item_estoque_id`) para preservar requisições legadas.

## UI

| Arquivo | Função |
|---|---|
| `src/lib/repositories/suprimentos-itens-repo.ts` | `useCatalogoItens`, `useCatalogoPorTipo`, `useUpsertItem`, `useToggleAtivoItem` |
| `src/modules/suprimentos/ItensServicosTab.tsx` | Lista + busca + filtros (tipo/ativo) + diálogo Novo/Editar/Ativar/Inativar |
| `src/routes/suprimentos.tsx` | Nova aba **Cadastros** entre Recebimentos e Relatórios |
| `src/modules/suprimentos/NovaRequisicaoDialog.tsx` | Cada item agora tem Select de **Catálogo** filtrado por tipo da requisição; troca de tipo limpa itens vinculados a catálogo incompatível |

## Validação dos botões

| Botão | Local | Ação |
|---|---|---|
| Novo item | Cadastros | abre diálogo de cadastro |
| Editar / Inativar / Ativar | Cadastros (RowActions) | mutation direta com toast |
| Salvar / Cancelar | Diálogo do item | upsert + close |
| Filtros (Tipo/Status) | Cadastros | refetch reativo |
| Buscar | Cadastros | filtro client-side por código/nome/categoria |
| Adicionar item | Nova requisição | adiciona linha em branco |
| Trocar tipo | Nova requisição | limpa itens de catálogo incompatível com toast `warning` |
| Catálogo (Select) | Nova requisição | filtra por `tipo_item` = tipo da requisição; "Item livre" continua suportado |

## Critério de aceite

- ✅ Item MATERIAL não aparece em requisição SERVIÇO e vice-versa (UI + RPC).
- ✅ Item de SERVIÇO em Almoxarifado bloqueado em 3 camadas
  (UI toggle desabilitado · UI submit · RPC `22023`).
- ✅ Item inativo bloqueado pelo trigger.
- ✅ Requisições legadas com descrição livre continuam funcionando
  (item_estoque_id permanece NULL).
- ✅ Build limpo, linter 218→222 WARN (padrão D14.2 — search_path / SECURITY DEFINER).

## Restrições mantidas

- Nenhum financeiro automático.
- Nenhum movimento de estoque novo (segue D20.SUP.3/4).
- RLS de `produtos` intacto (sem novo grant).
- Permissões: nenhuma nova; cadastro usa as policies existentes de `produtos`.
- Sem alteração em Cotação/Pedido/Recebimento — o tipo do item se propaga
  via `tipo_item` da requisição e via `item_estoque_id`.

## Próximos

- D20.SUP.7: anexos NF + Kanban + relatórios consolidados.
- D20.SUP.8: D5.1 (workflow de alçada) + corte das rotas legadas.
