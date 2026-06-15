/**
 * C-ENT.1.c — Alerta de duplicidade de cliente.
 * Lista similares (rpc_cliente_buscar_similar) e oferece 3 ações:
 *  - Abrir 360º do cliente encontrado
 *  - Continuar mesmo assim (registra decisão em error_log severidade=warn)
 *  - Cancelar cadastro
 */
import React from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Open360Button } from "./Open360Button";
import type { ClienteSimilarRow } from "@/lib/repositories/oportunidades-repo";
import { logError } from "@/lib/repositories/error-log-repo";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  similares: ClienteSimilarRow[];
  novoCliente: { nome?: string; doc?: string; email?: string; telefone?: string };
  onContinuar: () => void;
  onCancelar: () => void;
};

export function ClienteDuplicidadeAlert({
  open,
  onOpenChange,
  similares,
  novoCliente,
  onContinuar,
  onCancelar,
}: Props) {
  const ordenados = [...similares].sort((a, b) => b.score - a.score);
  const top = ordenados[0];

  const handleContinuar = () => {
    logError({
      severidade: "warn",
      modulo: "comercial",
      tela: "novo-cliente",
      acao: "cliente.duplicidade.ignorada",
      mensagem: `Usuário ignorou alerta de duplicidade ao cadastrar cliente "${novoCliente.nome ?? "?"}".`,
      payload: {
        novo: novoCliente,
        similares_ids: ordenados.map((s) => s.id),
        top_score: top?.score ?? null,
      },
    });
    onContinuar();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Possível duplicidade detectada</DialogTitle>
              <DialogDescription className="text-xs">
                Encontramos {ordenados.length} cliente{ordenados.length > 1 ? "s" : ""} semelhante
                {ordenados.length > 1 ? "s" : ""} ao que está sendo cadastrado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {ordenados.map((c, idx) => {
            const isTop = idx === 0;
            return (
              <div
                key={c.id}
                className={`rounded-lg border p-3 ${
                  isTop ? "border-amber-400 bg-amber-50/50" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{c.nome}</span>
                      {isTop && (
                        <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px]">
                          Mais provável
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        Score {c.score} · {c.motivo}
                      </Badge>
                    </div>
                    <div className="mt-1 grid gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-3">
                      {c.doc && <div>Doc: {c.doc}</div>}
                      {c.telefone && <div>Tel: {c.telefone}</div>}
                      {c.email && <div className="truncate">E-mail: {c.email}</div>}
                    </div>
                  </div>
                  <Open360Button clienteId={c.id} size="sm" variant="outline" />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onCancelar}>
            Cancelar cadastro
          </Button>
          <div className="flex gap-2">
            {top && <Open360Button clienteId={top.id} size="sm" variant="outline" />}
            <Button
              onClick={handleContinuar}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Continuar mesmo assim
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
