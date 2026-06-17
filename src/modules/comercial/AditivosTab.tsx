/**
 * Comercial — Aba de Aditivos.
 *
 * C-ENT.11.c (2026-06-17): Motor LS de aditivos descontinuado dentro de /comercial.
 * A verdade oficial de aditivos vive em Supabase (tabela `aditivos`, RPC `rpc_aditivo_aplicar`,
 * fluxo compensatório C-ENT.9), exposta nas abas "Aditivos" dos workspaces:
 *   - /comercial/contratos/$contratoId#tab=aditivos
 *   - /comercial/projetos/$projetoId#tab=aditivos
 *
 * Esta aba virou apenas um card de redirecionamento, sem leitura/escrita LS.
 * Não criar, aprovar, cancelar ou compensar aditivos por aqui.
 */
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, FileSignature, ArrowRight } from "lucide-react";
import type { Contrato } from "./_shared";

export function AditivosTab(_props: { contratos: Contrato[] }) {
  return (
    <div className="space-y-3">
      <Card className="p-5 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-4">
          <div className="rounded-md bg-primary/10 p-3">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-base font-semibold">Aditivos agora vivem no contrato</h2>
            <p className="text-sm text-muted-foreground">
              A gestão oficial de aditivos é feita por contrato, na aba <strong>Aditivos</strong> do
              workspace do contrato (Supabase). Lá você cria, aplica e compensa aditivos via RPC
              oficial, com timeline e auditoria. A lista LS desta aba foi descontinuada para
              eliminar duplicidade de verdade.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to="/comercial/contratos">
                <Button size="sm" variant="default">
                  <FileSignature className="h-4 w-4 mr-1.5" />
                  Abrir lista de contratos
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2">
              Permissões: <code>comercial.aditivo.visualizar</code> ·{" "}
              <code>comercial.aditivo.criar</code> · <code>comercial.aditivo.compensar</code> ·{" "}
              <code>comercial.aditivo.cancelar</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
