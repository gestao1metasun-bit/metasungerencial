import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export type SubTab = { value: string; label: string; group?: string };

export const ROUTE_TABS: Record<string, { default: string; tabs: SubTab[] }> = {
  "/dashboard": {
    default: "visao",
    tabs: [
      { value: "visao", label: "Visão Geral" },
      { value: "indicadores", label: "Indicadores" },
    ],
  },
  "/comercial": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard" },
      { value: "orcamentos", label: "Propostas" },
      { value: "contratos", label: "Contratos" },
      { value: "aditivos", label: "Aditivos" },
    ],
  },
  "/propostas": {
    default: "lista",
    tabs: [
      { value: "lista", label: "Propostas" },
    ],
  },
  "/financiamentos": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard" },
      { value: "carteira", label: "Contratos Assinados em Financiamento" },
      { value: "sem", label: "Sem Contrato em Financiamento" },
      { value: "previsao", label: "Previsão" },
      { value: "pendencias", label: "Pendências" },
      { value: "finalizados", label: "Finalizados" },
      { value: "cancelados", label: "Cancelados" },
    ],
  },
  "/engenharia": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard" },
      { value: "kanban", label: "Gestão de projetos" },
      { value: "ativas", label: "Cronograma" },
      { value: "pendencias", label: "Pendências" },
      { value: "equipes", label: "Equipes" },
      { value: "finalizados", label: "Finalizados" },
    ],
  },

  "/estoque": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard" },
      { value: "obras", label: "Obras (necessidade)" },
      { value: "compra", label: "Necessidade de Compra" },
      { value: "itens", label: "Estoque Atual" },
      { value: "entregas", label: "Entregas" },
    ],
  },
  "/financeiro": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard", group: "Visão" },
      { value: "fluxo", label: "Fluxo de Caixa", group: "Visão" },
      { value: "gerencial", label: "Visão gerencial", group: "Visão" },
      { value: "cmv", label: "CMV / Compras", group: "Visão" },
      { value: "receber", label: "Contas a Receber", group: "Operação" },
      { value: "pagar", label: "Contas a Pagar", group: "Operação" },
      { value: "lancamentos", label: "Lançamentos", group: "Operação" },
      { value: "recorrentes", label: "Despesas fixas", group: "Operação" },
      { value: "fornecedores", label: "Fornecedores", group: "Cadastros" },
      { value: "cadastros", label: "Cadastros estruturais", group: "Cadastros" },
      { value: "centros", label: "Centros & Naturezas (legado)", group: "Cadastros" },
      { value: "conciliacao", label: "Conciliação", group: "Controle" },
      { value: "fechamento", label: "Fechamento", group: "Controle" },
    ],
  },
  "/posvenda": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard" },
      { value: "chamados", label: "Chamados" },
      { value: "tipos", label: "Tipos de atendimento" },
    ],
  },
  "/analytics": {
    default: "dre",
    tabs: [
      { value: "dre", label: "DRE" },
    ],
  },
  "/cadastros": {
    default: "bancos",
    tabs: [
      { value: "bancos", label: "Bancos" },
      { value: "gerentes", label: "Gerentes" },
      { value: "equipes", label: "Equipes" },
      { value: "vendedores", label: "Consultores" },
      { value: "usuarios", label: "Usuários" },
      { value: "status", label: "Status" },
    ],
  },
  "/configuracoes": {
    default: "empresa",
    tabs: [
      { value: "empresa", label: "Empresa" },
      { value: "parametros", label: "Parâmetros gerais" },
      { value: "cfg-dashboard", label: "Dashboard" },
      { value: "cfg-comercial", label: "Comercial" },
      { value: "cfg-engenharia", label: "Engenharia" },
      { value: "cfg-financeiro", label: "Financeiro" },
      { value: "proposta", label: "Orçamentos — fórmulas" },
      { value: "orcamentos-cad", label: "Orçamentos — cadastros" },
      { value: "perfis", label: "Perfis de Acesso" },
      { value: "permissoes", label: "Permissões granulares" },
      { value: "usuarios", label: "Usuários" },
      { value: "consultores", label: "Consultores" },
      { value: "integracoes", label: "Integrações" },
      { value: "logs", label: "Logs" },
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
