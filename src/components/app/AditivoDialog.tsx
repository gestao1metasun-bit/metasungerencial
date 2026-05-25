// Dialog de criação de aditivo contratual.
// Passos: tipo + impacto + categoria → alterações → distribuição → revisão.
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { fmtBRL } from "@/lib/mock-data";
import {
  ADITIVO_CATEGORIA_LABEL,
  calcularDistribuicaoProporcional,
  criarAditivo,
  type AditivoCategoria,
  type AditivoProjetoDistribuicao,
} from "@/lib/aditivos-store";
import type { ContratoFull } from "@/lib/contratos-store";

export function AditivoDialog({
  open, onOpenChange, contrato, usuario,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contrato: ContratoFull;
  usuario: string;
}) {
  const [tipo, setTipo] = useState<"acumulativo" | "substitutivo">("acumulativo");
  const [impacto, setImpacto] = useState(false);
  const [categoria, setCategoria] = useState<AditivoCategoria>("ajuste_tecnico");
  const [descricao, setDescricao] = useState("");
  const [motivo, setMotivo] = useState("");
  const [deltaModulos, setDeltaModulos] = useState<string>("");
  const [novaInversor, setNovaInversor] = useState("");
  const [deltaKwp, setDeltaKwp] = useState<string>("");
  const [deltaValor, setDeltaValor] = useState<string>("");
  const [novoEndereco, setNovoEndereco] = useState("");
  const [estrutura, setEstrutura] = useState("");
  const [obsTec, setObsTec] = useState("");
  const [overrides, setOverrides] = useState<Record<string, { dm?: string; dv?: string }>>({});

  const dmNum = Number(deltaModulos) || 0;
  const dvNum = Number(deltaValor) || 0;

  const distribuicaoAuto = useMemo(
    () => calcularDistribuicaoProporcional(contrato, dmNum, dvNum),
    [contrato, dmNum, dvNum],
  );

  const distribuicaoFinal: AditivoProjetoDistribuicao[] = distribuicaoAuto.map((d) => {
    const ov = overrides[d.projetoId];
    return {
      projetoId: d.projetoId,
      deltaModulos: ov?.dm !== undefined && ov.dm !== "" ? Number(ov.dm) : d.deltaModulos,
      deltaValor: ov?.dv !== undefined && ov.dv !== "" ? Number(ov.dv) : d.deltaValor,
    };
  });

  function reset() {
    setTipo("acumulativo"); setImpacto(false); setCategoria("ajuste_tecnico");
    setDescricao(""); setMotivo(""); setDeltaModulos(""); setNovaInversor("");
    setDeltaKwp(""); setDeltaValor(""); setNovoEndereco(""); setEstrutura("");
    setObsTec(""); setOverrides({});
  }

  function handleCreate() {
    if (!descricao.trim()) { toast.error("Informe a descrição do aditivo."); return; }
    if (!motivo.trim()) { toast.error("Informe o motivo."); return; }
    if (impacto && !deltaValor) { toast.error("Aditivo com impacto financeiro precisa do valor."); return; }
    const alteracoes = {
      modulos: deltaModulos ? Number(deltaModulos) : undefined,
      inversores: novaInversor || undefined,
      potenciaKwp: deltaKwp ? Number(deltaKwp) : undefined,
      valor: deltaValor ? Number(deltaValor) : undefined,
      endereco: novoEndereco || undefined,
      estruturaTecnica: estrutura || undefined,
      observacoesTecnicas: obsTec || undefined,
    };
    const novo = criarAditivo(
      {
        contratoId: contrato.id,
        tipo, impactoFinanceiro: impacto, categoria,
        descricao, motivo, alteracoes,
        distribuicaoProjetos: distribuicaoFinal,
        usuario,
      },
      contrato,
    );
    toast.success(`Aditivo ${novo.id} criado.`);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo aditivo — contrato {contrato.id}</DialogTitle>
          <DialogDescription>
            Contrato assinado não volta etapa. Toda alteração posterior é registrada como aditivo,
            com fluxo de assinatura e aprovação obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cabeçalho */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acumulativo">Acumulativo (soma ao anterior)</SelectItem>
                  <SelectItem value="substitutivo">Substitutivo (invalida anteriores)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as AditivoCategoria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ADITIVO_CATEGORIA_LABEL) as AditivoCategoria[]).map((k) => (
                    <SelectItem key={k} value={k}>{ADITIVO_CATEGORIA_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <div className="flex items-center gap-2">
                <Switch checked={impacto} onCheckedChange={setImpacto} id="aditivo-impacto" />
                <Label htmlFor="aditivo-impacto" className="text-sm">Impacto financeiro</Label>
              </div>
            </div>
          </div>

          <div>
            <Label>Descrição curta</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Acréscimo de 10 módulos por aumento de consumo" />
          </div>
          <div>
            <Label>Motivo</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Justificativa do aditivo" />
          </div>

          {/* Alterações */}
          <div className="rounded-md border p-3 space-y-3 bg-muted/30">
            <div className="text-sm font-semibold">Alterações (preencha apenas o que muda)</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Δ Módulos (+/-)</Label>
                <Input type="number" value={deltaModulos} onChange={(e) => setDeltaModulos(e.target.value)} placeholder="ex.: +10" />
              </div>
              <div>
                <Label className="text-xs">Δ Potência (kWp)</Label>
                <Input type="number" step="0.01" value={deltaKwp} onChange={(e) => setDeltaKwp(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Δ Valor (R$)</Label>
                <Input type="number" step="0.01" value={deltaValor} onChange={(e) => setDeltaValor(e.target.value)} disabled={!impacto} />
              </div>
              <div>
                <Label className="text-xs">Novos inversores</Label>
                <Input value={novaInversor} onChange={(e) => setNovaInversor(e.target.value)} placeholder="Ex.: 1x Growatt 10kW" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Novo endereço</Label>
                <Input value={novoEndereco} onChange={(e) => setNovoEndereco(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <Label className="text-xs">Estrutura técnica</Label>
                <Input value={estrutura} onChange={(e) => setEstrutura(e.target.value)} placeholder="Ex.: telhado fibrocimento → metálico" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observações técnicas</Label>
              <Textarea value={obsTec} onChange={(e) => setObsTec(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Distribuição */}
          {(contrato.projetos?.length ?? 0) > 0 && (dmNum !== 0 || dvNum !== 0) && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-semibold">Distribuição nos projetos (automática, editável)</div>
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="text-right">Módulos atuais</TableHead>
                    <TableHead className="text-right">Δ Módulos</TableHead>
                    <TableHead className="text-right">Δ Valor (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distribuicaoAuto.map((d) => {
                    const proj = contrato.projetos!.find((p) => p.id === d.projetoId)!;
                    const ov = overrides[d.projetoId] ?? {};
                    return (
                      <TableRow key={d.projetoId}>
                        <TableCell className="font-mono">{proj.id}</TableCell>
                        <TableCell className="text-right">{proj.modulos ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="h-7 w-20 text-right ml-auto"
                            value={ov.dm ?? String(d.deltaModulos)}
                            onChange={(e) => setOverrides({ ...overrides, [d.projetoId]: { ...ov, dm: e.target.value } })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            className="h-7 w-28 text-right ml-auto"
                            value={ov.dv ?? String(d.deltaValor)}
                            onChange={(e) => setOverrides({ ...overrides, [d.projetoId]: { ...ov, dv: e.target.value } })}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="text-[11px] text-muted-foreground">
                Total distribuído: Δ Módulos {distribuicaoFinal.reduce((s, d) => s + d.deltaModulos, 0)} ·
                Δ Valor {fmtBRL(distribuicaoFinal.reduce((s, d) => s + d.deltaValor, 0))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate}>Criar aditivo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
