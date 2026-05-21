import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export type SubTab = { value: string; label: string };

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
      { value: "contratos", label: "Contratos" },
      { value: "vendedores", label: "Consultores" },
      { value: "analise", label: "Análise Executiva" },
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
      { value: "ativas", label: "Gestão de projetos" },
      { value: "cronograma", label: "Cronograma" },
      { value: "pendencias", label: "Pendências" },
      { value: "equipes", label: "Equipes" },
      { value: "produtividade", label: "Produtividade" },
      { value: "finalizados", label: "Finalizados" },
      { value: "cancelados", label: "Cancelados" },
    ],
  },
  "/estoque": {
    default: "dashboard",
    tabs: [
      { value: "dashboard", label: "Dashboard" },
      { value: "itens", label: "Itens" },
      { value: "entregas", label: "Entregas Realizadas" },
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
