import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export type SubTab = { value: string; label: string; group?: string; hidden?: boolean; icon?: string };

/**
 * Grupos padronizados em todo o ERP:
 *  - "Visão"     → painéis, indicadores, leitura
 *  - "Operação"  → fluxos do dia a dia
 *  - "Controle"  → conciliação, fechamento, auditoria
 *  - "Estrutura" → cadastros estruturais e parâmetros (admin)
 *
 * Abas com `hidden: true` continuam acessíveis via URL mas não aparecem no
 * submenu lateral (legado / pouco usado).
 */
export const ROUTE_TABS: Record<string, { default: string; tabs: SubTab[] }> = {
  "/dashboard": {
    default: "visao",
    tabs: [
      { value: "visao", label: "Visão Geral", group: "Visão" },
      { value: "indicadores", label: "Indicadores", group: "Visão" },
    ],
  },

  // ── Macro módulo ANALYTICS (consolidado em 2026-05-28: paineis absorvido) ─
  "/analytics/comercial": {
    default: "funil",
    tabs: [
      { value: "funil", label: "Funil", group: "Comercial" },
      { value: "contratos", label: "Contratos", group: "Comercial" },
      { value: "propostas", label: "Propostas", group: "Comercial" },
      { value: "vendedores", label: "Vendedores", group: "Comercial" },
      { value: "conversao", label: "Conversão", group: "Comercial" },
    ],
  },
  "/analytics/financeiro": {
    default: "fluxo",
    tabs: [
      { value: "fluxo", label: "Fluxo de Caixa", group: "Financeiro" },
      { value: "titulos", label: "Títulos", group: "Financeiro" },
      { value: "inadimplencia", label: "Inadimplência", group: "Financeiro" },
      { value: "prev-real", label: "Previsto × Realizado", group: "Financeiro" },
      { value: "resultado", label: "Resultado Operacional", group: "Financeiro" },
    ],
  },
  "/analytics/engenharia": {
    default: "obras",
    tabs: [
      { value: "obras", label: "Obras", group: "Engenharia" },
      { value: "cronograma", label: "Cronograma", group: "Engenharia" },
      { value: "produtividade", label: "Produtividade", group: "Engenharia" },
      { value: "custos", label: "Custos", group: "Engenharia" },
      { value: "pendencias", label: "Pendências", group: "Engenharia" },
    ],
  },
  "/analytics/estoque": {
    default: "saldo",
    tabs: [
      { value: "saldo", label: "Saldo", group: "Estoque" },
      { value: "reservas", label: "Reservas", group: "Estoque" },
      { value: "entregas", label: "Entregas", group: "Estoque" },
      { value: "baixo", label: "Estoque Baixo", group: "Estoque" },
      { value: "custo", label: "Custo Estoque", group: "Estoque" },
    ],
  },
  "/analytics/financiamentos": {
    default: "carteira",
    tabs: [
      { value: "carteira", label: "Carteira", group: "Financiamentos" },
      { value: "bancos", label: "Bancos", group: "Financiamentos" },
      { value: "liberacoes", label: "Liberações", group: "Financiamentos" },
      { value: "prazos", label: "Prazos", group: "Financiamentos" },
      { value: "pendencias", label: "Pendências", group: "Financiamentos" },
    ],
  },
  "/analytics/aprovacoes": {
    default: "sla",
    tabs: [
      { value: "sla", label: "SLA", group: "Aprovações" },
      { value: "gargalos", label: "Gargalos", group: "Aprovações" },
      { value: "pendencias", label: "Pendências", group: "Aprovações" },
      { value: "setor", label: "Por Setor", group: "Aprovações" },
      { value: "aprovador", label: "Por Aprovador", group: "Aprovações" },
    ],
  },
  "/analytics/posvenda": {
    default: "chamados",
    tabs: [
      { value: "chamados", label: "Chamados", group: "Pós-venda" },
      { value: "garantias", label: "Garantias", group: "Pós-venda" },
      { value: "sla", label: "SLA", group: "Pós-venda" },
      { value: "recorrencias", label: "Recorrências", group: "Pós-venda" },
    ],
  },
  "/analytics/saude-dados": {
    default: "indicadores",
    tabs: [
      { value: "indicadores", label: "Indicadores", group: "Saúde dos Dados" },
    ],
  },
  "/analytics/governanca": {
    default: "matriz",
    tabs: [
      { value: "matriz", label: "Matriz", group: "Governança" },
      { value: "gaps", label: "Lacunas", group: "Governança" },
      { value: "resumo", label: "Resumo", group: "Governança" },
    ],
  },

  // ── Macro módulo DASHBOARDS (D6.E — alias legado, mesmas abas) ────────
  "/dashboards": {
    default: "geral",
    tabs: [
      { value: "geral", label: "Geral", group: "Visão Geral" },
      { value: "executivo", label: "Executivo", group: "Visão Geral" },
      { value: "indicadores", label: "Indicadores", group: "Visão Geral" },
    ],
  },
  "/dashboards/comercial": {
    default: "funil",
    tabs: [
      { value: "funil", label: "Funil", group: "Comercial" },
      { value: "contratos", label: "Contratos", group: "Comercial" },
      { value: "propostas", label: "Propostas", group: "Comercial" },
      { value: "vendedores", label: "Vendedores", group: "Comercial" },
      { value: "conversao", label: "Conversão", group: "Comercial" },
    ],
  },
  "/dashboards/financeiro": {
    default: "fluxo",
    tabs: [
      { value: "fluxo", label: "Fluxo de Caixa", group: "Financeiro" },
      { value: "titulos", label: "Títulos", group: "Financeiro" },
      { value: "inadimplencia", label: "Inadimplência", group: "Financeiro" },
      { value: "prev-real", label: "Previsto × Realizado", group: "Financeiro" },
      { value: "resultado", label: "Resultado Operacional", group: "Financeiro" },
    ],
  },
  "/dashboards/engenharia": {
    default: "obras",
    tabs: [
      { value: "obras", label: "Obras", group: "Engenharia" },
      { value: "cronograma", label: "Cronograma", group: "Engenharia" },
      { value: "produtividade", label: "Produtividade", group: "Engenharia" },
      { value: "custos", label: "Custos", group: "Engenharia" },
      { value: "pendencias", label: "Pendências", group: "Engenharia" },
    ],
  },
  "/dashboards/estoque": {
    default: "saldo",
    tabs: [
      { value: "saldo", label: "Saldo", group: "Estoque" },
      { value: "reservas", label: "Reservas", group: "Estoque" },
      { value: "entregas", label: "Entregas", group: "Estoque" },
      { value: "baixo", label: "Estoque Baixo", group: "Estoque" },
      { value: "custo", label: "Custo Estoque", group: "Estoque" },
    ],
  },
  "/dashboards/financiamentos": {
    default: "carteira",
    tabs: [
      { value: "carteira", label: "Carteira", group: "Financiamentos" },
      { value: "bancos", label: "Bancos", group: "Financiamentos" },
      { value: "liberacoes", label: "Liberações", group: "Financiamentos" },
      { value: "prazos", label: "Prazos", group: "Financiamentos" },
      { value: "pendencias", label: "Pendências", group: "Financiamentos" },
    ],
  },
  "/dashboards/aprovacoes": {
    default: "sla",
    tabs: [
      { value: "sla", label: "SLA", group: "Aprovações" },
      { value: "gargalos", label: "Gargalos", group: "Aprovações" },
      { value: "pendencias", label: "Pendências", group: "Aprovações" },
      { value: "setor", label: "Por Setor", group: "Aprovações" },
      { value: "aprovador", label: "Por Aprovador", group: "Aprovações" },
    ],
  },
  "/dashboards/posvenda": {
    default: "chamados",
    tabs: [
      { value: "chamados", label: "Chamados", group: "Pós-venda" },
      { value: "garantias", label: "Garantias", group: "Pós-venda" },
      { value: "sla", label: "SLA", group: "Pós-venda" },
      { value: "recorrencias", label: "Recorrências", group: "Pós-venda" },
    ],
  },

  // ── Operacionais (Dashboard escondido — preserva bookmarks via URL) ───
  "/comercial": {
    default: "orcamentos",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão", hidden: true },
      { value: "orcamentos", label: "Propostas", group: "Operação" },
      { value: "contratos", label: "Contratos", group: "Operação" },
      { value: "aditivos", label: "Aditivos", group: "Operação" },
      { value: "carteira", label: "Carteira", group: "Operação" },
      { value: "comissoes", label: "Comissões", group: "Controle" },
      { value: "vendedores", label: "Vendedores", group: "Estrutura" },
    ],
  },
  "/propostas": {
    default: "lista",
    tabs: [
      { value: "lista", label: "Propostas", group: "Operação" },
    ],
  },
  "/financiamentos": {
    default: "carteira",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão", hidden: true },
      { value: "carteira", label: "Contratos em Financiamento", group: "Operação" },
      { value: "sem", label: "Sem Financiamento", group: "Operação" },
      { value: "previsao", label: "Previsão", group: "Operação" },
      { value: "pendencias", label: "Pendências", group: "Controle" },
      { value: "finalizados", label: "Finalizados", group: "Controle" },
      { value: "cancelados", label: "Cancelados", group: "Controle" },
    ],
  },
  "/engenharia": {
    default: "kanban",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão", hidden: true },
      { value: "kanban", label: "Gestão de Projetos", group: "Operação" },
      { value: "ativas", label: "Cronograma", group: "Operação" },
      { value: "pendencias", label: "Pendências", group: "Controle" },
      { value: "finalizados", label: "Finalizados", group: "Controle" },
      { value: "equipes", label: "Equipes", group: "Estrutura" },
    ],
  },
  "/estoque": {
    default: "obras",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão", hidden: true },
      { value: "obras", label: "Obras (necessidade)", group: "Operação" },
      { value: "compra", label: "Necessidade de Compra", group: "Operação" },
      { value: "itens", label: "Estoque Atual", group: "Operação" },
      { value: "entregas", label: "Entregas", group: "Operação" },
    ],
  },
  "/financeiro": {
    default: "receber",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão", hidden: true },
      { value: "fluxo", label: "Fluxo de Caixa", group: "Visão", hidden: true },
      { value: "fluxo-real", label: "Fluxo Real × Previsto", group: "Visão", hidden: true },
      { value: "gerencial", label: "Visão Gerencial", group: "Visão", hidden: true },
      { value: "cmv", label: "CMV / Compras", group: "Visão", hidden: true },
      { value: "receber", label: "Contas a Receber", group: "Operação" },
      { value: "pagar", label: "Contas a Pagar", group: "Operação" },
      { value: "lancamentos", label: "Lançamentos", group: "Operação" },
      { value: "recorrentes", label: "Despesas Fixas", group: "Operação" },
      { value: "conciliacao", label: "Conciliação", group: "Controle" },
      { value: "fechamento", label: "Fechamento", group: "Controle" },
      { value: "renegociacoes", label: "Renegociações", group: "Controle" },
      { value: "adiantamentos", label: "Adiantamentos", group: "Operação" },
      { value: "rescisoes", label: "Rescisões", group: "Controle" },
      { value: "fornecedores", label: "Fornecedores", group: "Estrutura", hidden: true },
      { value: "cadastros", label: "Plano de Contas & Categorias", group: "Estrutura" },
      { value: "parametros-fin", label: "Parâmetros Financeiros", group: "Estrutura" },
      { value: "centros", label: "Centros & Naturezas (legado)", group: "Estrutura", hidden: true },
    ],
  },
  "/posvenda": {
    default: "chamados",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão", hidden: true },
      { value: "chamados", label: "Chamados", group: "Operação" },
      { value: "tipos", label: "Tipos de Atendimento", group: "Estrutura" },
    ],
  },
  "/analytics": {
    default: "visao",
    tabs: [
      { value: "visao", label: "Visão Executiva", group: "Visão" },
      { value: "ebitda", label: "EBITDA & Margens", group: "Visão" },
      { value: "roi", label: "ROI & Payback", group: "Visão" },
      { value: "capital", label: "Capital de Giro", group: "Visão" },
      { value: "alavancagem", label: "Alavancagem & Cobertura", group: "Visão" },
      { value: "conversao", label: "Conversão & Inadimplência", group: "Visão" },
      { value: "vendedores", label: "Capacidade Comercial", group: "Operação" },
      { value: "equipes", label: "Capacidade Operacional", group: "Operação" },
      { value: "dre", label: "DRE Gerencial", group: "Controle" },
      { value: "financiamento", label: "Simulador de Financiamento", group: "Controle" },
      { value: "expansao", label: "Análise de Expansão", group: "Controle" },
      { value: "cfo", label: "CFO / Controladoria", group: "Controle" },
      { value: "parecer", label: "Parecer Executivo", group: "Controle" },
      { value: "parametros", label: "Parâmetros Gerenciais", group: "Estrutura" },
    ],
  },
  "/cadastros": {
    default: "bancos",
    tabs: [
      { value: "bancos", label: "Bancos", group: "Estrutura" },
      { value: "gerentes", label: "Gerentes", group: "Estrutura" },
      { value: "equipes", label: "Equipes", group: "Estrutura" },
      { value: "vendedores", label: "Consultores", group: "Estrutura" },
      { value: "usuarios", label: "Usuários", group: "Estrutura" },
      { value: "status", label: "Status", group: "Estrutura" },
    ],
  },
  "/configuracoes": {
    default: "empresa",
    tabs: [
      { value: "empresa", label: "Empresa", group: "Empresa" },
      { value: "parametros", label: "Parâmetros do Sistema", group: "Empresa" },
      { value: "perfis", label: "Perfis", group: "Acessos" },
      { value: "permissoes", label: "Permissões granulares", group: "Acessos" },
      { value: "usuarios", label: "Usuários", group: "Acessos" },
      { value: "consultores", label: "Consultores", group: "Acessos" },
      { value: "sessoes", label: "Logs de Sessão", group: "Acessos" },
      { value: "cfg-dashboard", label: "Dashboard", group: "Módulos" },
      { value: "cfg-comercial", label: "Comercial", group: "Módulos" },
      { value: "cfg-engenharia", label: "Engenharia", group: "Módulos" },
      { value: "cfg-financeiro", label: "Financeiro", group: "Módulos" },
      { value: "proposta", label: "Orçamentos — Fórmulas", group: "Orçamentos" },
      { value: "orcamentos-cad", label: "Orçamentos — Cadastros", group: "Orçamentos" },
      { value: "integracoes", label: "Integrações", group: "Sistema" },
      { value: "sistema", label: "Feature Flags", group: "Sistema" },
      { value: "logs", label: "Logs", group: "Sistema" },
      { value: "lixeira", label: "Lixeira", group: "Sistema" },
    ],
  },
};

/** Reads tab from location hash like #tab=foo and keeps it reactive */
export function useTabFromHash(routePath: string): [string, (v: string) => void] {
  const cfg = ROUTE_TABS[routePath];
  const fallback = cfg?.default ?? "";
  const hash = useRouterState({ select: (s) => s.location.hash });
  const [val, setVal] = useState<string>(fallback);

  useEffect(() => {
    const browserHash = typeof window !== "undefined" ? window.location.hash : "";
    setVal(parseHash(browserHash || hash) || fallback);
  }, [hash, fallback]);

  const update = (v: string) => {
    setVal(v);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.hash = `tab=${v}`;
    window.history.replaceState(null, "", url.toString());
  };

  return [val, update];
}

export function parseHash(h: string): string {
  if (!h) return "";
  const clean = h.startsWith("#") ? h.slice(1) : h;
  const m = /(?:^|&)tab=([^&]+)/.exec(clean);
  return m ? decodeURIComponent(m[1]) : "";
}
