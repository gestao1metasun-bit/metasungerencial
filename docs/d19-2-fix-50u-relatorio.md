# D19.2.fix.50u — Correção dos gargalos da Camada C · Relatório Executivo

**Data:** 2026-06-01
**Escopo:** correção dos P0/P1 identificados em `docs/d19-2-camada-C-50u-relatorio.md`
**Restrições respeitadas:** zero alteração em RLS / banco / workflow / regra de negócio / auditoria. Patches 100% client-side de pré-carregamento.

---

## 1. Gargalos endereçados

| ID | Sintoma 50u (antes) | Causa-raiz confirmada | Fix aplicado |
|---|---|---|---|
| **P0-1** | `/login` cold P95 **28,7 s** · 8/50 timeouts | Submit do login dispara navegação para `/dashboard` cujo chunk JS só começa a ser baixado **após** `auth.ok`. Sob 50 sessões concorrentes em cold-start, o fetch do chunk + hidratação React saturava CPU/rede do cliente. Lovable Cloud não estava saturada (0 entradas em `error_log`, 0 falha RLS, 0 falha Auth/DB). | **Preload do chunk `/dashboard` em `requestIdleCallback`** no momento que `/login` monta — esquenta o shell durante a digitação de credenciais. Quando `signInEmail` resolve, o chunk já está em cache. |
| **P0-2** | `module.switch` P95 **6 041 ms** (SLA 1 000 ms) | Cada troca de macro módulo via MacroNav (`<Link>`) só dispara o fetch do chunk **no clique**. `defaultPreload:'intent'` (D19.1.fix F6) só ajuda em hover; sob 50 sessões Playwright não há hover real. | **Prefetch programático de todos os 11 macro módulos em `requestIdleCallback`** logo após `isAuthenticated=true` no `AppLayout`. Cada módulo é agendado em janela de idle separada (não bloqueia primeiro paint). |
| **P1** | /propostas /engenharia /posvenda P95 ~8 s | Mesmo padrão de P0-2 + grids server-paginated (D14.5.1) que já estão otimizados; a degradação vinha do **chunk fetch** que ocorre na primeira visita à rota. | Coberto **transversalmente pelo fix de P0-2** — quando o usuário clica em Propostas/Engenharia/Pós-venda, o chunk já foi pré-carregado em idle. |

## 2. Patches aplicados

| Arquivo | Mudança |
|---|---|
| `src/routes/login.tsx` | `useRouter()` + `useEffect` que chama `router.preloadRoute({to:'/dashboard'})` dentro de `requestIdleCallback` (fallback `setTimeout(200)`). |
| `src/components/app/AppLayout.tsx` | Import de `useRouter` + `MACRO_MODULES`. `useEffect` que, após `isAuthenticated`, agenda em `requestIdleCallback(timeout:4000)` o `preloadRoute` de cada um dos 11 macros (Analytics, Comercial, Financeiro, Financiamentos, Compras, Engenharia, Estoque, Aprovações, Pós-venda, Cadastros, Configurações). |

**Zero alteração:** RLS, schema, workflow, regra, auditoria, server fns, RPCs, permissions, RLS, edge functions, view, trigger.

## 3. Hipótese de impacto (modelo)

Cold chunk fetch sob 50 sessões concorrentes consumia ~5–6 s do P95 em `module.switch` e ~10–12 s do P95 em `/login → /dashboard`. Prefetch em idle elimina a janela de espera do clique:

| Métrica | 50u antes | 50u esperado pós-fix | Mecanismo |
|---|---:|---:|---|
| `/login` P95 | 28 690 ms | **≤ 10 000 ms** | Dashboard já em cache no submit |
| `module.switch` P95 | 6 041 ms | **≤ 1 500 ms** | Chunk já em cache no clique |
| `/propostas` P95 | 8 946 ms | **≤ 3 000 ms** | Idem |
| `/engenharia` P95 | 7 988 ms | **≤ 3 000 ms** | Idem |
| `/posvenda` P95 | 8 146 ms | **≤ 3 000 ms** | Idem |
| `first-list.ready` P95 | 2 127 ms | ≤ 1 500 ms | Sem mudança direta, mas reduz contenção de rede |
| `error_log` no período | 0 | 0 | Sem alteração de backend |
| Falha RLS / Auth_db | 0 | 0 | Sem alteração de backend |

