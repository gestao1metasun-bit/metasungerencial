// D19.2.fix.50u.8 — Tela interna de apoio aos testes de carga (login-only).
// Admin Master only. 100% client-side: cola o JSON gerado por
// scripts/d19-2-login-only.mjs e mostra breakdown + gargalo dominante,
// sem dependência do notebook local.
//
// Não toca RLS / banco / workflow / regra de negócio.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Copy, Check, AlertTriangle, Gauge, Upload, FileJson } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMyPermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes/testes-carga")({
  head: () => ({ meta: [{ title: "Testes de Carga — Meta Sun Gerencial" }] }),
  component: TestesCargaPage,
});

const TARGET = "https://metasungerencial.lovable.app";

type PhaseStats = {
  n: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
};

type Summary = {
  base_url?: string;
  users?: number;
  ramp_ms?: number;
  timestamp?: string;
  ok?: number;
  error?: number;
  console_errors?: number;
  phases?: Record<string, PhaseStats>;
  sample_console_errors?: Array<{ user: number; text: string }>;
  samples?: Array<Record<string, unknown>>;
};

const PHASE_LABELS: Record<string, string> = {
  t_navigate: "Navegação (rede + edge cold + parse)",
  t_react_ready: "Hidratação React (mount → 1º paint)",
  t_supabase_ready: "Supabase bootstrap (auth-store inicial)",
  t_auth: "signInWithPassword (auth puro)",
  t_redirect: "Redirect (start → ok)",
  t_submit_to_dashboard: "Submit → /dashboard",
  t_total: "Total (/login → /dashboard)",
};

function Cmd({ label, cmd }: { label: string; cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(cmd);
            setCopied(true);
            toast.success("Comando copiado.");
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1 text-xs">Copiar</span>
        </Button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-foreground/90">
        {cmd}
      </pre>
    </div>
  );
}

function fmtMs(v: number | null | undefined) {
  if (v == null) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(2)}s`;
  return `${Math.round(v)}ms`;
}

function classifyP95(label: string, p95: number | null): "ok" | "warn" | "crit" | null {
  if (p95 == null) return null;
  // SLAs internos para login-only
  const sla: Record<string, [number, number]> = {
    t_navigate:        [1500, 4000],
    t_react_ready:     [800,  2500],
    t_supabase_ready:  [1200, 3000],
    t_auth:            [1200, 3000],
    t_redirect:        [800,  2500],
    t_total:           [5000, 15000],
    t_submit_to_dashboard: [3000, 8000],
  };
  const [okMax, warnMax] = sla[label] ?? [Infinity, Infinity];
  if (p95 <= okMax) return "ok";
  if (p95 <= warnMax) return "warn";
  return "crit";
}

function badgeFor(level: "ok" | "warn" | "crit" | null) {
  if (level === "ok")   return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">OK</Badge>;
  if (level === "warn") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Atenção</Badge>;
  if (level === "crit") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Crítico</Badge>;
  return <Badge variant="outline">—</Badge>;
}

function TestesCargaPage() {
  const { isAdmin, isLoading } = useMyPermissions();
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<Summary | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [perfMarksAvailable, setPerfMarksAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fn = (window as unknown as { __perfMarks?: () => Record<string, number> }).__perfMarks;
    setPerfMarksAvailable(typeof fn === "function");
  }, []);

  const cmd10 = useMemo(
    () =>
      `# 10 usuários — login-only (rampa 10s)
USERS=10 RAMP_MS=10000 BASE_URL=${TARGET} \\
  CREDS_JSON="$(cat scripts/d19-2-creds.json)" \\
  OUT=docs/d19-2-login-only-10u.json \\
  node scripts/d19-2-login-only.mjs`,
    []
  );
  const cmd50 = useMemo(
    () =>
      `# 50 usuários — login-only (rampa 30s)
USERS=50 RAMP_MS=30000 BASE_URL=${TARGET} \\
  CREDS_JSON="$(cat scripts/d19-2-creds.json)" \\
  OUT=docs/d19-2-login-only-50u.json \\
  node scripts/d19-2-login-only.mjs`,
    []
  );
  const cmd100 = useMemo(
    () =>
      `# 100 usuários — carga geral (final)
