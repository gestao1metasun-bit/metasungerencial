/**
 * C-ENT.8 / C-ENT.9 — Dialog "Novo Aditivo" (Projeto ou Contrato).
 * Modo NORMAL (default) ou COMPENSATORIO (quando recebe `aditivoOrigem`).
 * Aplica imediatamente via rpc_aditivo_aplicar.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAplicarAditivoSupabase, type AditivoSupabase } from "@/lib/repositories/aditivos-repo";
import type { ContratoSupabase, ProjetoSupabase } from "@/lib/repositories/contratos-supabase-repo";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contrato: ContratoSupabase;
  projetos: ProjetoSupabase[];
  projetoIdInicial?: string | null;
  /** C-ENT.9 — quando definido, dialog entra em modo COMPENSATÓRIO. */
  aditivoOrigem?: AditivoSupabase | null;
};

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function NovoAditivoDialog({ open, onOpenChange, contrato, projetos, projetoIdInicial, aditivoOrigem }: Props) {
  const compensatorio = !!aditivoOrigem;
  const escopoInicial: "PROJETO" | "CONTRATO" =
    aditivoOrigem?.tipo_escopo ?? "PROJETO";
  const projetoInicialId = aditivoOrigem?.projeto_id ?? projetoIdInicial ?? null;

  const [escopo, setEscopo] = useState<"PROJETO" | "CONTRATO">(escopoInicial);
  const [projetoId, setProjetoId] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorNovo, setValorNovo] = useState<string>("");
  const [potenciaNova, setPotenciaNova] = useState<string>("");
  const [modulosNovo, setModulosNovo] = useState<string>("");
  const [inversorNovo, setInversorNovo] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [motivoComp, setMotivoComp] = useState<string>("");
  const aplicar = useAplicarAditivoSupabase();

  useEffect(() => {
    if (open) {
      setEscopo(escopoInicial);
      setProjetoId(projetoInicialId ?? (projetos[0]?.id ?? ""));
      setMotivo("");
      setDescricao("");
      setValorNovo("");
      setPotenciaNova("");
      setModulosNovo("");
      setInversorNovo("");
      setObservacoes("");
      setMotivoComp("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projetoInicialId, projetos, escopoInicial]);

  const projetoSel = useMemo(
    () => projetos.find((p) => p.id === projetoId) ?? null,
    [projetoId, projetos],
  );

  const atual = escopo === "PROJETO"
    ? {
        valor: projetoSel?.valor_estimado ?? 0,
        potencia: Number(projetoSel?.potencia_kwp ?? 0),
        modulos: Number(projetoSel?.modulos_qtde ?? 0),
        inversor: projetoSel?.inversor ?? "",
      }
    : {
        valor: contrato.valor_total ?? 0,
        potencia: Number(contrato.potencia_kwp ?? 0),
        modulos: Number(contrato.modulos_qtde ?? 0),
        inversor: (contrato as unknown as { inversor?: string }).inversor ?? "",
      };

  const parse = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const diff = useMemo(() => {
    const v = parse(valorNovo);
    const p = parse(potenciaNova);
    const m = parse(modulosNovo);
    return {
      valor: v == null ? null : v - Number(atual.valor || 0),
      potencia: p == null ? null : p - Number(atual.potencia || 0),
      modulos: m == null ? null : Math.round(m) - Number(atual.modulos || 0),
    };
  }, [valorNovo, potenciaNova, modulosNovo, atual]);

  async function handleConfirmar() {
    if (motivo.trim().length < 5) {
      toast.error("Informe um motivo com pelo menos 5 caracteres.");
      return;
    }
    if (escopo === "PROJETO" && !projetoId) {
      toast.error("Selecione o projeto afetado.");
      return;
    }
    if (!compensatorio && escopo === "CONTRATO" && descricao.trim().length < 5) {
      toast.error("Descrição é obrigatória em aditivo geral (>=5 caracteres).");
      return;
    }
    if (compensatorio && motivoComp.trim().length < 5) {
      toast.error("Informe o motivo da compensação (>=5 caracteres).");
      return;
    }
    try {
      const id = await aplicar.mutateAsync({
        contrato_id: contrato.id,
        tipo_escopo: escopo,
        projeto_id: escopo === "PROJETO" ? projetoId : null,
        motivo: motivo.trim(),
        descricao: descricao.trim() || null,
        valor_novo: parse(valorNovo),
        potencia_nova: parse(potenciaNova),
        modulos_novo: parse(modulosNovo) == null ? null : Math.round(parse(modulosNovo)!),
        inversor_novo: inversorNovo.trim() || null,
        observacoes: observacoes.trim() || null,
        tipo_aditivo: compensatorio ? "COMPENSATORIO" : "NORMAL",
        aditivo_origem_id: compensatorio ? aditivoOrigem!.id : null,
        motivo_compensacao: compensatorio ? motivoComp.trim() : null,
        observacao_compensacao: compensatorio ? observacoes.trim() || null : null,
      });
      toast.success(
        compensatorio
          ? `Aditivo compensatório aplicado (${id.slice(0, 8)}).`
          : `Aditivo aplicado (${id.slice(0, 8)}).`,
      );
      onOpenChange(false);
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "Falha ao aplicar aditivo";
      toast.error(msg);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {compensatorio ? <RotateCcw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {compensatorio ? "Aditivo Compensatório" : "Novo Aditivo"}
            {compensatorio && <Badge variant="outline" className="border-amber-500 text-amber-700">COMPENSATÓRIO</Badge>}
          </DialogTitle>
          <DialogDescription>
            {compensatorio ? (
              <>
                Compensa o aditivo <strong className="font-mono">{aditivoOrigem?.codigo}</strong>.
                Este novo aditivo <strong>não altera</strong> o histórico do aditivo original — ele cria
                uma nova alteração compensatória sobre os valores vigentes.
              </>
            ) : (
              <>
                Aplicado imediatamente ao contrato. Os valores anteriores ficam gravados no aditivo
                para auditoria; não há reversão automática — para corrigir, gere um aditivo compensatório.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {compensatorio && (
            <Card className="p-2 text-xs bg-amber-50 border-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-amber-800">
                  Aditivo original: {aditivoOrigem?.codigo} ({aditivoOrigem?.tipo_escopo})
                </div>
                <div className="text-amber-700">
                  Δ valor anterior: {fmtBRL(aditivoOrigem?.diferenca_valor)} ·
                  Δ potência: {Number(aditivoOrigem?.diferenca_potencia ?? 0).toFixed(2)} kWp ·
                  Δ módulos: {aditivoOrigem?.diferenca_modulos ?? 0}
                </div>
              </div>
            </Card>
          )}

          {!compensatorio && (
            <div>
              <Label className="mb-1 block">O aditivo será sobre:</Label>
              <RadioGroup value={escopo} onValueChange={(v) => setEscopo(v as "PROJETO" | "CONTRATO")} className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="PROJETO" /> Projeto específico
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="CONTRATO" /> Contrato inteiro
                </label>
              </RadioGroup>
            </div>
          )}

          {escopo === "PROJETO" && (
            <div>
              <Label className="mb-1 block">Projeto</Label>
              <Select value={projetoId} onValueChange={setProjetoId} disabled={compensatorio}>
                <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                <SelectContent>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {(p.codigo ?? p.id.slice(0, 8))} · {p.tipo} · {fmtBRL(p.valor_estimado)} · {Number(p.potencia_kwp ?? 0).toFixed(2)} kWp
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {compensatorio && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Compensatório de projeto fica travado no projeto do aditivo original.
                </p>
              )}
            </div>
          )}

          <Card className="p-3 bg-muted/30">
            <h4 className="font-medium text-xs uppercase mb-2 text-muted-foreground">Valores vigentes atuais</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><div className="text-muted-foreground">Valor</div><div className="font-mono">{fmtBRL(atual.valor)}</div></div>
              <div><div className="text-muted-foreground">Potência</div><div className="font-mono">{Number(atual.potencia).toFixed(2)} kWp</div></div>
              <div><div className="text-muted-foreground">Módulos</div><div className="font-mono">{atual.modulos}</div></div>
              <div><div className="text-muted-foreground">Inversor</div><div className="font-mono">{atual.inversor || "—"}</div></div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label>Motivo *</Label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: cliente solicitou ajuste" />
            </div>
            <div>
              <Label>Descrição{!compensatorio && escopo === "CONTRATO" ? " *" : ""}</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhe da alteração" />
            </div>
          </div>

          {compensatorio && (
            <div>
              <Label>Motivo da compensação *</Label>
              <Textarea
                rows={2}
                value={motivoComp}
                onChange={(e) => setMotivoComp(e.target.value)}
                placeholder="Por que o aditivo original precisa ser compensado?"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <Label>Novo valor</Label>
              <Input inputMode="decimal" value={valorNovo} onChange={(e) => setValorNovo(e.target.value)} placeholder="—" />
              {diff.valor != null && (
                <p className={`text-xs mt-0.5 ${diff.valor >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  Δ {fmtBRL(diff.valor)}
                </p>
              )}
            </div>
            <div>
              <Label>Nova potência (kWp)</Label>
              <Input inputMode="decimal" value={potenciaNova} onChange={(e) => setPotenciaNova(e.target.value)} placeholder="—" />
              {diff.potencia != null && (
                <p className={`text-xs mt-0.5 ${diff.potencia >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  Δ {diff.potencia.toFixed(2)}
                </p>
              )}
            </div>
            <div>
              <Label>Novos módulos</Label>
              <Input inputMode="numeric" value={modulosNovo} onChange={(e) => setModulosNovo(e.target.value)} placeholder="—" />
              {diff.modulos != null && (
                <p className={`text-xs mt-0.5 ${diff.modulos >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  Δ {diff.modulos}
                </p>
              )}
            </div>
            <div>
              <Label>Novo inversor</Label>
              <Input value={inversorNovo} onChange={(e) => setInversorNovo(e.target.value)} placeholder="—" />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={aplicar.isPending}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={aplicar.isPending}>
            {aplicar.isPending
              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              : compensatorio ? <RotateCcw className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {compensatorio ? "Aplicar compensatório" : "Aplicar aditivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
