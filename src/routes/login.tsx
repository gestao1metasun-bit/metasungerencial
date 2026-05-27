import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sun, Mail, Lock, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { requestPasswordReset, signInEmail, useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("renanbarc16@gmail.com");

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) {
      toast.error("Informe e-mail e senha.");
      return;
    }
    setSubmitting(true);
    try {
      await signInEmail(email.trim().toLowerCase(), senha);
      toast.success("Login efetuado.");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao entrar.";
      toast.error(
        msg.toLowerCase().includes("invalid login")
          ? "E-mail ou senha incorretos."
          : msg
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!recoveryEmail) {
      toast.error("Informe seu e-mail para recuperar a senha.");
      return;
    }

    setRecovering(true);
    try {
      await requestPasswordReset(recoveryEmail.trim().toLowerCase());
      toast.success("Enviamos o link de redefinição para o seu e-mail.");
      setEmail((prev) => prev || recoveryEmail.trim().toLowerCase());
      setForgotOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar recuperação.";
      toast.error(msg);
    } finally {
      setRecovering(false);
    }
  }

  return (
    <div className="relative grid min-h-screen w-full place-items-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-info/15 blur-3xl" />

      <Card className="relative z-10 w-full max-w-md border-border bg-[image:var(--gradient-card)] p-8 shadow-[var(--shadow-elegant)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Sun className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">Meta Sun Gerencial</div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plataforma interna</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta para continuar.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha">Senha</Label>
              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail(email.trim().toLowerCase() || "renanbarc16@gmail.com");
                  setForgotOpen(true);
                }}
                disabled={recovering || submitting}
                className="text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80 disabled:pointer-events-none disabled:opacity-60"
              >
                Esqueci minha senha
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="h-11 w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Entrar <ArrowRight className="ml-2 h-4 w-4" /></>)}
          </Button>

          <button
            type="button"
            onClick={() => {
              setRecoveryEmail(email.trim().toLowerCase() || "renanbarc16@gmail.com");
              setForgotOpen(true);
            }}
            disabled={recovering || submitting}
            className="flex w-full items-center justify-center gap-2 text-sm font-medium text-primary underline underline-offset-4 hover:opacity-80 disabled:pointer-events-none disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            Esqueci minha senha
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Primeiro acesso? </span>
          <Link to="/cadastrar" className="text-primary hover:underline">Criar conta</Link>
        </div>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Meta Sun Energia Solar
        </div>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar acesso</DialogTitle>
            <DialogDescription>
              Informe o e-mail para receber o link de redefinição e seguir para a tela <strong>/reset-password</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="recovery-email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="recovery-email"
                type="email"
                autoComplete="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} disabled={recovering}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleForgotPassword()}
              disabled={recovering}
              className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
            >
              {recovering ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de recuperação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
