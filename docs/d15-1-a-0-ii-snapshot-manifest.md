# D15.1.a.0.ii — Snapshot Canônico do Financeiro (Manifesto Oficial)

> Documento oficial de proveniência do snapshot LS → Supabase.
> Pré-requisito obrigatório para qualquer dry-run, dual-read ou corte.

---

## 1. Fonte canônica oficial

| Campo | Valor oficial |
|---|---|
| **Operador oficial** | **Renan Barcelos** — Gerência / Financeiro |
| **Máquina oficial** | Notebook/PC principal utilizado diariamente na operação financeira da Meta Sun |
| **Navegador oficial** | Google Chrome |
| **Perfil do navegador** | Perfil principal operacional/logado da Meta Sun (uso diário financeiro) |
| **Origem URL** | `https://metasungerencial.lovable.app` (produção publicada) |
| **Versão ERP** | _a registrar no momento do export (ver checklist §4)_ |

### Diretriz canônica
- O snapshot oficial **só** vale se exportado desta máquina + perfil.
- Outras máquinas podem ter stores divergentes — **não são fonte canônica**.
- Em caso de divergência futura, o snapshot Renan/Chrome principal **prevalece**.
- A validação real de paridade ocorre em D15.1.a.0.iii (dual-read + feature flag).

---

## 2. Janela de congelamento

| Campo | Valor |
|---|---|
| **Data** | _a definir no dia da execução do dry-run_ |
| **Horário sugerido** | Após encerramento operacional — **19h às 22h** |
| **Duração estimada** | 30 a 60 minutos |
| **Regra** | Zero mutação financeira durante a janela |

### Bloqueios durante a janela (todas as máquinas)
- ❌ Não criar títulos
- ❌ Não baixar contas (pagar/receber)
- ❌ Não renegociar
- ❌ Não alterar registros financeiros
- ❌ Não gerar movimentações
- ❌ Não operar contas a pagar/receber
- ❌ Não conciliar
- ❌ Não importar boletos/extratos

> A janela só é "fechada" quando o snapshot estiver salvo + hash registrado.

---

## 3. Stores a exportar (10 chaves — íntegras)

```
# Repositório financeiro (camada "repo")
fin-titulos
fin-renegociacao
fin-estornos
fin-adiantamentos
fin-compras
fin-conciliacao

# Módulo Lançamentos (camada legacy LS — decisão D15: vira visão derivada após corte)
metasun.fin.lancamentos.v1
metasun.fin.recorrentes.v1
metasun.fin.centros.v1
metasun.fin.naturezas.v1
```

Regras:
- **Bruto, sem transformação.** Nenhum normalize, nenhum map, nenhum trim.
- **Íntegro.** Mesmo registros marcados como deletados / cancelados / rascunho.
- **Completo.** Se a chave existir no `localStorage`, entra no snapshot.

---

## 4. Procedimento oficial de export (Renan / Chrome principal)

### Passo 1 — Preparar
1. Avisar equipe: janela de congelamento iniciada.
2. Fechar todas as outras abas do Meta Sun.
3. Confirmar que está logado com o usuário operacional principal.
4. Abrir `https://metasungerencial.lovable.app/financeiro`.
5. Aguardar página carregar 100% (sem spinners).

### Passo 2 — Abrir DevTools
- `F12` ou `Ctrl+Shift+I`
- Aba **Console**

### Passo 3 — Executar script de export
Colar o script `scripts/d15-snapshot-export.js` (ver §5) no console e pressionar Enter.

O script:
- lê as 6 stores brutas do `localStorage`;
- monta o envelope canônico com metadados (operador, máquina, versão, timestamp, hash SHA-256);
- imprime o JSON pronto para salvar;
- oferece download automático do arquivo `d15-1-a-0-ii-snapshot-{YYYYMMDD-HHmm}-{hash8}.json`.

### Passo 4 — Salvar arquivo
Salvar o arquivo baixado em:
```
/docs/d15-1-a-0-ii-snapshot-{YYYYMMDD-HHmm}-{hash8}.json
```
(commitar no repositório — é artefato auditável)

### Passo 5 — Registrar no log oficial
Preencher §6 abaixo com:
- nome do arquivo;
- hash completo;
- data/hora exata do export;
- versão ERP (visível no rodapé do app);
- observações (qualquer anomalia notada).

### Passo 6 — Encerrar janela
Avisar equipe: operação financeira liberada.

---

## 5. Script de export

Caminho: `scripts/d15-snapshot-export.js`

Uso: copiar o conteúdo e colar no Console do Chrome do operador canônico,
estando logado em `https://metasungerencial.lovable.app`.

O script é **read-only sobre o localStorage** — não escreve, não muta, não envia para servidor.
Apenas lê, empacota, calcula hash SHA-256 (Web Crypto API) e oferece download.

---

## 6. Registro oficial de snapshots

> Preencher após cada execução. Histórico append-only.

| # | Arquivo | Hash SHA-256 | Data/hora | Operador | Versão ERP | Observações |
|---|---|---|---|---|---|---|
| _vazio_ | _aguardando primeiro export_ | — | — | Renan Barcelos | — | — |

---

## 7. Validações obrigatórias do dry-run (após snapshot)

Comparar snapshot vs Supabase (somente leitura):

- [ ] quantidade de títulos
- [ ] saldo aberto total
- [ ] contas a pagar (total e qtd)
- [ ] contas a receber (total e qtd)
- [ ] renegociações
- [ ] provisões
- [ ] abatimentos
- [ ] taxas
- [ ] boletos
- [ ] fornecedores
- [ ] anexos
- [ ] status (distribuição)
- [ ] vínculos (PV, contrato, obra, cliente)
- [ ] movimentações
- [ ] conciliação

### Categorias do relatório final
`OK | DIVERGENTE | ÓRFÃO | INCOMPATÍVEL | CONVERTIDO | TRUNCADO | INVÁLIDO | SEM_DESTINO | PERDA_POTENCIAL | DUPLICIDADE | STATUS_INVÁLIDO | NATUREZA_INVÁLIDA | CENTRO_RESULTADO_INVÁLIDO`

---

## 8. Critério de liberação para D15.1.a.0.iii (Dual Read + Feature Flag)

Só liberar quando:

- [ ] snapshot íntegro salvo e versionado (§6 preenchido)
- [ ] paridade aceitável documentada
- [ ] divergências conhecidas listadas e justificadas
- [ ] perda = zero **ou** perda justificada e aprovada
- [ ] rollback possível (snapshot preserva 100% do estado pré-corte)

---

## 9. Restrições absolutas desta sub-onda (a.0.ii)

Durante o dry-run **proibido**:

- ❌ swap de fonte
- ❌ corte do localStorage
- ❌ alteração de UI
- ❌ escrita operacional em `titulos_financeiros` ou correlatas
- ❌ desligamento do `useRepoTitulos`
- ❌ migração real de dados

**Permitido somente:** leitura, comparação, paridade, divergência, validação, relatório.
