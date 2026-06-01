import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInEmail, useAuth } from "@/lib/auth-store";
import { perfMark, perfMeasure } from "@/lib/perf";
import metaSunLogo from "@/assets/meta-sun-logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// D19.2.fix.50u.9 — Dialog "Esqueci minha senha" sai do bundle inicial.
// Só baixa o chunk se o usuário clicar no link.
const ForgotPasswordDialog = lazy(() =>
  import("@/components/auth/ForgotPasswordDialog").then((m) => ({
    default: m.ForgotPasswordDialog,
  })),
);

// D19.2.fix.50u.9 — sonner sai do caminho crítico do /login.
// Carregado sob demanda apenas quando precisamos exibir um toast.
async function toastError(message: string) {
  try {
    const m = await import("sonner");
    m.toast.error(message);
  } catch {
    // silencioso — login não depende de toast para funcionar
  }
}
async function toastSuccess(message: string) {
  try {
    const m = await import("sonner");
    m.toast.success(message);
  } catch {
    /* noop */
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, errorMessage } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const lastAuthError = useRef<string | null>(null);
  const supabaseReadyMarked = useRef(false);
  const redirectStartedRef = useRef(false);
  const pageMountMarked = useRef(false);

  // D19.2.fix.50u.9 — login.page.mount fora do corpo do render.
  // useEffect com deps [] roda uma única vez por sessão, não a cada re-render.
  useEffect(() => {
    if (pageMountMarked.current) return;
    pageMountMarked.current = true;
    perfMark("login.page.mount");
  }, []);

  // login.react.ready — pós primeiro paint
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        perfMark("login.react.ready");
        perfMeasure("login.page.mount", "login.react.ready", "login.react.ready");
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // login.supabase.ready — auth-store fechou loading inicial
  useEffect(() => {
    if (!loading && !supabaseReadyMarked.current) {
      supabaseReadyMarked.current = true;
      perfMark("login.supabase.ready");
      perfMeasure("login.page.mount", "login.supabase.ready", "login.supabase.ready");
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && user) {
      if (redirectStartedRef.current) {
        perfMark("login.redirect.ok");
        perfMeasure("login.redirect.start", "login.redirect.ok", "login.redirect.ok");
      }
      void navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && !user && errorMessage && lastAuthError.current !== errorMessage) {
      lastAuthError.current = errorMessage;
      void toastError(errorMessage);
    }
    if (!errorMessage) {
      lastAuthError.current = null;
    }
  }, [errorMessage, loading, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) {
      void toastError("Informe e-mail e senha.");
      return;
    }
    setSubmitting(true);
    perfMark("login.start");
    perfMark("login.auth.start");
    try {
      await signInEmail(email.trim().toLowerCase(), senha);
      perfMark("auth.ok");
      perfMark("login.auth.ok");
      perfMeasure("login.auth.start", "login.auth.ok", "login.auth.ok");
      perfMeasure("login.start", "auth.ok", "auth.ok");
      void toastSuccess("Login efetuado.");
      perfMark("login.redirect.start");
      redirectStartedRef.current = true;
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao entrar.";
      void toastError(
        msg.toLowerCase().includes("invalid login")
          ? "E-mail ou senha incorretos."
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative grid min-h-screen w-full place-items-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-info/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-[image:var(--gradient-card)] p-8 shadow-[var(--shadow-elegant)]">
        <div className="mb-8 flex flex-col items-center gap-2">
          <img
            src={metaSunLogo}
            alt="Meta Sun Energia Solar"
            className="h-20 w-auto object-contain"
            width={160}
            height={80}
            decoding="async"
            fetchPriority="high"
          />
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            ERP - Enterprise
          </div>
        </div>

        <h1 className="text-2xl font-semibold">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesse sua conta para continuar.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha">Senha</Label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                disabled={submitting}
                className="text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80 disabled:pointer-events-none disabled:opacity-60"
              >
                Esqueci minha senha
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Entrar <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Primeiro acesso? </span>
          <Link to="/cadastrar" className="text-primary hover:underline">
            Criar conta
          </Link>
        </div>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Meta Sun Energia Solar
        </div>
      </div>

      {forgotOpen && (
        <Suspense fallback={null}>
          <ForgotPasswordDialog
            open={forgotOpen}
            onOpenChange={setForgotOpen}
            initialEmail={email}
          />
        </Suspense>
      )}
    </div>
  );
}
