# Veredito Operação Assistida Real — Meta Sun ERP
**Data:** 2026-05-28  
**Base:** D15.1 (97,5% maturidade) + Sprint 1 D17.UI.4 (fundação) + D16.PERF P1+P2.

---

## 1. UI Enterprise chegou a 98%?

**NÃO.** Real: **~42% ponderado por uso operacional.**

- ✅ Fundação 100%: kit completo no barrel + helper universal `useEnterpriseGrid` + `EnterprisePageShell`.
- ✅ Telas-referência (Financeiro Títulos, Estoque): 90-100%.
- ❌ 9 dos 11 módulos pedidos ainda usam toolbar/grid legados (Comercial, Contratos, PV, Compras, Engenharia, OS, Financiamentos, Pós-venda, Configurações).
- 🟡 Aprovações (75%), Adiantamentos (80%): perto, faltam ajustes pontuais.

Ver `docs/d17-ui-relatorio-98.md` para matriz por módulo.

---

## 2. Performance chegou a 98%?

**NÃO.** Real: **~80-83%.**

- ✅ Telemetria base (P1+P2): 6 de 8 marks; painel `/analytics/performance` operando.
- ✅ Otimização front (lazy, splitting, QueryClient enxuto): aplicada.
- 🟡 3 SLAs verdes, 3 amarelos.
- ❌ `filter.applied` e `record.saved` não instrumentados.
- ❌ Teste de carga sintético não executado (depende de OS materializada).

Ver `docs/d16-perf-relatorio-98.md` para SLAs + gargalos.

---

## 3. ERP está pronto para operação assistida real?

### SIM, com as 3 condições já documentadas em D15.1:

1. **Supervisão admin ativa** durante a janela operacional.
2. **Lançamentos só via RPC oficial** (`rpc_lancamento_criar`, `rpc_op_fin_*`, `rpc_contrato_assinar`, etc.) — UI nunca grava direto.
3. **Monitoramento diário** dos painéis:
   - `/analytics/saude-sistema` (12 KPIs)
   - `/analytics/saude-dados` (KPIs oficiais vs reconciliação)
   - `/analytics/governanca` (matriz + pendências)
   - `/analytics/erros` (error_log)
   - `/analytics/performance` (P50/P95)

### Por quê não é "operação autônoma plena":

- **UI**: telas que ainda dependem do padrão antigo geram fricção operacional e atrasam adoção. Risco baixo (segurança e dados estão em backend), risco médio em produtividade.
- **PERF**: sem dado real sob carga; SLAs amarelos podem se degradar com 10+ usuários simultâneos.
- **TESTES E2E**: ainda em 25% (D15 Completion Gate). Mudanças amplas precisam de homologação manual.

---

## 4. O que depende exclusivamente de uso real

Itens que **só podem ser validados em produção assistida**:

1. **Comportamento sob 10+ usuários simultâneos** — P95 só vira número confiável com tráfego real.
2. **Volumes reais** — `v_perf_p95_7d` precisa de 7 dias × 5+ usuários produtivos.
3. **Casos de borda nos fluxos críticos** — assinatura → comissão → liberação Eng/Fin, renegociação, estorno em cascata, anexos volumosos.
4. **Tempo de adoção da UI nova vs hábitos antigos** — telas antigas convivendo com novas.
5. **Falhas de integrabilidade fiscal/contábil** — campos de-para existem mas integração externa não foi exercitada com volume.
6. **Comportamento de carteira/transferência em lote** quando lotes reais ultrapassarem 100 registros.

---

## 5. Gate go/no-go

| Critério | Estado | Decisão |
|---|---|---|
| Backend 100% Supabase, RLS + auditoria + idempotência | ✅ | GO |
| Permissões + governança matrix ativa | ✅ | GO |
| Lançamentos só via RPC | ✅ | GO |
| Monitoramento (5 painéis) | ✅ | GO |
| UI enterprise em telas-chave | 🟡 (Financeiro/Estoque sim, restante não) | GO **assistido** |
| Performance medida e estável | 🟡 (parcial) | GO **assistido** |
| Teste E2E ≥ 60% | ❌ (25%) | NO GO para autônomo |
| Teste de carga real | ❌ | NO GO para autônomo |

**Decisão final:**  
✅ **GO para operação assistida real** (já era a decisão de D15.1 e continua válida).  
❌ **NO GO para operação autônoma ampla** sem completar Sprint 2 (UI) + Sprint 3 (perf + carga).

---

## 6. Próximas ondas oficiais (caminho para 98% real)

| Onda | Escopo | Esforço estimado |
|---|---|---|
| D17.UI.2 | Contratos no padrão RM | 1 turno |
| D17.UI.3a | Pedido de Venda no padrão RM | 1 turno |
| D17.UI.3b | Comercial (Propostas+Leads) no padrão RM | 2 turnos |
| D17.UI.4a | Compras / Solicitações | 1 turno |
| D17.UI.4b | Engenharia | 2 turnos (após OS materializada) |
| D17.UI.5a | Financiamentos | 1 turno |
| D17.UI.5b | Aprovações fechar 25% restante | 1 turno |
| D16.PERF P3 | `filter.applied` + `record.saved` + view tuning | 1 turno |
| D16.PERF P4 | Code split rotas pesadas | 1 turno |
| D16.PERF P5 | Carga sintética parcial (títulos + audit) | 1 turno |
| D16.PERF P6 | 7 dias de coleta real + ajuste fino | uso real |

**Total estimado para 98% UI + 98% PERF:** 11 turnos + 1 semana de coleta real.
