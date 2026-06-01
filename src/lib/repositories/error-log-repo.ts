/**
 * D15.1 Frente 1 — Registro Central de Erros
 * Repositório oficial para registrar e consultar erros operacionais/técnicos.
 */
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ErrorSeveridade = "info" | "warn" | "error" | "fatal";
export type ErrorStatus = "aberto" | "em_analise" | "resolvido" | "ignorado";

export interface ErrorLogInput {
  modulo?: string;
  tela?: string;
  acao?: string;
  mensagem: string;
  stack?: string;
  payload?: Record<string, unknown>;
  severidade?: ErrorSeveridade;
}

export interface ErrorLogRow {
  id: string;
  ocorrido_em: string;
  user_id: string | null;
  modulo: string | null;
  tela: string | null;
  acao: string | null;
  mensagem: string;
  stack: string | null;
  payload: Record<string, unknown> | null;
  severidade: ErrorSeveridade;
  status: ErrorStatus;
  resolvido_em: string | null;
  resolvido_por: string | null;
  resolucao_nota: string | null;
  user_agent: string | null;
  url: string | null;
  created_at: string;
}

function trimPayload(p: unknown): Record<string, unknown> | undefined {
  if (!p) return undefined;
  try {
    const s = JSON.stringify(p);
    return s.length > 4000
      ? { _truncated: true, preview: s.slice(0, 4000) }
      : (JSON.parse(s) as Record<string, unknown>);
  } catch {
    return { _unserializable: true };
  }
}

export const errorLogRepo = {
  async log(input: ErrorLogInput): Promise<void> {
    if (typeof window === "undefined") return;
    // D19.2 — descarta telemetria de agentes sintéticos (Playwright/headless)
    // para não poluir error_log durante testes de carga. Usuários reais OK.
    try {
      const nav = navigator as Navigator & { webdriver?: boolean };
      const ua = nav.userAgent || "";
      if (nav.webdriver || /HeadlessChrome|Playwright|puppeteer/i.test(ua)) return;
    } catch { /* ignore */ }
    try {
      // RLS exige sessão. Sem usuário, INSERT é negado — pula silenciosamente
      // (cai em console.warn local) para não gerar 401/400 ruidoso.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("[errorLogRepo.log] sem sessão; erro só em console:", input.mensagem);
        return;
      }
      // D19.2.fix.50u.7 — saneamento defensivo contra 400 do PostgREST:
      // clampar severidade ao CHECK (info|warn|error|fatal) e nunca enviar
      // 'status' (default 'aberto' no banco). Sinônimos comuns mapeados.
      const SEV_OK = new Set(["info", "warn", "error", "fatal"]);
      const sevRaw = String(input.severidade ?? "error").toLowerCase();
      const sevMap: Record<string, ErrorSeveridade> = {
        warning: "warn", err: "error", critical: "fatal", debug: "info",
      };
      const severidade: ErrorSeveridade = (
        SEV_OK.has(sevRaw) ? sevRaw : (sevMap[sevRaw] ?? "error")
      ) as ErrorSeveridade;

      const { error } = await supabase.from("error_log").insert({
        user_id: user.id,
        modulo: input.modulo ?? null,
        tela: input.tela ?? window.location.pathname,
        acao: input.acao ?? null,
        mensagem: String(input.mensagem ?? "erro desconhecido").slice(0, 2000),
        stack: input.stack?.slice(0, 8000) ?? null,
        payload: (trimPayload(input.payload) ?? null) as never,
        severidade,
        user_agent: navigator.userAgent.slice(0, 500),
        url: window.location.href.slice(0, 500),
      });
      if (error) {
        // 400/permission/check — não relança para não cascatear; só loga local.
        console.warn("[errorLogRepo.log] insert rejeitado:", error.code, error.message);
      }
    } catch (e) {
      // Nunca quebrar a app por causa do logger
      console.warn("[errorLogRepo.log] falhou ao registrar erro", e);
    }

  },

  async list(params: { status?: ErrorStatus; limit?: number } = {}): Promise<ErrorLogRow[]> {
    let q = supabase
      .from("error_log")
      .select("*")
      .order("ocorrido_em", { ascending: false })
      .limit(params.limit ?? 200);
    if (params.status) q = q.eq("status", params.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ErrorLogRow[];
  },

  async marcarResolvido(id: string, nota?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("error_log")
      .update({
        status: "resolvido",
        resolvido_em: new Date().toISOString(),
        resolvido_por: user?.id ?? null,
        resolucao_nota: nota ?? null,
      })
      .eq("id", id);
    if (error) throw error;
  },
};

export function useErrorLog(status?: ErrorStatus) {
  return useQuery({
    queryKey: ["error_log", status ?? "all"],
    queryFn: () => errorLogRepo.list({ status, limit: 300 }),
    staleTime: 30_000,
  });
}

export function useMarcarErroResolvido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nota }: { id: string; nota?: string }) =>
      errorLogRepo.marcarResolvido(id, nota),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["error_log"] }),
  });
}

/** Helper global para uso fora de componentes React */
export function logError(input: ErrorLogInput) {
  void errorLogRepo.log(input);
}
