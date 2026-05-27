import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAuthSession, updatePassword } from "@/lib/auth-store";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const recoveryMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return hash.get("type") === "recovery";
  }, []);

  useEffect(() => {
    if (!recoveryMode) {
      toast.error("Link de recuperação inválido ou expirado.");
      void navigate({ to: "/login" });
    }
  }, [navigate, recoveryMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      await clearAuthSession();
      toast.success("Senha atualizada com sucesso. Faça login novamente.");
      void navigate({ to: "/login" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao atualizar senha.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative grid min-h-screen w-full place-items-center overflow-hidden bg-background px-4">
      <Card className="w-full max-w-md border-border bg-[image:var(--gradient-card)] p-8 shadow-[var(--shadow-elegant)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Redefinir senha</h1>
            <p className="text-sm text-muted-foreground">Defina uma nova senha para acessar o ERP.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="h-11 w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
          </Button>
        </form>
      </Card>
    </div>
  );
}