import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sun, Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { signUpEmail, useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/cadastrar")({
  component: CadastrarPage,
});

function CadastrarPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    if (senha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await signUpEmail(email.trim().toLowerCase(), senha, nome.trim() || undefined);
      toast.success("Conta criada! Verifique seu e-mail para confirmar (se exigido) e faça login.");
      void navigate({ to: "/login" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha no cadastro.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
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
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Criar conta</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold">Crie sua conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O <strong>primeiro</strong> usuário cadastrado vira automaticamente <strong>Admin Master</strong>.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha (mín. 6 caracteres)</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="h-11 w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Criar conta <ArrowRight className="ml-2 h-4 w-4" /></>)}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Já tem conta? </span>
          <Link to="/login" className="text-primary hover:underline">Entrar</Link>
        </div>
      </Card>
    </div>
  );
}
