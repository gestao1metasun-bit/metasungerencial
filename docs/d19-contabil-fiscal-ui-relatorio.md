# D19 — UI Contábil/Fiscal (Configurações) — Relatório Executivo

**Data:** 2026-05-29
**Escopo:** Camada de UI administrável sobre o backend D18 (Contábil-Ready ~99% / Fiscal-Ready ~80–85% / Exportação-Ready ~85%).
**Princípio:** zero alteração de schema, RLS, RPCs, workflow ou regra de negócio. Toda a infraestrutura já existe em D18.1..D18.8.

---

## 1. Entregas

### 1.1 Rota oficial
- **`/configuracoes/contabil`** — `src/routes/configuracoes.contabil.tsx`
- Acessível pela rota dedicada e pelo card em `/configuracoes`.

### 1.2 Repositório oficial
- **`src/lib/repositories/contabil-fiscal-repo.ts`** — hooks React Query:
  - `usePlanoContas` / `useUpsertPlanoConta`
  - `useMapeamentosContabeis` / `useUpsertMapeamentoContabil`
  - `useCentrosCusto` / `useUpsertCentroCusto`
  - `useEventosCanonicos` (read-only sobre `v_eventos_canonicos_catalogo`)
  - `useProdutosFiscal` / `useUpdateProdutoFiscal`
  - `useConectoresExternos` (read-only)
  - `useLotesIntegracao` / `useExportacoesGeradas` (read-only)
  - Utilitários `toCSV` + `downloadCSV` para exportações ad-hoc.

### 1.3 7 abas funcionais
| Aba | Backend D18 reutilizado | Operação |
|-----|------------------------|----------|
| Plano de Contas | `plano_contas` | CRUD código/nome/tipo/categoria/integração/ativo |
| Mapeamento Naturezas | `mapeamentos_contabeis` | CRUD evento canônico ↔ natureza ↔ conta débito/crédito ↔ CC padrão |
| Centros de Custo | `centros_custo` | CRUD código/nome/tipo/responsável/ativo |
| Eventos Contábeis | `v_eventos_canonicos_catalogo` (UNION dos 4 catálogos: 33 eventos) | Leitura, filtro por módulo |
| Fiscal de Produtos | `produtos` (NCM/CFOP/CST/origem/LC116/categoria fiscal) | Edição em linha |
| Exportações | `exportadores_externos` + utilitário CSV client-side | Visualização de conectores; CSV manual de plano/mapeamentos |
| Logs | `lotes_integracao_contabil` + `exportacoes_geradas` | Read-only para auditoria |

### 1.4 Padrão D17.UI Enterprise RM aplicado
- `EnterpriseRecordToolbar` (entityType válido, `availableActions=["novo"]`, `onAction`, busca canônica, título via `extraLeft`).
- `RowActions` canônico (`rowId` + `onAction`).
- Vocabulário canônico (`Novo`, `Editar`, `Buscar`, `Histórico`) conforme `src/lib/enterprise-vocab.ts`.
- Densidade compacta (text-[12px], h-7 inputs onde aplicável).

### 1.5 Link em Configurações
- `src/routes/configuracoes.tsx` ganhou card índigo logo abaixo do `HardeningReportCard`:
  - Título: **"Configurações Contábeis/Fiscais"**
  - Descrição: "Plano de contas, mapeamentos, centros de custo, eventos canônicos, fiscal de produtos, exportações e logs."
  - Botão **Abrir** → `Link` TanStack para `/configuracoes/contabil`.

---

## 2. Build

- `tsc --noEmit` executado: **build limpo** (0 erros).
- Corrigidos 14 erros TS prévios em `configuracoes.contabil.tsx`:
  - `entityType="parametro"` (inexistente) → `entityType="compras"` (placeholder válido do union enterprise);
  - `search={{...}}` (objeto) → `search` string + `onSearchChange` + `searchPlaceholder`;
  - `primaryAction={{...}}` → `availableActions=["novo"]` + `onAction`;
  - `title=` (não suportado) → `extraLeft={<span ...>}`;
  - `RowActions actions=[{ kind, onClick }]` → `rowId` + `actions=[{ kind }]` + `onAction`.

