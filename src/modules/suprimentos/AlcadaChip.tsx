/**
 * D20.SUP.9 — Chip "Alçada" inline para Requisições.
 *
 * Popover sob demanda que chama rpc_sup_alcada_avaliar (etapa REQUISICAO)
 * apenas quando aberto — evita carga e bypass de RLS na listagem.
 *
 * Sem mutação. Apenas leitura via RPC oficial.
 */
import { useState } from "react";
import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { AvaliacaoAlcada } from "@/lib/repositories/suprimentos-alcadas-repo";

type Props = {
  requisicaoId: string;
  valor: number;
};

export function AlcadaChip({ requisicaoId, valor }: Props) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    enabled: open && !!requisicaoId,
    queryKey: ["sup-alcada-eval", "REQUISICAO", requisicaoId, valor],
    staleTime: 60_000,
    queryFn: async (): Promise<AvaliacaoAlcada> => {
      const { data, error } = await supabase.rpc("rpc_sup_alcada_avaliar" as never, {
        p_entidade_tipo: "REQUISICAO",
        p_entidade_id: requisicaoId,
        p_etapa: "REQUISICAO",
        p_valor: valor ?? null,
      } as never);
      if (error) throw error;
      return data as unknown as AvaliacaoAlcada;
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-5 px-1.5 text-[10px] gap-1 border-indigo-300 bg-indigo-50/60 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
          onClick={(e) => e.stopPropagation()}
          title="Ver alçada aplicável"
        >
          <ShieldCheck className="h-3 w-3" />
          Alçada
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-72 p-2 text-[11.5px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 mb-1.5 text-[12px] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-700" />
          Alçada aplicável
        </div>
        {isLoading && <p className="text-muted-foreground">Avaliando…</p>}
        {error && <p className="text-red-700">Erro: {(error as Error).message}</p>}
        {data && data.matched && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold truncate">{data.alcada_nome}</span>
              <Badge variant="outline" className="text-[9.5px]">
                {data.aprovador_tipo === "ROLE" ? "Papel" : "Permissão"}
              </Badge>
            </div>
            <div className="text-muted-foreground">
              Aprovador: <span className="font-mono">{data.aprovador_valor}</span>
            </div>
            <div className="text-muted-foreground">
              Valor avaliado:{" "}
              <span className="tabular-nums font-semibold">
                {Number(data.valor_avaliado ?? 0).toLocaleString("pt-BR", {
                  style: "currency", currency: "BRL",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {data.exige_workflow && (
                <Badge variant="outline" className="text-[9.5px] border-amber-300 bg-amber-50 text-amber-800">
                  Workflow
                </Badge>
              )}
              {data.observacao_obrigatoria && (
                <Badge variant="outline" className="text-[9.5px] border-red-300 bg-red-50 text-red-800">
                  Justificativa obrigatória
                </Badge>
              )}
            </div>
          </div>
        )}
        {data && !data.matched && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-amber-700">
              <ShieldQuestion className="h-3.5 w-3.5" />
              <span className="font-semibold">Alçada ordinária</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Nenhuma regra específica cobre este valor / classificação. A aprovação
              segue regra ordinária do módulo (permissão padrão).
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
