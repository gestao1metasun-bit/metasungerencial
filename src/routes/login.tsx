import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sun, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@metasun.com");
  const [senha, setSenha] = useState("••••••••");

  return (
    <div className="relative grid min-h-screen w-full place-items-center overflow-hidden bg-background px-4">
      {/* Background flair */}
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

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/dashboard" });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha">Senha</Label>
              <a href="#" className="text-xs text-primary hover:underline">Esqueci minha senha</a>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <Button type="submit" className="h-11 w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
            Entrar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Meta Sun Energia Solar
        </div>
      </Card>
    </div>
  );
}
