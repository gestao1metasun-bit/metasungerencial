import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialEmail?: string;
}

// D19.2.fix.50u.9 — Dialog isolado em chunk próprio.
// /login não paga este custo no boot.
export function ForgotPasswordDialog({ open, onOpenChange, initialEmail }: Props) {
  const [recoveryEmail, setRecoveryEmail] = useState(
    initialEmail?.trim().toLowerCase() || "renanbarc16@gmail.com",
  );
  const [recovering, setRecovering] = useState(false);

  async function handle() {
    if (!recoveryEmail) {
      const m = await import("sonner");
      m.toast.error("Informe seu e-mail para recuperar a senha.");
      return;
    }
    setRecovering(true);
    try {
      await requestPasswordReset(recoveryEmail.trim().toLowerCase());
      const m = await import("sonner");
      m.toast.success("Enviamos o link de redefinição para o seu e-mail.");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar recuperação.";
      const m = await import("sonner");
      m.toast.error(msg);
    } finally {
      setRecovering(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar acesso</DialogTitle>
          <DialogDescription>
            Informe o e-mail para receber o link de redefinição e seguir para a tela{" "}
            <strong>/reset-password</strong>.
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
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={recovering}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handle()}
            disabled={recovering}
            className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
          >
            {recovering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Enviar link de recuperação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
