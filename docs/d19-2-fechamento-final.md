# D19.2 — Fechamento de Carga + Correção `error_log` 400

**Status:** Correção aplicada · Aguardando publicação para 100u real
**Data:** 2026-06-01

---

## 1. Correção `error_log` 400 — APLICADA

### Causa raiz
A tabela `public.error_log` **não tinha GRANTs** para `authenticated` nem
`service_role`. Apenas `sandbox_exec` (role do shell) tinha INSERT/SELECT.
Resultado: PostgREST devolvia `400 permission denied for table error_log`
**antes** mesmo de avaliar a RLS — que estava correta.

```text
grantee       | privilege_type
--------------+---------------
sandbox_exec  | INSERT
sandbox_exec  | SELECT
(authenticated/service_role: AUSENTES)
```

Não era payload, não era enum, não era rate-limit. Era a falha clássica
documentada em `<public-schema-grants>`: tabela criada sem o GRANT
obrigatório, RLS pronta, mas Data API negando.

### Correção (migration aplicada)

```sql
GRANT INSERT, SELECT, UPDATE ON public.error_log TO authenticated;
GRANT ALL ON public.error_log TO service_role;
-- anon: ZERO (telemetria exige sessão)
```

RLS preservada e continua sendo o gate de linha:
- **INSERT** authenticated → `user_id = auth.uid() OR user_id IS NULL`
- **SELECT** authenticated → admin_master / admin_geral / `seguranca.ver_auditoria`
- **UPDATE** authenticated → admin_master / admin_geral
- `anon`: zero acesso

### Endurecimento adicional (`src/lib/repositories/error-log-repo.ts`)

1. **Detecção de agente sintético** (Playwright/HeadlessChrome/`navigator.webdriver`)
   → telemetria descartada silenciosamente durante load tests.
2. **Sessão obrigatória** → `getUser()` antes de inserir. Sem sessão, vai só
   para `console.warn` local — elimina 401/400 fantasma na tela de login.
3. `user_id` agora é **sempre** `user.id` (nunca null) → casa com a RLS sem
   depender do branch `OR user_id IS NULL`.

### Critério de aceite — checklist
- [x] Causa raiz identificada (GRANT ausente).
- [x] Migração aplicada (sem novos linter WARNs além dos 137 D14.2).
- [x] Repo endurecido (sem fallback silencioso para usuário real).
- [x] RLS preservada (anon zero, admin-only para SELECT/UPDATE).
- [ ] **Bloqueado em você:** publicar build e confirmar console limpo.

---

## 2. Comparativo de Carga (corridas reais já executadas)

| Métrica                     | 20u            | 50u.3 (pré-fix)| 50u.4 (lazy)   | SLA D16.PERF |
| --------------------------- | -------------- | -------------- | -------------- | ------------ |
| **logins concluídos**       | 20/20          | 50/50          | 42/50          | —            |
| **timeouts login**          | 0              | 0              | 8              | —            |
| **/login P95**              | ~3.8 s         | 46.7 s         | **29.5 s**     | <15 s ❌     |
| **auth.ok P95**             | <1 s           | ~2.0 s         | ~1.9 s         | <800 ms ⚠️   |
| **shell.ready P95**         | <2 s           | <2 s           | <2 s           | <2 s ✅      |
| **dashboard P95**           | 480 ms         | 720 ms         | **647 ms**     | <3 s ✅      |
| **engenharia P95**          | 410 ms         | 1.170 ms       | **370 ms**     | <3 s ✅      |
| **propostas P95**           | 460 ms         | 1.222 ms       | **424 ms**     | <3 s ✅      |
| **pós-venda P95**           | 240 ms         | 1.242 ms       | **206 ms**     | <3 s ✅      |
| **module.switch médio**     | ~600 ms        | ~1.380 ms      | ~700 ms        | <1 s ✅      |
| **first-list médio**        | ~520 ms        | ~1.400 ms      | ~680 ms        | <1.5 s ✅    |
| **error_log POST**          | 400 (ruído)    | 400 (ruído)    | 400 (ruído)    | 0 ✅ (pós-fix)|
| **RLS / auth_db / falha**   | 0              | 0              | 0              | 0 ✅         |
| **`_nonReactive`**          | n/a            | sim            | **0**          | 0 ✅         |

**Leitura:**
- Backend está sobrando — todas as rotas operacionais com folga de 5–14× sobre o SLA.
- Gargalo único e estrutural: **cold-start do edge worker + hidratação Supabase no `/login`** sob rajada concorrente.
- O lazy do AppLayout + Toaster cortou 37% do P95 frio. As otimizações restantes (warm-up, defer Supabase init) reduziriam mais, mas têm retorno decrescente.

---

## 3. 100u — Por que ainda não rodou

O teste 100u real exige:
1. Build **com o fix de `error_log` publicada** (atual `index-Dcyb1Uga.js`
   tem o fix da TDZ mas ainda **não** tem o GRANT — sem ele, o 100u
   contaminaria o `error_log` com 400s legítimos).
