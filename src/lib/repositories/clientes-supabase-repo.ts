/**
 * C-ENT.1.d/e — Repositório oficial de Clientes (Supabase, public.clientes).
 * Fonte de verdade do módulo Comercial Enterprise.
 *
 * C-ENT.1.e: + criar/atualizar cliente em Supabase (RLS: consultor_id = auth.uid()
 * ou is_admin). Espelho em LS (`addClienteFull`) mantido APENAS por compat com
 * seletores legados (Pendência: migrar seletores em subwave posterior).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/repositories/error-log-repo";
import { addClienteFull, updateClienteFull, type ClienteRecord } from "@/lib/clientes-store";

export type ClienteRow = {
  id: string;
  nome: string;
  doc: string | null;
  telefone: string | null;
  telefone2: string | null;
  email: string | null;
  consultor_id: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  complemento: string | null;
  cidade: string | null;
  uf: string | null;
  status: string | null;
  tipo_pessoa: string | null;
  created_at: string;
  updated_at: string;
};

const CLIENTE_SELECT =
  "id,nome,doc,telefone,telefone2,email,consultor_id,cep,rua,numero,bairro,complemento,cidade,uf,status,tipo_pessoa,created_at,updated_at";

export type ClientesOrder = "nome" | "updated_at" | "created_at";

export type ClientesQuery = {
  search?: string;
  orderBy?: ClientesOrder;
  orderDir?: "asc" | "desc";
  limit?: number;
};

const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

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
        .select("user_id,nome,email")
        .limit(500);
      if (error) return {};
      const m: Record<string, string> = {};
      for (const r of (data ?? []) as Array<{ user_id: string | null; nome: string | null; email: string | null }>) {
        if (!r.user_id) continue;
        m[r.user_id] = r.nome || r.email || r.user_id.slice(0, 8);
      }
      return m;
    },
  });
}

/* ============================================================
 * C-ENT.1.e — Criar / Atualizar cliente (Supabase, RLS aplicada)
 * ============================================================ */

export type NovoClienteInput = {
  nome: string;
  doc?: string;
  telefone?: string;
  telefone2?: string;
  email?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  cidade?: string;
  uf?: string;
  tipo_pessoa?: "PF" | "PJ" | "EX";
  observacao?: string | null;
};

export type AtualizarClienteInput = Partial<NovoClienteInput>;

function clean<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = typeof v === "string" ? v.trim() : v;
  }
  return out as Partial<T>;
}

function toLsRecord(row: ClienteRow & {
  telefone2?: string | null; cep?: string | null; rua?: string | null;
  numero?: string | null; bairro?: string | null; complemento?: string | null;
}): ClienteRecord {
  return {
    id: row.id,
    nome: row.nome,
    doc: row.doc ?? "",
    telefone: row.telefone ?? "",
    telefone2: row.telefone2 ?? "",
    email: row.email ?? "",
    cep: row.cep ?? "",
    rua: row.rua ?? "",
    numero: row.numero ?? "",
    bairro: row.bairro ?? "",
    complemento: row.complemento ?? "",
    cidade: row.cidade ?? "",
    uf: row.uf ?? "",
    status: row.status ?? "Ativo",
    atualizado: (row.updated_at ?? new Date().toISOString()).slice(0, 10),
  };
}

export async function criarClienteSupabase(input: NovoClienteInput): Promise<ClienteRecord> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  const docDigits = onlyDigits(input.doc ?? "");
  const tipo: "PF" | "PJ" | "EX" =
    input.tipo_pessoa ?? (docDigits.length === 14 ? "PJ" : "PF");

  const payload = clean({
    nome: input.nome,
    doc: docDigits ? input.doc : null,
    telefone: input.telefone ?? null,
    telefone2: input.telefone2 ?? null,
    email: input.email ?? null,
    cep: input.cep ?? null,
    rua: input.rua ?? null,
    numero: input.numero ?? null,
    bairro: input.bairro ?? null,
    complemento: input.complemento ?? null,
    cidade: input.cidade ?? null,
    uf: input.uf ?? null,
    tipo_pessoa: tipo,
    consultor_id: uid,
    status: "Ativo",
  });

  const { data, error } = await supabase
    .from("clientes")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    logError({
      modulo: "comercial",
      tela: "cliente-cadastro",
      acao: "cliente.criar",
      mensagem: error.message,
      severidade: "error",
      payload: { input },
    });
    throw error;
  }

  const row = data as unknown as ClienteRow & Record<string, string | null>;
  const ls = toLsRecord(row);
  // Espelho LS — compat com seletores legados (NÃO é fonte de verdade).
  try { addClienteFull({ ...ls, id: ls.id }); } catch { /* duplicado: ignora */ }
  return ls;
}

export async function atualizarClienteSupabase(
  id: string,
  patch: AtualizarClienteInput,
): Promise<ClienteRecord> {
  const payload = clean({
    nome: patch.nome,
    doc: patch.doc !== undefined ? (onlyDigits(patch.doc) ? patch.doc : null) : undefined,
    telefone: patch.telefone,
    telefone2: patch.telefone2,
    email: patch.email,
    cep: patch.cep,
    rua: patch.rua,
    numero: patch.numero,
    bairro: patch.bairro,
    complemento: patch.complemento,
    cidade: patch.cidade,
    uf: patch.uf,
    tipo_pessoa: patch.tipo_pessoa,
  });

  const { data, error } = await supabase
    .from("clientes")
    .update(payload as never)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logError({
      modulo: "comercial",
      tela: "cliente-edicao",
      acao: "cliente.atualizar",
      mensagem: error.message,
      severidade: "error",
      payload: { id, patch },
    });
    throw error;
  }

  const row = data as unknown as ClienteRow & Record<string, string | null>;
  const ls = toLsRecord(row);
  try { updateClienteFull(ls.id, ls); } catch { /* sem registro local: tudo bem */ }
  return ls;
}

export function useCriarClienteSupabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: criarClienteSupabase,
    onSuccess: (cli) => {
      qc.invalidateQueries({ queryKey: ["clientes-supabase"] });
      qc.invalidateQueries({ queryKey: ["cliente", cli.id] });
      qc.invalidateQueries({ queryKey: ["clientes-similares"] });
    },
  });
}

export function useAtualizarClienteSupabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: AtualizarClienteInput }) =>
      atualizarClienteSupabase(args.id, args.patch),
    onSuccess: (cli) => {
      qc.invalidateQueries({ queryKey: ["clientes-supabase"] });
      qc.invalidateQueries({ queryKey: ["cliente", cli.id] });
      qc.invalidateQueries({ queryKey: ["clientes-similares"] });
    },
  });
}
