import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  useParametrosFinanceiros, salvarParametrosFinanceiros,
  type ParametrosFinanceiros,
} from "@/lib/fin-parametros-financeiros-store";
import { RmTabHeader } from "@/components/app/financeiro/RmTabHeader";

export function ParametrosFinanceirosForm() {
  const atuais = useParametrosFinanceiros();
  const [f, setF] = useState<ParametrosFinanceiros>(atuais);

  const upd = <K extends keyof ParametrosFinanceiros>(k: K, v: ParametrosFinanceiros[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  function salvar() {
    try {
      salvarParametrosFinanceiros(f);
      toast.success("Parâmetros financeiros atualizados.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-2 text-sm font-semibold">Política de Juros, Multa e Desconto</div>
        <p className="mb-4 text-xs text-muted-foreground">
          Define como o ERP calcula encargos sobre títulos vencidos e quem pode aprovar descontos em renegociações.
        </p>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Juros */}
          <section className="space-y-3 rounded-lg border bg-card/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Juros de mora</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={f.jurosTipo} onValueChange={(v) => upd("jurosTipo", v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Modo</Label>
                <Select value={f.jurosModo} onValueChange={(v) => upd("jurosModo", v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">
                  Valor {f.jurosTipo === "percentual" ? `(% ao ${f.jurosModo === "diario" ? "dia" : "mês"})` : `(R$ por ${f.jurosModo === "diario" ? "dia" : "mês"})`}
                </Label>
                <Input
                  type="number" step="0.001" min={0}
                  value={f.jurosValor}
                  onChange={(e) => upd("jurosValor", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Carência (dias)</Label>
                <Input
                  type="number" min={0}
                  value={f.carenciaDias}
                  onChange={(e) => upd("carenciaDias", Number(e.target.value))}
                />
              </div>
            </div>
          </section>

          {/* Multa */}
          <section className="space-y-3 rounded-lg border bg-card/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Multa por atraso</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={f.multaTipo} onValueChange={(v) => upd("multaTipo", v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  Valor {f.multaTipo === "percentual" ? "(%)" : "(R$)"}
                </Label>
                <Input
                  type="number" step="0.01" min={0}
                  value={f.multaValor}
                  onChange={(e) => upd("multaValor", Number(e.target.value))}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Tolerância sem multa (dias após vencimento)</Label>
                <Input
                  type="number" min={0}
                  value={f.toleranciaAtrasoDias}
                  onChange={(e) => upd("toleranciaAtrasoDias", Number(e.target.value))}
                />
              </div>
            </div>
          </section>

          {/* Aprovação de descontos */}
          <section className="space-y-3 rounded-lg border bg-card/50 p-4 lg:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Aprovação de Descontos (% sobre valor com encargos)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Limite auto-aprovação (até %)</Label>
                <Input
                  type="number" step="0.1" min={0}
                  value={f.limiteDescontoSemAprovacao}
                  onChange={(e) => upd("limiteDescontoSemAprovacao", Number(e.target.value))}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Até este % o financeiro pode aprovar diretamente.</p>
              </div>
              <div>
                <Label className="text-xs">Limite financeiro (até %)</Label>
                <Input
                  type="number" step="0.1" min={0}
                  value={f.limiteDescontoDiretoria}
                  onChange={(e) => upd("limiteDescontoDiretoria", Number(e.target.value))}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Acima deste %, exige aprovador da diretoria.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 flex items-center justify-between">
          {f.updatedAt && (
            <span className="text-[11px] text-muted-foreground">
              Última atualização: {new Date(f.updatedAt).toLocaleString("pt-BR")} {f.updatedBy ? `· ${f.updatedBy}` : ""}
            </span>
          )}
          <Button onClick={salvar}>Salvar parâmetros</Button>
        </div>
      </Card>
    </div>
  );
}
