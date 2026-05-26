/**
 * D7.1 — Card de cobertura de auditoria.
 *
 * Consome a view `v_auditoria_cobertura` e exibe, em formato compacto,
 * quantas tabelas críticas/importantes têm tg_audit_row ativo e quais
 * ainda estão como GAP. Evidência permanente para governança.
 */
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Linha = {
  categoria: "CRITICA" | "IMPORTANTE" | "UTILITARIA" | "APPEND_ONLY";
  tabela: string;
  tem_audit_row: boolean;
  tem_snapshot: boolean;
  status_cobertura: "OK" | "GAP";
};

export function AuditoriaCoberturaCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["v_auditoria_cobertura"],
    queryFn: async (): Promise<Linha[]> => {
      const { data, error } = await (supabase as any)
        .from("v_auditoria_cobertura")
        .select("*");
      if (error) throw error;
      return (data ?? []) as Linha[];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="text-sm text-muted-foreground">
          Carregando cobertura de auditoria…
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 p-5">
        <div className="text-sm text-destructive">
          Falha ao carregar cobertura de auditoria: {(error as Error).message}
        </div>
      </Card>
    );
  }

  const rows = data ?? [];
  const criticas = rows.filter((r) => r.categoria === "CRITICA");
  const importantes = rows.filter((r) => r.categoria === "IMPORTANTE");
  const gaps = rows.filter((r) => r.status_cobertura === "GAP");
  const cobertasCriticas = criticas.filter((r) => r.tem_audit_row).length;
  const cobertasImportantes = importantes.filter((r) => r.tem_audit_row).length;

  const tudoOk = gaps.length === 0;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 place-items-center rounded-lg ${
            tudoOk
              ? "bg-emerald-500/15 text-emerald-700"
              : "bg-amber-500/15 text-amber-700"
          }`}
        >
          {tudoOk ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <ShieldAlert className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              D7.1 — Cobertura de auditoria
            </div>
            <Badge
              variant="outline"
              className={
                tudoOk
                  ? "border-emerald-400/60 bg-emerald-50 text-emerald-800"
                  : "border-amber-400/60 bg-amber-50 text-amber-800"
              }
            >
              {tudoOk ? "100% coberto" : `${gaps.length} gap(s)`}
            </Badge>
          </div>
          <div className="mt-1 text-base font-semibold tracking-tight">
            Críticas: {cobertasCriticas}/{criticas.length} · Importantes:{" "}
            {cobertasImportantes}/{importantes.length}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Tabelas com <code className="rounded bg-muted px-1 text-xs">tg_audit_row</code>{" "}
            registram before/after em <code className="rounded bg-muted px-1 text-xs">audit_log</code>{" "}
            para criar, editar, cancelar, aprovar, baixar etc.
          </p>

          {gaps.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-300/50 bg-amber-50/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <FileSearch className="h-3.5 w-3.5" />
                Gaps remanescentes
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {gaps.map((g) => (
                  <Badge
                    key={g.tabela}
                    variant="outline"
                    className="border-amber-400/60 bg-white text-amber-900"
                  >
                    {g.tabela}
                    <span className="ml-1 text-[10px] text-amber-700/70">
                      ({g.categoria.toLowerCase()})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