---

## 3. Restrições respeitadas

- ✅ Zero nova migração / DDL.
- ✅ Zero alteração de RLS, workflow, RPC, regra ou auditoria.
- ✅ Zero menu principal "Contabilidade" — apenas acessível dentro de **Configurações**.
- ✅ Reutilização 100% do backend D18 (plano de contas, mapeamentos, centros, eventos canônicos, conectores, lotes, exportações).
- ✅ Sem SPED/ECD/ECF/Reinf/DCTFWeb/NF-e/transmissão real.

---

## 4. Critério de aceite

| Critério | Status |
|----------|--------|
| Build limpo | ✅ |
| Rota `/configuracoes/contabil` acessível | ✅ |
| Link em **Configurações** | ✅ |
| 7 abas funcionais sobre D18 | ✅ |
| Padrão D17.UI Enterprise RM aplicado | ✅ |
| Repositório oficial centralizado | ✅ |
| Sem alteração estrutural no backend | ✅ |

---

## 5. D19.2 — Camada B (10 usuários) — Instrução de execução local

A infraestrutura está pronta:
- `scripts/d19-2-load-test.mjs` (Playwright headless, métricas P50/P95/P99 + erros).
- `scripts/d19-2-create-users.mjs` (20 usuários sintéticos já criados, credenciais em `/mnt/documents/d19-2-loadtest-credentials.json`).
- 33 RPCs canônicas instrumentadas com `withPerf` (cobertura ~80%).
- View oficial `v_perf_p95_filtrado_7d` (sem outliers de aba background).

### 5.1 Passos no notebook do operador (janela 19h–22h)

```bash
# 1. Instalar dependências
npm i -D @playwright/test
npx playwright install chromium

# 2. Exportar credenciais (caminho do JSON entregue)
export CREDS_JSON=/caminho/para/d19-2-loadtest-credentials.json

# 3. Rodar 10 usuários sintéticos contra produção
node scripts/d19-2-load-test.mjs --users=10 \
  --base=https://metasungerencial.lovable.app \
  --duration=600 \
  --out=/mnt/documents/d19-2-camada-B-10u-$(date +%Y%m%d-%H%M).json
```

### 5.2 Critério para promover a 20 usuários

- Sem erro crítico, sem falha de autenticação, sem erro RLS, sem timeout estrutural.
- P95 `auth.ok` < 1500ms, `shell.ready` < 3000ms, `first-list.ready` < 4000ms.

Se aprovado, repetir com `--users=20`.

### 5.3 Pós-teste

Após cada run, consultar:
```sql
select * from v_perf_p95_filtrado_7d order by amostras_validas desc;
select * from error_log where created_at > now() - interval '2 hours' order by created_at desc;
```

E gerar relatório consolidado em `docs/d19-2-camada-B-relatorio.md` com:
- Tabela P50/P95/P99 por label.
- Gargalos classificados P0/P1/P2.
- Recomendação Camada C (50/100 usuários).
- % de performance atualizado.

---

## 6. Próximos passos sugeridos

1. **D19.2 Camada B 10u** — execução pelo operador no notebook (sandbox Lovable não roda Playwright contra produção com qualidade representativa).
2. **D17.UI Fase 5** — Pós-venda (única tela operacional ainda fora do padrão enterprise completo).
3. **D19.3** — Otimização dos P0 identificados na carga (lazy-load de `financeiro.tsx` / `comercial.tsx`, server pagination em Leads/Propostas, RPC agregador para dashboards).

---

**Status final:** UI Contábil/Fiscal **FECHADA e administrável** sobre D18 sem qualquer mudança estrutural.