USERS=100 RAMP_MS=60000 BASE_URL=${TARGET} \\
  CREDS_JSON="$(cat scripts/d19-2-creds.json)" \\
  OUT=docs/d19-2-load-100u.json \\
  node scripts/d19-2-load-test.mjs`,
    []
  );

  function tryParse(txt: string) {
    setRaw(txt);
    setParseError(null);
    if (!txt.trim()) { setParsed(null); return; }
    try {
      const obj = JSON.parse(txt) as Summary;
      if (!obj || typeof obj !== "object" || !obj.phases) {
        throw new Error("JSON sem campo 'phases' — não parece ser saída do login-only.");
      }
      setParsed(obj);
    } catch (e) {
      setParsed(null);
      setParseError(e instanceof Error ? e.message : "JSON inválido.");
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => tryParse(String(r.result ?? ""));
    r.readAsText(f);
  }

  const dominante = useMemo(() => {
    if (!parsed?.phases) return null;
    const candidatos = ["t_navigate", "t_react_ready", "t_supabase_ready", "t_auth", "t_redirect"] as const;
    let top: { label: string; p95: number } | null = null;
    for (const k of candidatos) {
      const p = parsed.phases[k]?.p95;
      if (typeof p === "number" && (!top || p > top.p95)) top = { label: k, p95: p };
    }
    return top;
  }, [parsed]);

  const recomendacao = useMemo(() => {
    if (!dominante) return null;
    const map: Record<string, { fix: string; ganho: string }> = {
      t_navigate:        { fix: "Edge cold / rede: revisar tamanho do bundle inicial, preload do shell, cache 'index.html'.", ganho: "~30-50% no t_total em carga concorrente." },
      t_react_ready:     { fix: "Hidratação React: code-split adicional em /login, remover sync imports pesados, adiar providers globais.", ganho: "~20-40% no caminho frio." },
      t_supabase_ready:  { fix: "Supabase bootstrap: paralelizar getSession+listener, evitar getUser duplicado, preload do storage de sessão.", ganho: "~15-35%." },
      t_auth:            { fix: "signInWithPassword: latência GoTrue. Avaliar região de auth, retry exponencial, rate-limit do projeto.", ganho: "~10-25%." },
      t_redirect:        { fix: "Redirect: lazy-load AppLayout/dashboard, prefetch da rota /dashboard no submit, evitar dupla navegação.", ganho: "~20-40% no submit→dashboard." },
    };
    return map[dominante.label] ?? null;
  }, [dominante]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  if (!isAdmin) {
    // Bloqueio em UI; rota fica disponível mas inútil sem admin.
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50/40 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-700" />
            <div>
              <div className="text-sm font-semibold text-red-900">Acesso restrito</div>
              <div className="text-xs text-red-800/80">Esta tela é exclusiva para Admin Master.</div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Testes de Carga — Login Only"
        subtitle="D19.2.fix.50u.8 — apoio à investigação do gargalo de /login. Somente Admin Master."
      />

      <div className="mb-4 flex items-center gap-3">
        <Link to="/configuracoes" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar a Configurações
        </Link>
      </div>

      <Card className="mb-4 border-amber-200 bg-amber-50/40 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
          <div className="text-[12px] text-amber-900">
            <strong>Status oficial D19.2:</strong> GO operação assistida até <strong>50 usuários</strong>. 100u em validação técnica.
            Esta página NÃO executa nada destrutivo — apenas analisa JSONs gerados externamente por <code>scripts/d19-2-login-only.mjs</code>.
            Banco / RLS / workflow / módulos operacionais permanecem intactos.
          </div>
        </div>
      </Card>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="comandos">Comandos prontos</TabsTrigger>
          <TabsTrigger value="analise">Analisar JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-3">
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">Build atual</div>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div className="rounded border border-border bg-muted/30 p-2">
                <div className="text-muted-foreground">window.__perfMarks</div>
                <div className="font-mono">
                  {perfMarksAvailable == null ? "—" : perfMarksAvailable ? "✅ disponível (função)" : "❌ indisponível"}
                </div>
              </div>
              <div className="rounded border border-border bg-muted/30 p-2">
                <div className="text-muted-foreground">Target</div>
                <div className="font-mono break-all">{TARGET}</div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              Marcas esperadas: <code>login.page.mount</code>, <code>login.react.ready</code>, <code>login.supabase.ready</code>,
              <code> login.auth.start/ok</code>, <code>login.redirect.start/ok</code>, <code>auth.ok</code>, <code>shell.ready</code>.
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">Pré-requisitos para rodar o login-only</div>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-foreground/80">
              <li>Node 20+ e Playwright instalado: <code>bunx playwright install chromium</code>.</li>
              <li>Arquivo <code>scripts/d19-2-creds.json</code> contendo array <code>[{"{email,password}"}]</code> com pelo menos N usuários sintéticos.</li>
              <li>Rodar fora do sandbox Lovable (notebook ou VM dedicada — 50 Chromiums saturam o sandbox).</li>
              <li>Após gerar o JSON, colar/upar na aba <strong>Analisar JSON</strong>.</li>
            </ol>
          </Card>
        </TabsContent>

        <TabsContent value="comandos" className="space-y-3">
          <Cmd label="Fase A — 10 usuários" cmd={cmd10} />
          <Cmd label="Fase B — 50 usuários" cmd={cmd50} />
          <Cmd label="Final — 100 usuários (carga geral)" cmd={cmd100} />
        </TabsContent>

        <TabsContent value="analise" className="space-y-3">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2"><FileJson className="h-4 w-4" /> Resultado do login-only</div>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/70">
                <Upload className="h-3.5 w-3.5" /> Carregar arquivo
                <input type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
              </label>
            </div>
            <Textarea
              value={raw}
              onChange={(e) => tryParse(e.target.value)}
              placeholder='Cole aqui o JSON gerado (ex.: docs/d19-2-login-only-50u.json)…'
              className="min-h-[140px] font-mono text-[11px]"
            />
            {parseError && (
              <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">{parseError}</div>
            )}
          </Card>

          {parsed && (
            <>
              <Card className="p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
                  <Badge variant="outline">USERS: {parsed.users ?? "?"}</Badge>
                  <Badge variant="outline">OK: {parsed.ok ?? "?"}</Badge>
                  <Badge variant="outline">ERR: {parsed.error ?? 0}</Badge>
                  <Badge variant="outline">Console err: {parsed.console_errors ?? 0}</Badge>
                  <Badge variant="outline">Ramp: {parsed.ramp_ms ?? "?"}ms</Badge>
                  {parsed.timestamp && <Badge variant="outline" className="font-mono">{parsed.timestamp}</Badge>}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-3">Fase</th>
                        <th className="py-2 pr-3">n</th>
                        <th className="py-2 pr-3">P50</th>
                        <th className="py-2 pr-3">P95</th>
                        <th className="py-2 pr-3">P99</th>
                        <th className="py-2 pr-3">avg</th>
                        <th className="py-2 pr-3">max</th>
                        <th className="py-2 pr-3">SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(parsed.phases ?? {}).map(([k, s]) => {
                        const cls = classifyP95(k, s?.p95 ?? null);
                        return (
                          <tr key={k} className="border-b border-border/50">
                            <td className="py-1.5 pr-3">
                              <div className="font-medium">{k}</div>
                              <div className="text-[10px] text-muted-foreground">{PHASE_LABELS[k] ?? ""}</div>
                            </td>
                            <td className="py-1.5 pr-3 font-mono">{s?.n ?? 0}</td>
                            <td className="py-1.5 pr-3 font-mono">{fmtMs(s?.p50 ?? null)}</td>
                            <td className="py-1.5 pr-3 font-mono font-semibold">{fmtMs(s?.p95 ?? null)}</td>
                            <td className="py-1.5 pr-3 font-mono">{fmtMs(s?.p99 ?? null)}</td>
                            <td className="py-1.5 pr-3 font-mono">{fmtMs(s?.avg ?? null)}</td>
                            <td className="py-1.5 pr-3 font-mono">{fmtMs(s?.max ?? null)}</td>
                            <td className="py-1.5 pr-3">{badgeFor(cls)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {dominante && (
                <Card className="border-indigo-200 bg-indigo-50/40 p-4">
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                    <Gauge className="h-4 w-4" /> Gargalo dominante: <code>{dominante.label}</code> (P95 {fmtMs(dominante.p95)})
                  </div>
                  {recomendacao && (
                    <div className="text-xs text-indigo-900/90">
                      <div className="mt-1"><strong>Correção sugerida:</strong> {recomendacao.fix}</div>
                      <div className="mt-1"><strong>Ganho estimado:</strong> {recomendacao.ganho}</div>
                      <div className="mt-2 text-[11px] text-indigo-900/70">
                        Próximo passo: abrir patch <code>D19.2.fix.50u.9</code> exclusivamente nesta camada. Não tocar RLS / banco / workflow.
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {(parsed.sample_console_errors?.length ?? 0) > 0 && (
                <Card className="p-4">
                  <div className="mb-2 text-sm font-semibold">Console errors (amostra)</div>
                  <ul className="space-y-1 text-[11px] font-mono text-red-800">
                    {parsed.sample_console_errors!.slice(0, 10).map((e, i) => (
                      <li key={i}>[u{e.user}] {e.text}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
