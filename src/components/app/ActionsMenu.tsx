import * as React from "react";
import { ChevronDown, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * ActionsMenu — botão padrão de "Opções/Ações" do sistema.
 * Trigger preto com ícone de engrenagem + chevron. Ao clicar abre o menu
 * com as opções (children são DropdownMenuItem / Separator).
 */
export function ActionsMenu({
  label,
  children,
  align = "start",
  side = "bottom",
  className,
  triggerClassName,
  disabled,
  title = "Opções",
}: {
  /** rótulo opcional exibido como cabeçalho do menu */
  label?: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={title}
          aria-label={title}
          className={cn(
            "inline-flex h-8 w-[68px] items-center justify-center gap-1.5 rounded-md",
            "bg-[#2b3344] text-white shadow-sm ring-1 ring-black/10",
            "hover:bg-[#3a4356] active:bg-[#222a39]",
            "transition-colors disabled:opacity-50 disabled:pointer-events-none",
            triggerClassName,
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        className={cn("w-56", className)}
      >
        {label && (
          <>
            <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
