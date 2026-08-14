import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Percent } from "lucide-react";
import { toast } from "sonner";
import {
  useComissaoPolicy,
  setComissaoPolicy,
  type FaixaComissao,
} from "@/modules/propostas/comissao-policy-store";

/** Política de comissionamento por faixa de parâmetro (R$/kWp). */
export function ComissionamentoConfigTab() {
  const pol = useComissaoPolicy();
  const [faixas, setFaixas] = useState<FaixaComissao[]>(pol.faixas);
  const [acima, setAcima] = useState<number>(pol.percentualAcima);
  const [base, setBase] = useState<typeof pol.base>(pol.base);
  const [parametroBase, setParametroBase] = useState<number>(pol.parametroBase);
  const [bonusPct, setBonusPct] = useState<number>(pol.bonusExcedentePct);

  function setFaixa(i: number, patch: Partial<FaixaComissao>) {
    setFaixas((cur) => cur.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function salvar() {
    const limpas = faixas
      .filter((f) => f.ateParametro > 0)
      .sort((a, b) => a.ateParametro - b.ateParametro);
    setComissaoPolicy({
      faixas: limpas,
      percentualAcima: acima,
      base,
      parametroBase,
      bonusExcedentePct: bonusPct,
    });
    setFaixas(limpas);
    toast.success("Política de comissionamento atualizada.");
  }


  return (
    <Card className="bg-[image:var(--gradient-card)] p-6">
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Política de comissionamento</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Defina as faixas: <strong>até X R$/kWp paga Y% de comissão</strong>. A proposta exibe a comissão
        automaticamente conforme o parâmetro selecionado.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label>Base de cálculo</Label>
          <Select value={base} onValueChange={(v) => setBase(v as typeof base)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="VALOR_FINAL">Valor final da proposta</SelectItem>
              <SelectItem value="VALOR_BRUTO">Valor bruto (sem desconto)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Percentual acima da última faixa (%)</Label>
          <Input
            className="mt-1"
            type="number"
            step="0.1"
            value={acima}
            onChange={(e) => setAcima(+e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Até parâmetro (R$/kWp)</TableHead>
              <TableHead className="text-right">Comissão (%)</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {faixas.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  Nenhuma faixa cadastrada.
                </TableCell>
              </TableRow>
            )}
            {faixas.map((f, i) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Input
                    type="number"
                    step="1"
                    className="h-8"
                    value={f.ateParametro}
                    onChange={(e) => setFaixa(i, { ateParametro: +e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-8 text-right"
                    value={f.percentual}
                    onChange={(e) => setFaixa(i, { percentual: +e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setFaixas((cur) => cur.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setFaixas((cur) => [
              ...cur,
              { id: `f-${Date.now().toString(36)}`, ateParametro: 0, percentual: 0 },
            ])
          }
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar faixa
        </Button>
        <Button onClick={salvar} className="bg-[image:var(--gradient-primary)] text-primary-foreground">
          Salvar política
        </Button>
      </div>
    </Card>
  );
}

export default ComissionamentoConfigTab;
