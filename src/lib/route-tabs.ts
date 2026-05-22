import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export type SubTab = { value: string; label: string; group?: string; hidden?: boolean };

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
  "/comercial": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão" },
      { value: "orcamentos", label: "Propostas", group: "Operação" },
      { value: "contratos", label: "Contratos", group: "Operação" },
      { value: "aditivos", label: "Aditivos", group: "Operação" },
    ],
  },
  "/propostas": {
    default: "lista",
    tabs: [
      { value: "lista", label: "Propostas", group: "Operação" },
    ],
  },
  "/financiamentos": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão" },
      { value: "carteira", label: "Contratos em Financiamento", group: "Operação" },
      { value: "sem", label: "Sem Financiamento", group: "Operação" },
      { value: "previsao", label: "Previsão", group: "Operação" },
      { value: "pendencias", label: "Pendências", group: "Controle" },
      { value: "finalizados", label: "Finalizados", group: "Controle" },
      { value: "cancelados", label: "Cancelados", group: "Controle" },
    ],
  },
  "/engenharia": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão" },
      { value: "kanban", label: "Gestão de Projetos", group: "Operação" },
      { value: "ativas", label: "Cronograma", group: "Operação" },
      { value: "pendencias", label: "Pendências", group: "Controle" },
      { value: "finalizados", label: "Finalizados", group: "Controle" },
      { value: "equipes", label: "Equipes", group: "Estrutura" },
    ],
  },
  "/estoque": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão" },
      { value: "obras", label: "Obras (necessidade)", group: "Operação" },
      { value: "compra", label: "Necessidade de Compra", group: "Operação" },
      { value: "itens", label: "Estoque Atual", group: "Operação" },
      { value: "entregas", label: "Entregas", group: "Operação" },
    ],
  },
  "/financeiro": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão" },
      { value: "fluxo", label: "Fluxo de Caixa", group: "Visão" },
      { value: "gerencial", label: "Visão Gerencial", group: "Visão" },
      { value: "cmv", label: "CMV / Compras", group: "Visão" },
      { value: "receber", label: "Contas a Receber", group: "Operação" },
      { value: "pagar", label: "Contas a Pagar", group: "Operação" },
      { value: "lancamentos", label: "Lançamentos", group: "Operação" },
      { value: "recorrentes", label: "Despesas Fixas", group: "Operação" },
      { value: "conciliacao", label: "Conciliação", group: "Controle" },
      { value: "fechamento", label: "Fechamento", group: "Controle" },
      { value: "fornecedores", label: "Fornecedores", group: "Estrutura" },
      { value: "cadastros", label: "Plano de Contas & Categorias", group: "Estrutura" },
      { value: "centros", label: "Centros & Naturezas (legado)", group: "Estrutura", hidden: true },
    ],
  },
  "/posvenda": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão" },
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
