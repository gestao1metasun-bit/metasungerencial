/**
 * C-ENT.1.c — Botão "Abrir 360º" reutilizável.
 * Abre /comercial/clientes/$clienteId sem interferir no clique padrão da linha.
 */
import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  clienteId: string;
  size?: "sm" | "icon";
  variant?: "ghost" | "outline" | "secondary";
  className?: string;
  label?: string;
};

export function Open360Button({
  clienteId,
  size = "icon",
  variant = "ghost",
  className,
  label = "Abrir Workspace 360º do Cliente",
}: Props) {
  const navigate = useNavigate();
  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigate({ to: "/comercial/clientes/$clienteId", params: { clienteId } });
  };
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={variant}
            size={size}
            className={className}
            onClick={open}
            aria-label={label}
          >
            <LayoutDashboard className="h-4 w-4 text-blue-600" />
            {size !== "icon" ? <span className="ml-2">360º</span> : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
