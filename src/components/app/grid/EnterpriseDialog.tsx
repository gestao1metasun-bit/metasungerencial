/**
 * D6.12.1 — EnterpriseDialog
 *
 * Wrapper de Dialog corporativo padrão TOTVS RM:
 *   - cabeçalho contextual (título + subtítulo + badges)
 *   - toolbar interna (slot superior, ex.: salvar/aprovar/imprimir)
 *   - abas opcionais (via Tabs do shadcn — passar pelo children)
 *   - rodapé com ações primárias/secundárias
 *   - drawer histórico opcional acoplado (lado direito)
 *   - validação inline (mensagens no rodapé)
 *
 * Não impõe formulário/estado: é um shell visual + ergonômico.
 *
 * Uso:
 *   <EnterpriseDialog
 *     open={open} onOpenChange={setOpen}
 *     titulo="Renegociar títulos"
 *     subtitulo="3 títulos selecionados · Cliente ACME"
 *     badges={[{ label: "Workflow 5k+", tone: "warning" }]}
 *     toolbar={<Button>Imprimir</Button>}
 *     historico={{ entidade: "titulos_financeiros", entidadeId: "..." }}
 *     footer={
 *       <>
 *         <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
 *         <Button onClick={salvar}>Salvar acordo</Button>
 *       </>
 *     }
 *   >
 *     <form>...</form>
 *   </EnterpriseDialog>
 */
import { type ReactNode, useState } from "react";
import { History, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HistoricoDrawer } from "./HistoricoDrawer";
import type { AuditEntidade } from "@/lib/audit-store";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "primary" | "success" | "danger" | "warning";

export type EnterpriseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  subtitulo?: string;
  badges?: Array<{ label: string; tone?: BadgeTone }>;
  /** Slot superior (toolbar interna). */
  toolbar?: ReactNode;
  /** Conteúdo principal (form / tabs). */
  children: ReactNode;
  /** Slot inferior (botões de ação). */
  footer?: ReactNode;
  /** Mensagens de validação inline (acima do footer). */
  validacao?: ReactNode;
  /** Histórico contextual; quando passado, mostra botão "Histórico" no header. */
  historico?: { entidade: AuditEntidade; entidadeId?: string | null };
  /** Largura. Default: max-w-3xl. */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
};

const sizeClass: Record<NonNullable<EnterpriseDialogProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
  full: "sm:max-w-[95vw]",
};

const badgeToneClass: Record<BadgeTone, string> = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/15 text-primary border-primary/30",
  success: "bg-success/15 text-success border-success/30",
  danger:  "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

export function EnterpriseDialog({
  open, onOpenChange, titulo, subtitulo, badges,
  toolbar, children, footer, validacao, historico,
  size = "lg", className,
}: EnterpriseDialogProps) {
  const [histOpen, setHistOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "p-0 gap-0 flex flex-col max-h-[90vh] overflow-hidden",
            sizeClass[size],
            className,
          )}
        >
          {/* Cabeçalho */}
          <DialogHeader className="border-b border-border bg-muted/40 px-4 py-2.5 flex flex-row items-start gap-3 space-y-0">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[13px] font-semibold leading-tight flex items-center gap-2 flex-wrap">
                {titulo}
                {badges?.map((b, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={cn("text-[10px] font-medium uppercase tracking-wide", badgeToneClass[b.tone ?? "default"])}
                  >
                    {b.label}
                  </Badge>
                ))}
              </DialogTitle>
              {subtitulo && (
                <DialogDescription className="text-[11px] mt-0.5 truncate">
                  {subtitulo}
                </DialogDescription>
              )}
            </div>
            {historico && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 text-[11.5px] font-medium"
                onClick={() => setHistOpen(true)}
                title="Histórico"
              >
                <History className="h-3.5 w-3.5" />
                Histórico
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onOpenChange(false)}
              title="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </DialogHeader>

          {/* Toolbar interna (opcional) */}
          {toolbar && (
            <div className="flex items-center gap-1 border-b border-border bg-background px-3 py-1.5">
              {toolbar}
            </div>
          )}

          {/* Corpo */}
          <div className="flex-1 overflow-auto px-4 py-3 text-[12.5px]">
            {children}
          </div>

          {/* Validação + Rodapé */}
          {(validacao || footer) && (
            <div className="border-t border-border bg-muted/40 px-4 py-2.5 flex flex-col gap-2">
              {validacao && (
                <div className="text-[11.5px] text-destructive">{validacao}</div>
              )}
              {footer && (
                <div className="flex items-center justify-end gap-2">
                  {footer}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {historico && (
        <HistoricoDrawer
          open={histOpen}
          onOpenChange={setHistOpen}
          entidade={historico.entidade}
          entidadeId={historico.entidadeId}
          titulo={titulo}
          descricao={subtitulo}
        />
      )}
    </>
  );
}
