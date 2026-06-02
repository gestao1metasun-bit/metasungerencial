// D24 — Repo da Auditoria Enterprise Unificada.
// Leitura da view oficial `v_auditoria_unificada` (security_invoker).
// Sem motor novo; consome eventos já existentes.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditoriaCriticidade = "BAIXA" | "NORMAL" | "ALTA" | "CRITICA";

export interface AuditoriaRow {
  id: string;
  modulo: string;
  entidade_tipo: string;
  entidade_id: string;
  acao: string;
  usuario_id: string | null;
  usuario_email: string | null;
  data_hora: string;
  origem: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  observacao: string | null;
  payload: Record<string, unknown> | null;
  criticidade: AuditoriaCriticidade;
  link_origem: string;
}

export interface AuditoriaFiltros {
  busca?: string;
  modulo?: string;
  entidade?: string;
  acao?: string;
  usuarioEmail?: string;
  entidadeId?: string;
  criticidade?: AuditoriaCriticidade;
  origem?: string;
  desde?: string; // ISO
  ate?: string;   // ISO
  limit?: number;
}

export function useAuditoriaUnificada(f: AuditoriaFiltros = {}) {
  return useQuery({
    queryKey: ["auditoria-unificada", f],
    queryFn: async (): Promise<AuditoriaRow[]> => {
      let q = (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: AuditoriaRow[] | null; error: unknown }>;
            } & Record<string, unknown>;
          } & Record<string, unknown>;
        };
      }).from("v_auditoria_unificada").select("*") as unknown as {
        eq: (c: string, v: unknown) => typeof q;
        ilike: (c: string, v: string) => typeof q;
        gte: (c: string, v: unknown) => typeof q;
        lte: (c: string, v: unknown) => typeof q;
        or: (s: string) => typeof q;
        order: (c: string, o: { ascending: boolean }) => typeof q;
        limit: (n: number) => Promise<{ data: AuditoriaRow[] | null; error: unknown }>;
      };
      if (f.modulo) q = q.eq("modulo", f.modulo);
      if (f.entidade) q = q.eq("entidade_tipo", f.entidade);
      if (f.acao) q = q.ilike("acao", `%${f.acao}%`);
      if (f.usuarioEmail) q = q.ilike("usuario_email", `%${f.usuarioEmail}%`);
      if (f.entidadeId) q = q.eq("entidade_id", f.entidadeId);
      if (f.criticidade) q = q.eq("criticidade", f.criticidade);
      if (f.origem) q = q.eq("origem", f.origem);
      if (f.desde) q = q.gte("data_hora", f.desde);
      if (f.ate) q = q.lte("data_hora", f.ate);
      if (f.busca) {
        const s = f.busca.replace(/[%,]/g, " ");
        q = q.or(
          `acao.ilike.%${s}%,observacao.ilike.%${s}%,entidade_tipo.ilike.%${s}%,modulo.ilike.%${s}%`,
        );
      }
      const { data, error } = await q
        .order("data_hora", { ascending: false })
        .limit(f.limit ?? 500);
      if (error) throw error as Error;
      return (data ?? []) as AuditoriaRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** Resolve link_origem para a rota interna do app. */
export function rotaDaOrigemAuditoria(row: AuditoriaRow): string | null {
  const link = row.link_origem ?? "";
  if (link.startsWith("workflow:")) return "/aprovacoes";
  if (link.startsWith("suprimentos:requisicao:")) return "/suprimentos#tab=requisicoes";
  if (link.startsWith("suprimentos:pedido:")) return "/suprimentos#tab=pedidos";
  if (link.startsWith("suprimentos:cotacao:")) return "/suprimentos#tab=cotacoes";
  if (link.startsWith("suprimentos:recebimento:")) return "/suprimentos#tab=recebimentos";
  if (link.startsWith("os:")) {
    const id = link.split(":")[1];
    return id ? `/engenharia/gestao-servicos/${id}` : "/engenharia";
  }
  if (link.startsWith("comercial:contrato:")) return "/comercial";
  if (link.startsWith("comercial:comissao:")) return "/comercial";
  if (link.startsWith("financeiro:op:")) return "/operacoes-financeiras";
  if (link.startsWith("notificacao:")) return "/notificacoes";
  return null;
}

export const CRITICIDADE_TONE: Record<AuditoriaCriticidade, string> = {
  BAIXA: "bg-slate-100 text-slate-700 border-slate-300",
  NORMAL: "bg-sky-100 text-sky-800 border-sky-300",
  ALTA: "bg-amber-100 text-amber-900 border-amber-300",
  CRITICA: "bg-rose-100 text-rose-900 border-rose-300",
};

export const MODULO_LABEL: Record<string, string> = {
  aprovacoes: "Aprovações",
  suprimentos: "Suprimentos",
  financeiro: "Financeiro",
  os: "O.S.",
  engenharia: "Engenharia",
  comercial: "Comercial",
  financiamentos: "Financiamentos",
  cadastros: "Cadastros",
  sistema: "Sistema",
};

/** Exporta as linhas filtradas como CSV (UTF-8 BOM). */
export function exportarCsvAuditoria(rows: AuditoriaRow[]): Blob {
  const headers = [
    "data_hora", "modulo", "entidade_tipo", "entidade_id", "acao",
    "criticidade", "usuario_email", "usuario_id", "origem", "observacao",
    "antes", "depois", "link_origem",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(";")];
  for (const r of rows) {
    lines.push([
      r.data_hora, r.modulo, r.entidade_tipo, r.entidade_id, r.acao,
      r.criticidade, r.usuario_email, r.usuario_id, r.origem, r.observacao,
      r.antes, r.depois, r.link_origem,
    ].map(escape).join(";"));
  }
  return new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
}
