/**
 * D27.COM.3.c — GerarContratoDialog
 *
 * Abre antes de chamar rpc_proposta_gerar_contrato para coletar os dados
 * comerciais/financeiros do contrato: forma de pagamento, entrada, parcelas,
 * financiamento (banco/valor) e observações.
 *
 * Fluxo:
 *  1. usuário preenche e confirma
 *  2. chama rpc_proposta_gerar_contrato (cria o contrato com dados básicos)
 *  3. complementa o contrato recém-criado com as escolhas comerciais
 *     (UPDATE direto em contratos: dados jsonb + colunas de financiamento)
 *
 * Não toca em status, não dispara workflow.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnviarPropostaParaContratos } from "@/lib/repositories/comercial-processos-repo";
import { fmtBRL } from "@/modules/propostas/store";

type FormaPagamento = "A_VISTA" | "PARCELADO" | "FINANCIAMENTO" | "MISTO";

export type GerarContratoDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propostaId: string;
  numeroProposta?: string;
  clienteNome?: string;
  valorTotal: number;
  onGerado?: (contratoId: string) => void;
};

export function GerarContratoDialog({
  open, onOpenChange, propostaId, numeroProposta, clienteNome, valorTotal, onGerado,
}: GerarContratoDialogProps) {
  const gerar = useGerarContratoDaProposta();
  const [forma, setForma] = useState<FormaPagamento>("A_VISTA");
  const [valorEntrada, setValorEntrada] = useState<string>("");
  const [qtdeParcelas, setQtdeParcelas] = useState<string>("1");
  const [primeiroVenc, setPrimeiroVenc] = useState<string>("");
  const [possuiFin, setPossuiFin] = useState<boolean>(false);
  const [banco, setBanco] = useState<string>("");
  const [valorFin, setValorFin] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForma("A_VISTA");
    setValorEntrada("");
    setQtdeParcelas("1");
    setPrimeiroVenc("");
    setPossuiFin(false);
    setBanco("");
    setValorFin("");
    setObs("");
  }, [open, propostaId]);

  // Auto-marca financiamento quando forma exige
  useEffect(() => {
    if (forma === "FINANCIAMENTO" || forma === "MISTO") setPossuiFin(true);
    if (forma === "A_VISTA") {
      setPossuiFin(false);
      setQtdeParcelas("1");
    }
    if (forma === "A_VISTA") setValorEntrada(String(valorTotal || ""));
  }, [forma, valorTotal]);

  function n(v: string): number {
    const x = Number((v || "").toString().replace(",", "."));
    return Number.isFinite(x) ? x : 0;
  }

  async function confirmar() {
    if (!propostaId) return;
    const entrada = n(valorEntrada);
    const parcelas = Math.max(1, Math.floor(n(qtdeParcelas) || 1));
    const vFin = n(valorFin);
    if (possuiFin && (!banco.trim() || vFin <= 0)) {
      toast.error("Informe banco e valor do financiamento.");
      return;
    }
    if (forma === "PARCELADO" && parcelas < 1) {
      toast.error("Quantidade de parcelas inválida.");
      return;
    }
    if (forma !== "A_VISTA" && !primeiroVenc) {
      toast.error("Informe a data do primeiro vencimento.");
      return;
    }

    setSalvando(true);
    try {
      const contratoId = await gerar.mutateAsync({ propostaId });
      // Complementa o contrato com os dados comerciais escolhidos
      const valorParcela = forma === "A_VISTA"
        ? 0
        : Math.max(0, (valorTotal - entrada - (possuiFin ? vFin : 0))) / parcelas;
      const { error } = await supabase
        .from("contratos")
        .update({
          possui_financiamento: possuiFin,
          financiamento_banco: possuiFin ? banco.trim() || null : null,
          financiamento_valor: possuiFin ? vFin : null,
          valor_entrada: entrada,
          observacoes: obs.trim() || null,
          dados: {
            forma_pagamento: forma,
            valor_entrada: entrada,
            qtde_parcelas: parcelas,
            valor_parcela: Number(valorParcela.toFixed(2)),
            primeiro_vencimento: primeiroVenc || null,
            possui_financiamento: possuiFin,
            financiamento_banco: possuiFin ? banco.trim() : null,
            financiamento_valor: possuiFin ? vFin : null,
            origem_dialog: "GerarContratoDialog",
          },
        } as never)
        .eq("id", contratoId);
      if (error) {
        toast.warning(`Contrato gerado, mas dados financeiros não foram salvos: ${error.message}`);
      } else {
        toast.success("Contrato gerado e dados financeiros registrados.");
      }
      onGerado?.(contratoId);
      onOpenChange(false);
    } catch (e: any) {
      // erro já tratado pelo toast do hook
    } finally {
      setSalvando(false);
    }
  }

  const totalCobertura = (() => {
    const e = n(valorEntrada);
    const f = possuiFin ? n(valorFin) : 0;
    const p = forma === "A_VISTA" ? 0 : (valorTotal - e - f);
    return { entrada: e, fin: f, parcelado: Math.max(0, p) };
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Gerar contrato {numeroProposta ? `· proposta ${numeroProposta}` : ""}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {clienteNome ? `Cliente: ${clienteNome} · ` : ""}Valor total: <strong>{fmtBRL(valorTotal)}</strong>
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div>
            <Label className="text-xs">Forma de pagamento *</Label>
            <Select value={forma} onValueChange={(v) => setForma(v as FormaPagamento)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A_VISTA">À vista</SelectItem>
                <SelectItem value="PARCELADO">Parcelado</SelectItem>
                <SelectItem value="FINANCIAMENTO">Financiamento bancário</SelectItem>
                <SelectItem value="MISTO">Misto (entrada + parcelas + financiamento)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Valor de entrada (R$)</Label>
              <Input className="mt-1.5" inputMode="decimal" value={valorEntrada}
                onChange={(e) => setValorEntrada(e.target.value)}
                placeholder="0,00" disabled={forma === "A_VISTA"} />
            </div>
            <div>
              <Label className="text-xs">Qtde parcelas</Label>
              <Input className="mt-1.5" type="number" min={1} max={120} value={qtdeParcelas}
                onChange={(e) => setQtdeParcelas(e.target.value)}
                disabled={forma === "A_VISTA"} />
            </div>
            <div>
              <Label className="text-xs">1º vencimento</Label>
              <Input className="mt-1.5" type="date" value={primeiroVenc}
                onChange={(e) => setPrimeiroVenc(e.target.value)}
                disabled={forma === "A_VISTA"} />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 flex items-center justify-between gap-3">
            <div className="text-xs">
              <div className="font-semibold">Financiamento bancário</div>
              <div className="text-muted-foreground">Marque se parte do valor entra via banco.</div>
            </div>
            <Switch checked={possuiFin} onCheckedChange={setPossuiFin}
              disabled={forma === "FINANCIAMENTO" || forma === "MISTO"} />
          </div>

          {possuiFin && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Banco *</Label>
                <Input className="mt-1.5" value={banco} onChange={(e) => setBanco(e.target.value.toUpperCase())}
                  placeholder="Ex.: SANTANDER, BV, BRADESCO" />
              </div>
              <div>
                <Label className="text-xs">Valor financiado (R$) *</Label>
                <Input className="mt-1.5" inputMode="decimal" value={valorFin}
                  onChange={(e) => setValorFin(e.target.value)} placeholder="0,00" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea className="mt-1.5" rows={3} value={obs} onChange={(e) => setObs(e.target.value)}
              placeholder="Condições comerciais específicas, prazos, etc." />
          </div>

          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-[12px] grid grid-cols-3 gap-2">
            <div><div className="text-muted-foreground">Entrada</div><div className="font-semibold">{fmtBRL(totalCobertura.entrada)}</div></div>
            <div><div className="text-muted-foreground">Financiado</div><div className="font-semibold">{fmtBRL(totalCobertura.fin)}</div></div>
            <div><div className="text-muted-foreground">Parcelado</div><div className="font-semibold">{fmtBRL(totalCobertura.parcelado)}</div></div>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando} className="gap-1">
            <FileText className="h-4 w-4" />
            {salvando ? "Gerando..." : "Gerar contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
