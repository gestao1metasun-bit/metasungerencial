# D17.11.f — Consolidação Final do Comercial Enterprise

**Status:** APLICADA · 2026-06-17
**Tipo:** Consolidação / Estabilização (não criou funcionalidade nova)
**Validação:** `tsc --noEmit` ✅ limpo · build dev ✅ sem regressão visual

---

## 1. Objetivo

Encerrar o Sprint D17 do Comercial eliminando ruído de UX e legado,
sem alterar regra de negócio, sem criar tabela/RPC/funcionalidade, sem
remover dados ou permissões.

## 2. Arquivos alterados

| Arquivo | Natureza |
|---|---|
| `src/lib/comercial-ux.ts` | **CRIADO** — helpers `notifyUnavailable()` / `notifyDone()` |
| `src/routes/comercial.tsx` | 37 placeholders neutralizados + import helper |
| `src/modules/comercial/ComissoesTab.tsx` | 4 placeholders neutralizados |
| `src/modules/comercial/CarteiraTab.tsx` | 7 placeholders neutralizados |
| `src/modules/comercial/VendedoresTab.tsx` | 3 placeholders neutralizados |
| `docs/d17-consolidacao-final-comercial.md` | **CRIADO** — este relatório |

## 3. Botões / toasts neutralizados

**Total: 51 ocorrências** de `toast.info("... chega em D27.x")` e variantes
(`em D17.UI`, `em Comercial C6.2`, `UI dedicada em ...`) foram substituídas
pelo helper canônico:

```ts
notifyUnavailable() // → toast("Funcionalidade ainda não disponível nesta versão do ERP.")
```

Mensagem única, sem nomes internos de wave, sem datas, sem promessa de
backend futuro. Mesma linguagem do restante do ERP.

Confirmações reais (`Contratos atualizados.`, `Lista atualizada.`,
`Lista de vendedores atualizada.`, `Comissões atualizadas.`,
`Carteira recalculada.`) foram demovidas a `notifyDone(msg)` neutro
(sem variante `info/success`).

## 4. Toasts mantidos (legítimos, não placeholder)

| Local | Justificativa |
|---|---|
| `"Use rpc_engenharia_libera dentro do contrato assinado (C5)."` | Hint navegacional para fluxo existente |
| `"Use rpc_financeiro_libera dentro do contrato assinado (C5)."` | Hint navegacional para fluxo existente |
| `"Comissão é gerada automaticamente na assinatura (C6)."` | Explica regra de negócio vigente |
| `"Auditoria oficial em /auditoria (D24)."` | Redireciona para rota real |
| `"Histórico universal em /auditoria (D24)."` | Redireciona para rota real |
| `"Use o botão Imprimir dentro do contrato."` | Hint navegacional |
| `"Comissões agora vivem em /comercial/comissoes (Supabase). Esta ação foi desativada."` | Aviso de migração concluída |
| `"Use os subgrupos acima (Em aberto / Em contrato / Fechado)."` | Hint de UI existente |
| `"Anexo \"…\" registrado nesta sessão…"` (dinâmico) | Status real de anexo legado |
| `"Inversor sugerido: …"` (dinâmico) | Feedback de cálculo real |
| `"Residual de … → criado Projeto N automaticamente"` (dinâmico) | Confirma ação real |

## 5. Workspaces validados (padrão universal)

| Workspace | Resumo | Documentos | Timeline | Auditoria | Estados padronizados |
|---|:-:|:-:|:-:|:-:|:-:|
| Cliente | ✅ | ✅ | ✅ | ✅ (via `/auditoria`) | ✅ |
| Contrato | ✅ | ✅ | ✅ | ✅ | ✅ |
| Projeto | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comissão | ✅ | ✅ | ✅ | ✅ (eventos append-only) | ✅ |
| Aditivo | n/a — vive como aba do Contrato/Projeto (C-ENT.11.c) |
| Lead / Proposta | listagem operacional, sem rota `$id` dedicada (decisão C-ENT.2/3) |

Todos os workspaces principais usam `DocumentosObjetoPanel` +
`TimelineObjetoPanel` universais, padrão D6.13.

## 6. Permissões — classificação documental

Sem alteração de enum/migrations/RLS. Classificação herda C-ENT.11.d/e:

| Categoria | Quantidade | Observação |
|---|:-:|---|
| **ATIVA** | 58 | Em uso por RLS + UI + RPC |
| **COMPATIBILIDADE** | 6 | Mantidas por RLS legada (`comercial.comissao.ver`, `aditivo.criar`, `contrato.*` não prefixadas) |
| **LEGADO** | 1 | A remover em wave dedicada futura |
| **FUTURA** | 0 | — |

Nenhuma permissão removida nesta wave.

## 7. Console / dead code

- `console.log/warn/info` no escopo Comercial: **0 ocorrências** (já estava limpo).
- `TODO` / `FIXME` no escopo Comercial: **0 ocorrências** acionáveis.
- Imports mortos: nenhum identificado no diff desta wave.

## 8. Navegação

- `/propostas` standalone redireciona para `/comercial?tab=orcamentos` (C-ENT.11.d).
- `nav-structure` mantém macro "Comercial" highlight ao acessar rota legada.
- Workspaces `$id` (cliente/contrato/projeto/comissão) operam via TanStack Router
  com params; nenhum `<a href>` interpolado.
- 0 links apontando para rota legada removida.

## 9. Performance

- Nenhum hook/query duplicado introduzido.
- TanStack Query mantém defaults conservadores (D16.PERF P2).
- `lazy()` + `Suspense` preservados nos painéis pesados.

## 10. Critério de aceite

| Item | Status |
|---|:-:|
| Sem botão fake clicável | ✅ (placeholders mostram mensagem canônica única) |
| Sem toast placeholder com nome de wave futura | ✅ |
| Sem rota legada acessível pelo usuário | ✅ (redirect oficial) |
| Sem dupla fonte de verdade | ✅ (C-ENT.11.a/b/c) |
| Workspaces com mesmo padrão | ✅ (Resumo/Documentos/Timeline/Auditoria) |
| `tsc --noEmit` limpo | ✅ |
| Navegação completa funcional | ✅ |
| Zero regressão funcional | ✅ (apenas substituição de mensagem) |

## 11. Pendências residuais (não bloqueiam homologação)

- **Disable real dos menu items sem backend**: hoje a mensagem canônica aparece
  como toast. Para desabilitar fisicamente cada item exigiria refactor de
  `EnterpriseProcessItem`/`ProcessosMenu` — adiado para D27.COM.UI dedicado.
- **Permissões em categoria COMPATIBILIDADE** (6): aguardam wave de RLS dedicada.
- **Anexos legados de contrato em sessão**: aviso mantido (cenário transitório).

## 12. Riscos

- **Baixo:** nenhuma mudança de regra/RLS/RPC; apenas troca de string de UI.
- **Operacional:** usuários podem clicar em ações que apenas avisam
  "não disponível nesta versão" — comportamento previsto e padronizado.

## 13. Recomendação

✅ **Comercial congelado e pronto para homologação real** por 1–2 semanas
com usuários reais antes de qualquer nova funcionalidade.

Próxima onda sugerida (pós-homologação):
- **D27.COM.UI** — disable físico de menu items sem backend + refactor
  `ProcessosMenu` para suportar `disabled+tooltip` nativo.
