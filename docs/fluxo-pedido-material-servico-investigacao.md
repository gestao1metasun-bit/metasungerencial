# Investigação preliminar — Cadastro de Material × Serviço

Data: 2026-05-28. Vinculado a `mem://features/pedido-material-servico-enterprise-flow`.

## Estado atual do schema

Única tabela de catálogo de itens:

```
public.produtos
  id uuid, codigo text, nome text, categoria text, unidade text,
  custo_unitario numeric, estoque_minimo numeric, ativo boolean,
  dados jsonb, created_at, updated_at, deleted_at
```

**Não existem:**
- `servicos`
- `itens_catalogo`
- coluna `tipo` (MATERIAL/SERVICO) em `produtos`
- coluna `natureza_padrao_id` em `produtos`
- coluna `centro_resultado_padrao_id` em `produtos`
- coluna `fornecedor_sugerido_id` em `produtos`

## Onde "serviço" aparece hoje

Referências em código (`rg servico|serviço`): apenas em propostas, financeiro, naturezas, grupos, contrato-template — todas como string livre ou natureza financeira, **nenhuma como cadastro de catálogo**.

## Decisão arquitetural (a confirmar na Fase 1)

Duas opções:

### Opção A — Catálogo único `produtos` ampliado (RECOMENDADO preliminar)
- Adicionar em `produtos`: `tipo` enum MATERIAL|SERVICO|AMBOS, `natureza_padrao_id`, `centro_resultado_padrao_id`, `fornecedor_sugerido_id`, `escopo text` (descrição do serviço).
- Vantagens: 1 motor de cadastro, anexos, auditoria, RLS, busca, histórico. Reaproveita `estoque_movimentos` para serviço com `tipo='consumo_servico'`.
- Desvantagens: serviço não tem saldo físico → views de estoque precisam filtrar por `tipo='MATERIAL'`.

### Opção B — Tabela separada `servicos`
- Nova tabela com mesmas colunas operacionais + `escopo`, `unidade_medicao`, `sla`, `fornecedor_sugerido_id`.
- Vantagens: separação conceitual limpa; serviço não polui views de saldo.
- Desvantagens: duplica motor de cadastro/RLS/auditoria/anexos; pedidos precisam de FK polimórfica (`item_tipo='produto'|'servico'`).

**Recomendação:** começar pela Opção A (menor superfície, reuso máximo) e migrar para B só se serviço evoluir para medição/SLA/contratação muito divergente de material.

## Bloqueios para abrir Fase 1

1. D15 (migração financeira LS→Supabase) precisa estar fechado primeiro.
2. Decisão A vs B precisa do usuário.
3. Definir se permissão `estoque.item_ad_hoc` é nova enum em `app_permission` (sim, recomendado) ou flag em perfil.

## Próximos passos
**Nenhum agora.** Esta investigação fica congelada como referência. Voltar quando D15.1.a.0.iv (corte oficial) estiver concluído.