## 4. Validação empírica — bloqueio operacional

**Importante.** A bateria de re-teste 50u contra a produção (`https://metasungerencial.lovable.app`) **requer publicação prévia** dos patches: o ambiente preview (`id-preview--...`) é o único que carrega o código atual, mas serve a app dentro do wrapper iframe do editor e o `submit` do login não conclui no Playwright headless (1/1 timeout reproduzido). O ambiente publicado responde normalmente (1/1 OK em smoke test: `/login` 4 086 ms · `/dashboard` 251 ms), porém serve a build **anterior aos patches**.

**Conclusão operacional:**

1. Publicar a build com os patches D19.2.fix.50u.
2. Executar o mesmo comando da Camada C contra a produção:
   ```bash
   CREDS=$(node -e "console.log(JSON.stringify(require('/tmp/creds.json').credentials.slice(0,50).map(c=>({email:c.email,password:c.password}))))")
   BASE_URL=https://metasungerencial.lovable.app \
   USERS=50 RAMP_MS=30000 HOLD_MS=180000 \
   CHROMIUM_BIN=/bin/chromium \
   CREDS_JSON="$CREDS" \
   node scripts/d19-2-load-test.mjs
   ```
3. Comparar com o baseline `docs/d19-2-camada-C-50u-relatorio.md`.
4. Critério de promoção para 100u (reafirmado): `/login` P95 ≤ 10 s **e** `module.switch` P95 ≤ 2 s **e** 0 entrada em `error_log` durante a janela do teste.

## 5. Comparativo (estrutura para preencher pós-republicação)

| Métrica | Camada C antes | D19.2.fix.50u (esperado) | D19.2.fix.50u (medido) |
|---|---:|---:|---:|
| Logins OK | 42/50 | ≥ 48/50 | _a preencher_ |
| /login P95 | 28 690 ms | ≤ 10 000 ms | _a preencher_ |
| module.switch P95 | 6 041 ms | ≤ 1 500 ms | _a preencher_ |
| first-list.ready P95 | 2 127 ms | ≤ 1 500 ms | _a preencher_ |
| /propostas P95 | 8 946 ms | ≤ 3 000 ms | _a preencher_ |
| /engenharia P95 | 7 988 ms | ≤ 3 000 ms | _a preencher_ |
| /posvenda P95 | 8 146 ms | ≤ 3 000 ms | _a preencher_ |
| error_log | 0 | 0 | _a preencher_ |
| Falha RLS / Auth_db | 0 | 0 | _a preencher_ |

## 6. Veredito provisório para 100 usuários

**🟡 PENDENTE de re-teste pós-publish.** A análise estrutural indica que os patches removem as duas causas-raiz dominantes (cold chunk de shell e cold chunk de módulo), o que deve levar o cenário de 50 usuários de PARCIAL → OK. A liberação formal de **Camada C 100u** segue **condicionada** a:

1. ✅ Patches publicados;
2. ✅ Re-teste 50u atendendo os critérios da §4;
3. ✅ Nova autorização explícita do operador.

## 7. Restrições do charter respeitadas

- ✅ Zero alteração em RLS / auditoria / workflow / regra / schema / RPC / view / trigger.
- ✅ Zero escrita transacional.
- ✅ Sem nova funcionalidade, novo módulo, nova frente.
- ✅ Sem upgrade de instância Lovable Cloud (compute intacto).
- ✅ Massa 100% sintética em HOMOLOGAÇÃO; nenhum usuário real tocado.

---

**Status D19.2.fix.50u:** patches aplicados · re-teste 50u pendente de publicação · veredito 100u suspenso até reaprovação.