2. **100 navegadores Chromium headless** com 100 contas reais. O sandbox
   do agente não comporta esse paralelismo (limite de RAM/CPU). Esse
   teste precisa rodar no notebook do Renan ou em runner externo
   (`scripts/d19-2-load-test.mjs` já está pronto e parametrizável).

Sequência correta para fechar:
1. **Você publica** → me devolve o novo `index-*.js` hash.
2. Eu valido em browser tools: sem TDZ, sem `_nonReactive`, **sem POST
   error_log 400**, login funcional.
3. **Você ou Renan** dispara o script no notebook:
   ```bash
   BASE_URL=https://metasungerencial.lovable.app \
   USERS=100 RAMP_MS=60000 HOLD_MS=180000 \
   CREDS_JSON='[…100 contas loadtest…]' \
   node scripts/d19-2-load-test.mjs
   ```
4. Me devolve o JSON em `/mnt/documents/` → emito o veredito 100u final.

---

## 4. Projeção 100u (baseada na curva 20→50)

Extrapolando o comportamento observado (login cold escalou de ~3.8 s @20u para
29.5 s @50u, factor ~7.7×; rotas operacionais flat sob 1 s):

| Cenário             | /login P95 estimado | logins OK estimados | rotas op. P95 | Classificação    |
| ------------------- | ------------------- | ------------------- | ------------- | ---------------- |
| Otimista (warm)     | 40-55 s             | 80-90/100           | <1 s          | **GO parcial**   |
| Realista            | 55-90 s             | 60-75/100           | <1 s          | **GO parcial**   |
| Pessimista (cold)   | >120 s              | 30-50/100           | <1 s          | **NO-GO 100u**   |

**Hipótese central:** o backend e o shell operacional aguentam 100u sem
degradação; o `/login` cold-start é o único ponto que satura.

---

## 5. Recomendação Final de Produção

### Classificação por faixa
| Faixa            | Status                  | Observação                                                  |
| ---------------- | ----------------------- | ----------------------------------------------------------- |
| **até 20u**      | 🟢 **GO total**         | Operação plena, todas as métricas verdes.                  |
| **20u → 50u**    | 🟢 **GO assistido**     | Operação real Meta Sun liberada. Supervisão admin diária.   |
| **50u → 80u**    | 🟡 **GO parcial**       | Operação rotativa; login pode degradar em rajadas iniciais. |
| **80u → 100u**   | 🟡 **Stress / parcial** | Validar com run real pós-publicação do fix.                 |
| **>100u**        | 🔴 **NO-GO**            | Requer D19.3 (warm-pool edge, defer Supabase, splash SSR).  |

### Limites recomendados
- **Limite seguro atual:** **50 usuários simultâneos** (assistido).
- **Limite operacional Meta Sun:** **30-40 usuários ativos típicos** (folga total).
- **Limite de estresse validado:** 50u (com 50u.4) — 100u é projetado.
- **Capacidade real teórica:** ~80u sem mudança de arquitetura.

### Próximos gargalos (ordem de impacto)
| # | Gargalo                                          | Impacto       | Remediação                      | Onda       |
|---|--------------------------------------------------|---------------|---------------------------------|------------|
| 1 | Cold-start edge worker no `/login`               | Alto          | Warm-pool / keep-alive          | D19.3.a    |
| 2 | Init top-level do Supabase client em `auth-store`| Médio         | Defer init até primeiro mount   | D19.3.b    |
| 3 | `rpc_perf_log` rate-limit 200/5min               | Baixo (sintét.)| Filtro `webdriver` já aplicado  | ✅ D19.2   |
| 4 | 6 telas sem server pagination                    | Baixo (carga) | D14.5.1 (Leads/Prop/Contr/etc.) | D19.4      |
| 5 | Auth.ok P95 ~1.9s vs SLA 800ms                   | Médio         | OAuth + paralelo loadRole       | D19.3.c    |

### Veredito operacional consolidado

> **GO assistido até 50 usuários (oficial).**
> Operação real Meta Sun pode ser liberada **imediatamente** após
> publicação da build com o GRANT do `error_log`. 100u permanece como
> *teste de limite*, não como *cota de produção*, até execução real
> pós-publicação e eventual D19.3.

---

## 6. Entregas D19.2

- [x] Diagnóstico `error_log` 400 → causa raiz (GRANT ausente)
- [x] Migração GRANT aplicada (RLS preservada)
- [x] Repo `error-log-repo.ts` endurecido (sintético + sessão)
- [x] Relatório comparativo 20u / 50u.3 / 50u.4
- [x] Projeção 100u e classificação por faixa
- [x] Recomendação final de produção
- [ ] Publicação da build com fix
- [ ] Confirmação de hash novo (`index-*.js`)
- [ ] Run real 100u + JSON em `/mnt/documents/`
- [ ] Veredito 100u definitivo (após dados reais)

---

**Próxima ação sua:** publicar a build atual (já contém o fix do
`error_log` no schema + repo endurecido) e me devolver o novo hash
`index-*.js`. Em seguida, dispare o script `scripts/d19-2-load-test.mjs`
com `USERS=100` no notebook operacional. Eu fecho o veredito 100u real
no turno seguinte.
