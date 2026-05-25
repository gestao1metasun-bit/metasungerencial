// Dialogs imperativos baseados no shadcn/AlertDialog.
// Substitui window.confirm() / window.prompt() por UI consistente do ERP.
//
// Uso:
//   const ok = await confirmDialog({ title: "Excluir?", description: "..." });
//   const motivo = await promptDialog({ title: "Motivo do estorno", minLength: 5 });
import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type PromptOptions = {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  minLength?: number;
  multiline?: boolean;
  confirmText?: string;
  cancelText?: string;
};

function mountTemp(render: (unmount: () => void) => React.ReactNode): void {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  const unmount = () => {
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 150);
  };
  root.render(render(unmount) as React.ReactElement);
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    mountTemp((unmount) => (
      <ConfirmShell
        opts={opts}
        onResolve={(v) => { resolve(v); unmount(); }}
      />
    ));
  });
}

export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    mountTemp((unmount) => (
      <PromptShell
        opts={opts}
        onResolve={(v) => { resolve(v); unmount(); }}
      />
    ));
  });
}

function ConfirmShell({ opts, onResolve }: { opts: ConfirmOptions; onResolve: (v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(true); }, []);
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); onResolve(false); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts.title}</AlertDialogTitle>
          {opts.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setOpen(false); onResolve(false); }}>
            {opts.cancelText ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            className={opts.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            onClick={() => { setOpen(false); onResolve(true); }}
          >
            {opts.confirmText ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PromptShell({ opts, onResolve }: { opts: PromptOptions; onResolve: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(opts.defaultValue ?? "");
  useEffect(() => { setOpen(true); }, []);
  const minLen = opts.minLength ?? 0;
  const trim = valor.trim();
  const valido = trim.length >= minLen;
  const submit = () => {
    if (!valido) return;
    setOpen(false);
    onResolve(trim);
  };
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); onResolve(null); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts.title}</AlertDialogTitle>
          {opts.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <div className="space-y-2">
          {opts.label && <Label className="text-xs">{opts.label}</Label>}
          {opts.multiline ? (
            <Textarea rows={3} autoFocus value={valor} placeholder={opts.placeholder}
              onChange={(e) => setValor(e.target.value)} />
          ) : (
            <Input autoFocus value={valor} placeholder={opts.placeholder}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          )}
          {minLen > 0 && (
            <div className="text-[11px] text-muted-foreground">
              Mín. {minLen} caracteres ({trim.length}/{minLen}).
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setOpen(false); onResolve(null); }}>
            {opts.cancelText ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction disabled={!valido} onClick={submit}>
            {opts.confirmText ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
