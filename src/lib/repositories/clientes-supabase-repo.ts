/**
 * C-ENT.1.d — Repositório oficial de Clientes (Supabase, public.clientes).
 * Fonte de verdade do módulo Comercial Enterprise.
 * Não substitui clientes-store (LS) ainda usado pelo cadastro legado em /comercial.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/repositories/error-log-repo";

export type ClienteRow = {
  id: string;
  nome: string;
  doc: string | null;
  telefone: string | null;
  email: string | null;
  consultor_id: string | null;
  cidade: string | null;
  uf: string | null;
  status: string | null;
  tipo_pessoa: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientesOrder = "nome" | "updated_at" | "created_at";

export type ClientesQuery = {
  search?: string;
  orderBy?: ClientesOrder;
  orderDir?: "asc" | "desc";
  limit?: number;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function useClientesSupabase(q: ClientesQuery = {}) {
  const search = (q.search ?? "").trim();
  const orderBy = q.orderBy ?? "nome";
  const orderDir = q.orderDir ?? "asc";
  const limit = Math.min(q.limit ?? 200, 500);

  return useQuery({
    queryKey: ["clientes-supabase", { search, orderBy, orderDir, limit }],
    staleTime: 30_000,
    queryFn: async (): Promise<ClienteRow[]> => {
      let query = supabase
        .from("clientes")
        .select(
          "id,nome,doc,telefone,email,consultor_id,cidade,uf,status,tipo_pessoa,created_at,updated_at",
        )
        .is("deleted_at", null)
        .order(orderBy, { ascending: orderDir === "asc" })
        .limit(limit);

      if (search) {
        const digits = onlyDigits(search);
        const ors: string[] = [
          `nome.ilike.%${search}%`,
          `email.ilike.%${search}%`,
        ];
        if (digits.length >= 3) {
          ors.push(`doc.ilike.%${digits}%`);
          ors.push(`telefone.ilike.%${digits}%`);
        }
        query = query.or(ors.join(","));
      }

      const { data, error } = await query;
      if (error) {
        logError({
          modulo: "comercial",
          tela: "clientes-listagem",
          acao: "clientes.listar",
          mensagem: error.message,
          severidade: "error",
        });
        throw error;
      }
      return (data ?? []) as ClienteRow[];
    },
  });
}

/** Consulta nominal de consultores para exibir o nome na grade. */
export function useConsultoresMap() {
  return useQuery({
    queryKey: ["consultores-map"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .limit(500);
      if (error) return {};
      const m: Record<string, string> = {};
      for (const r of (data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
        m[r.id] = r.full_name || r.email || r.id.slice(0, 8);
      }
      return m;
    },
  });
}
