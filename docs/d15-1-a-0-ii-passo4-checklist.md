# D15.1.a.0.ii — Passo 4 (Checklist de Execução)

Pré-condição: snapshot oficial do Renan recebido em `/docs/d15-1-a-0-ii-snapshot-<data>-<hash>.json`.

## 1. Validação de integridade
- [ ] Arquivo salvo em `/docs/` com nome canônico
- [ ] Hash declarado registrado no §6 do `snapshot-manifest.md`
- [ ] `schema_version === 'd15-snapshot/v2-ampliado'`
- [ ] `manifest.operador.nome === 'Renan Barcelos'`

## 2. Execução do dry-run estendido
```bash
bun run scripts/d15-dry-run-compare.ts docs/d15-1-a-0-ii-snapshot-<arq>.json
```
Saídas:
- `docs/d15-1-a-0-ii-dry-run-report-<stamp>.md`
- `docs/d15-1-a-0-ii-dry-run-detail-<stamp>.json`

## 3. Critérios de aceite (gate)
- [ ] Hash recomputado confere ✅
- [ ] Paridade global ≥ 95%
- [ ] Bloqueantes globais = 0
- [ ] Readiness Dual Read = ✅ SIM
- [ ] Domínio `financeiro` sem bloqueantes (libera Onda 1.B)
- [ ] Domínio `auditoria` com eventos > 0 (não pode estar vazio — Onda 5)
- [ ] Domínio `comercial_contratos` mapeado (Onda 3)
- [ ] Domínio `cadastros_identidade` mapeado (Onda 2)

## 4. Relatórios obrigatórios
- [ ] Cobertura por domínio (§0 do report)
- [ ] Categorias agregadas (§10 do report)
- [ ] Prontidão por onda (§12 do report)
- [ ] Divergências previstas listadas em §13
- [ ] `chaves_extras` (catch-all v2) revisadas — toda chave nova deve ir para `CHAVES_POR_DOMINIO`

## 5. Atualização de memória + manifesto
- [ ] Hash + paridade gravados em `mem://features/d15-1-a-0-ii-snapshot-canonico`
- [ ] Append-only no §6 do `snapshot-manifest.md`
- [ ] Resultado do dry-run gravado em `mem://features/d15-1-a-0-ii-dry-run` (nova run)

## 6. Liberação para próxima onda
- [ ] Se readiness ✅ SIM → libera **Onda 2 (Cadastros Canônicos)**
- [ ] Se readiness ❌ NÃO → abrir frente de remediação por domínio antes de qualquer onda nova
- [ ] Onda 1.B só inicia com financeiro 100% verde + decisão formal de janela

## Restrições mantidas
- ❌ Não executar Onda 2 antes do gate verde
- ❌ Não ativar flags D15_*
- ❌ Não tocar UI/stores
- ❌ Não migrar dado real
