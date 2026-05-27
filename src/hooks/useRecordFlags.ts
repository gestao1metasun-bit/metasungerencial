/**
 * D6.10.1 — Hook universal de Flags.
 *
 * Lê flags em lote (entidade + ids[]) via view `v_record_flags_count` para
 * mostrar badges em grids, e a flag pessoal do usuário corrente em
 * `record_flags` para alternar cor/rótulo.
 *
 * Operações via RPC oficial (flag_toggle / flag_set / flag_clear / flag_resolve)
 * — nunca via UPDATE/INSERT direto.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FlagCor = "VERMELHO" | "AMARELO" | "VERDE" | "AZUL" | "ROXO" | "CINZA";
export type FlagEscopo = "PESSOAL" | "EQUIPE" | "GLOBAL";

export type RecordFlag = {
  id: string;
  entidade: string;
  registro_id: string;
  cor: FlagCor;
  rotulo: string | null;
  observacao: string | null;
  prioridade: number;
  escopo: FlagEscopo;
  setor: string | null;
  sla_em: string | null;
  resolvido_em: string | null;
  user_id: string;
  user_email: string | null;
  created_at: string;
  updated_at: string;
};

export type RecordFlagCount = {
  entidade: string;
  registro_id: string;
  total: number;
  qt_vermelho: number;
  qt_amarelo: number;
  qt_verde: number;
  qt_azul: number;
  qt_roxo: number;
  qt_cinza: number;
  prioridade_max: number;
  proximo_sla: string | null;
};

export const FLAG_CORES: Array<{ value: FlagCor; label: string; hex: string; semantica: string }> = [
  { value: "VERMELHO", label: "Crítico",       hex: "#dc2626", semantica: "Problema / bloqueio" },
  { value: "AMARELO",  label: "Atenção",       hex: "#eab308", semantica: "Acompanhar" },
  { value: "VERDE",    label: "OK",            hex: "#16a34a", semantica: "Liberado / resolvido" },
  { value: "AZUL",     label: "Aguardando",    hex: "#2563eb", semantica: "Terceiro / externo" },
  { value: "ROXO",     label: "Estratégico",   hex: "#9333ea", semantica: "Diretoria" },
  { value: "CINZA",    label: "Informativo",   hex: "#6b7280", semantica: "Sem prioridade" },
];

export function flagCorMeta(cor: FlagCor) {
  return FLAG_CORES.find((c) => c.value === cor)!;
}

const QK = {
  counts: (entidade: string, ids: string[]) => ["record_flags_count", entidade, ids.slice().sort().join(",")],
  own:    (entidade: string, ids: string[]) => ["record_flags_own", entidade, ids.slice().sort().join(",")],
  one:    (entidade: string, id: string)    => ["record_flag_one", entidade, id],
} as const;

/** Contagem em lote para a grid (todas as flags, todos os usuários visíveis). */
export function useRecordFlagsCount(entidade: string, registroIds: string[]) {
  const ids = registroIds.filter(Boolean);
  return useQuery({
    queryKey: QK.counts(entidade, ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_record_flags_count" as never)
        .select("*")
        .eq("entidade", entidade)
        .in("registro_id", ids);
      if (error) throw error;
      const map = new Map<string, RecordFlagCount>();
      (data as RecordFlagCount[] | null)?.forEach((r) => map.set(r.registro_id, r));
      return map;
    },
  });
}

/** Flag pessoal do usuário corrente para os registros listados. */
export function useOwnRecordFlags(entidade: string, registroIds: string[]) {
  const ids = registroIds.filter(Boolean);
  return useQuery({
    queryKey: QK.own(entidade, ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return new Map<string, RecordFlag>();
      const { data, error } = await supabase
        .from("record_flags")
        .select("*")
        .eq("entidade", entidade)
        .eq("user_id", u.user.id)
        .eq("escopo", "PESSOAL")
        .in("registro_id", ids);
      if (error) throw error;
      const map = new Map<string, RecordFlag>();
      (data as RecordFlag[] | null)?.forEach((f) => map.set(f.registro_id, f));
      return map;
    },
  });
}

/** Flag pessoal do registro corrente (popover). */
export function useOwnRecordFlag(entidade: string, registroId: string | null | undefined) {
  return useQuery({
    queryKey: QK.one(entidade, registroId ?? ""),
    enabled: !!registroId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("record_flags")
        .select("*")
        .eq("entidade", entidade)
        .eq("registro_id", registroId!)
        .eq("user_id", u.user.id)
        .eq("escopo", "PESSOAL")
        .maybeSingle();
      if (error) throw error;
      return (data as RecordFlag | null) ?? null;
    },
  });
}

export function useFlagMutations(entidade: string) {
  const qc = useQueryClient();
  const invalidate = (registro_id?: string) => {
    qc.invalidateQueries({ queryKey: ["record_flags_count", entidade] });
    qc.invalidateQueries({ queryKey: ["record_flags_own", entidade] });
    if (registro_id) qc.invalidateQueries({ queryKey: QK.one(entidade, registro_id) });
  };

  const set = useMutation({
    mutationFn: async (input: {
      registro_id: string;
      cor: FlagCor;
      rotulo?: string | null;
      observacao?: string | null;
      prioridade?: number;
      escopo?: FlagEscopo;
      setor?: string | null;
      sla_em?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("flag_set" as never, {
        _entidade: entidade,
        _registro_id: input.registro_id,
        _cor: input.cor,
        _rotulo: input.rotulo ?? null,
        _observacao: input.observacao ?? null,
        _prioridade: input.prioridade ?? 0,
        _escopo: input.escopo ?? "PESSOAL",
        _setor: input.setor ?? null,
        _sla_em: input.sla_em ?? null,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, vars) => invalidate(vars.registro_id),
  });

  const toggle = useMutation({
    mutationFn: async (input: { registro_id: string; cor: FlagCor; rotulo?: string | null }) => {
      const { data, error } = await supabase.rpc("flag_toggle" as never, {
        _entidade: entidade,
        _registro_id: input.registro_id,
        _cor: input.cor,
        _rotulo: input.rotulo ?? null,
      } as never);
      if (error) throw error;
      return data as string | null;
    },
    onSuccess: (_d, vars) => invalidate(vars.registro_id),
  });

  const clear = useMutation({
    mutationFn: async (registro_id: string) => {
      const { data, error } = await supabase.rpc("flag_clear" as never, {
        _entidade: entidade,
        _registro_id: registro_id,
      } as never);
      if (error) throw error;
      return data as number;
    },
    onSuccess: (_d, registro_id) => invalidate(registro_id),
  });

  const resolve = useMutation({
    mutationFn: async (input: { flag_id: string; registro_id: string; observacao?: string }) => {
      const { data, error } = await supabase.rpc("flag_resolve" as never, {
        _flag_id: input.flag_id,
        _observacao: input.observacao ?? null,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, vars) => invalidate(vars.registro_id),
  });

  return { set, toggle, clear, resolve };
}
