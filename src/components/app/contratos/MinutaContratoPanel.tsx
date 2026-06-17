/**
 * D18.8 — Painel de edição da Minuta do contrato (Supabase).
 *
 * Visível somente quando `etapa === "minuta"`. Permite ao usuário com
 * permissão `comercial.contrato.editar_minuta` revisar os campos contratuais
 * editáveis (forma de pagamento, valor de entrada, datas, observações,
 * financiamento) e disparar:
 *
 *   - Aprovar contrato (rpc_contrato_aprovar_minuta)
 *   - Cancelar minuta  (rpc_contrato_cancelar_minuta)
 *
 * NÃO toca em valor_total / potencia_kwp / modulos_qtde — essas grandezas
 * vêm da proposta origem e exigem nova proposta ou aditivo para mudar.
 */
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSignature, Save, Check, Ban, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useAprovarMinutaContrato,
  useCancelarMinutaContrato,
} from "@/lib/repositories/comercial-processos-repo";
import { useQueryClient } from "@tanstack/react-query";
import { logError } from "@/lib/repositories/error-log-repo";

type FormaPagamento = "A_VISTA" | "PARCELADO" | "FINANCIAMENTO" | "MISTO" | "";

type MinutaContrato = {
  id: string;
  codigo: string | null;
  status: string;
  valor_total: number;
  valor_entrada: number | null;
  observacoes: string | null;
  data_assinatura: string | null;
  forma_pagamento: string | null;
  possui_financiamento: boolean;
  financiamento_banco: string | null;
  financiamento_valor: number | null;
  dados: Record<string, unknown> | null;
};

export function MinutaContratoPanel({ contrato }: { contrato: MinutaContrato }) {
  const qc = useQueryClient();
  const permEditar = useHasPermission("comercial.contrato.editar_minuta");
  const permAprovar = useHasPermission("comercial.contrato.aprovar_minuta");
  const permCancelar = useHasPermission("comercial.contrato.cancelar");
  const aprovar = useAprovarMinutaContrato();
  const cancelarMinuta = useCancelarMinutaContrato();

  const d = (contrato.dados ?? {}) as Record<string, unknown>;
  const valorTotal = Number(contrato.valor_total) || 0;

  const [forma, setForma] = useState<FormaPagamento>(
    (contrato.forma_pagamento as FormaPagamento) ??
      ((d["forma_pagamento"] as string) as FormaPagamento) ??
      "",
  );
  const [valorEntrada, setValorEntrada] = useState<string>(
    String(contrato.valor_entrada ?? d["valor_entrada"] ?? ""),
  );
  const [qtdeParcelas, setQtdeParcelas] = useState<string>(
    String(d["qtde_parcelas"] ?? "1"),
  );
  const [primeiroVenc, setPrimeiroVenc] = useState<string>(
    String(d["primeiro_vencimento"] ?? ""),
  );
  const [dataAssinatura, setDataAssinatura] = useState<string>(
    contrato.data_assinatura ?? "",
  );
  const [possuiFin, setPossuiFin] = useState<boolean>(!!contrato.possui_financiamento);
  const [banco, setBanco] = useState<string>(contrato.financiamento_banco ?? "");
  const [valorFin, setValorFin] = useState<string>(
    String(contrato.financiamento_valor ?? ""),
  );
  const [obs, setObs] = useState<string>(contrato.observacoes ?? "");
  const [endereco, setEndereco] = useState<string>(String(d["endereco_instalacao"] ?? d["endereco"] ?? ""));
  const [prazoExec, setPrazoExec] = useState<string>(String(d["prazo_execucao_dias"] ?? ""));
  const [salvando, setSalvando] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [aprovarObs, setAprovarObs] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivoCancelar, setMotivoCancelar] = useState("");

  useEffect(() => {
    // Reseta dirty quando contrato muda
    setDirty(false);
  }, [contrato.id]);

  const marcaDirty = () => setDirty(true);

  function n(v: string): number {
    const x = Number((v || "").toString().replace(",", "."));
    return Number.isFinite(x) ? x : 0;
  }

  const erros = useMemo(() => {
    const arr: string[] = [];
    if (!forma) arr.push("forma de pagamento");
    if (forma !== "A_VISTA" && !primeiroVenc) arr.push("1º vencimento");
    if (possuiFin && (!banco.trim() || n(valorFin) <= 0)) arr.push("dados do financiamento");
    return arr;
  }, [forma, primeiroVenc, possuiFin, banco, valorFin]);

  async function salvar(): Promise<boolean> {
    if (!permEditar.data) {
      toast.error("Sem permissão para editar minuta.");
      return false;
    }
    setSalvando(true);
    try {
      const entrada = n(valorEntrada);
      const parcelas = Math.max(1, Math.floor(n(qtdeParcelas) || 1));
      const vFin = n(valorFin);
      const novoDados = {
        ...(contrato.dados ?? {}),
        forma_pagamento: forma || null,
        valor_entrada: entrada,
        qtde_parcelas: parcelas,
        primeiro_vencimento: primeiroVenc || null,
        endereco_instalacao: endereco || null,
        prazo_execucao_dias: prazoExec ? Number(prazoExec) : null,
        editado_em: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("contratos")
        .update({
          forma_pagamento: forma || null,
          valor_entrada: entrada,
          data_assinatura: dataAssinatura || null,
          possui_financiamento: possuiFin,
          financiamento_banco: possuiFin ? banco.trim() || null : null,
          financiamento_valor: possuiFin ? vFin : null,
          observacoes: obs.trim() || null,
          dados: novoDados as never,
        } as never)
        .eq("id", contrato.id);
      if (error) throw error;
      toast.success("Minuta salva.");
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["contratos-supabase"] });
      void qc.invalidateQueries({ queryKey: ["contratos-supabase", "id", contrato.id] });
      return true;
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      toast.error(`Erro ao salvar minuta: ${msg}`);
      logError({ modulo: "comercial", tela: "MinutaContratoPanel", acao: "salvar", mensagem: msg, payload: { contratoId: contrato.id } });
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function aprovar_() {
    if (erros.length) {
      toast.error("Preencha: " + erros.join(", "));
      return;
    }
    // Salva antes de aprovar se houver alterações
    if (dirty) {
      const ok = await salvar();
      if (!ok) return;
    }
    try {
      await aprovar.mutateAsync({ contratoId: contrato.id, observacao: aprovarObs.trim() || undefined });
      setAprovarOpen(false);
      setAprovarObs("");
    } catch {
      // toast já tratado no hook
    }
  }

  async function cancelar_() {
    if (motivoCancelar.trim().length < 5) {
      toast.error("Motivo precisa ter pelo menos 5 caracteres.");
      return;
    }
    try {
      await cancelarMinuta.mutateAsync({ contratoId: contrato.id, motivo: motivoCancelar.trim() });
      setCancelOpen(false);
      setMotivoCancelar("");
    } catch {
      // toast já tratado no hook
    }
  }

  const podeEditar = permEditar.data === true;
  const podeAprovar = permAprovar.data === true;
  const podeCancelar = permCancelar.data === true;

  return (
    <Card className="p-3 space-y-3 border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-amber-600" />
          <h3 className="font-semibold text-sm">Contrato Pendente — Minuta</h3>
          <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
            Editável
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={!podeEditar || salvando || !dirty} onClick={() => void salvar()}>
            {salvando ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Salvar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!podeCancelar}
            onClick={() => setCancelOpen(true)}
          >
            <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar minuta
          </Button>
          <Button
            size="sm"
            disabled={!podeAprovar || erros.length > 0}
            onClick={() => setAprovarOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Aprovar contrato
          </Button>
        </div>
      </div>

      {erros.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5" />
          <div>Para aprovar a minuta, preencha: <strong>{erros.join(", ")}</strong>.</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div>
          <Label className="text-xs">Forma de pagamento *</Label>
          <Select value={forma} onValueChange={(v) => { setForma(v as FormaPagamento); marcaDirty(); }} disabled={!podeEditar}>
            <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A_VISTA">À vista</SelectItem>
              <SelectItem value="PARCELADO">Parcelado</SelectItem>
              <SelectItem value="FINANCIAMENTO">Financiamento bancário</SelectItem>
              <SelectItem value="MISTO">Misto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Valor de entrada (R$)</Label>
          <Input className="mt-1 h-8" inputMode="decimal" value={valorEntrada}
            onChange={(e) => { setValorEntrada(e.target.value); marcaDirty(); }}
            placeholder="0,00" disabled={!podeEditar} />
        </div>
        <div>
          <Label className="text-xs">Qtde parcelas</Label>
          <Input className="mt-1 h-8" type="number" min={1} max={120} value={qtdeParcelas}
            onChange={(e) => { setQtdeParcelas(e.target.value); marcaDirty(); }}
            disabled={!podeEditar || forma === "A_VISTA"} />
        </div>
        <div>
          <Label className="text-xs">1º vencimento</Label>
          <Input className="mt-1 h-8" type="date" value={primeiroVenc}
            onChange={(e) => { setPrimeiroVenc(e.target.value); marcaDirty(); }}
            disabled={!podeEditar || forma === "A_VISTA"} />
        </div>
        <div>
          <Label className="text-xs">Data prevista de assinatura</Label>
          <Input className="mt-1 h-8" type="date" value={dataAssinatura}
            onChange={(e) => { setDataAssinatura(e.target.value); marcaDirty(); }}
            disabled={!podeEditar} />
        </div>
        <div>
          <Label className="text-xs">Prazo execução (dias)</Label>
          <Input className="mt-1 h-8" type="number" min={0} value={prazoExec}
            onChange={(e) => { setPrazoExec(e.target.value); marcaDirty(); }}
            disabled={!podeEditar} />
        </div>
      </div>

      <div className="rounded-md border bg-background/60 px-3 py-2 flex items-center justify-between gap-3">
        <div className="text-xs">
          <div className="font-semibold">Financiamento bancário</div>
          <div className="text-muted-foreground">Marque se parte do valor entra via banco.</div>
        </div>
        <Switch checked={possuiFin} disabled={!podeEditar} onCheckedChange={(v) => { setPossuiFin(v); marcaDirty(); }} />
      </div>

      {possuiFin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-xs">Banco *</Label>
            <Input className="mt-1 h-8" value={banco}
              onChange={(e) => { setBanco(e.target.value.toUpperCase()); marcaDirty(); }}
              disabled={!podeEditar} placeholder="SANTANDER, BV, BRADESCO..." />
          </div>
          <div>
            <Label className="text-xs">Valor financiado (R$) *</Label>
            <Input className="mt-1 h-8" inputMode="decimal" value={valorFin}
              onChange={(e) => { setValorFin(e.target.value); marcaDirty(); }}
              disabled={!podeEditar} placeholder="0,00" />
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs">Endereço contratual de instalação</Label>
        <Input className="mt-1 h-8" value={endereco}
          onChange={(e) => { setEndereco(e.target.value); marcaDirty(); }}
          disabled={!podeEditar} placeholder="Rua, número, bairro, cidade/UF" />
      </div>

      <div>
        <Label className="text-xs">Observações / cláusulas específicas</Label>
        <Textarea className="mt-1" rows={3} value={obs}
          onChange={(e) => { setObs(e.target.value); marcaDirty(); }}
          disabled={!podeEditar}
          placeholder="Cláusulas adicionais, condições comerciais, prazos especiais..." />
      </div>

      <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <strong>Travado:</strong> valor total ({valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}),
        potência, módulos e inversor vêm da proposta origem. Para alterar, gere uma nova proposta ou um aditivo após aprovar.
      </div>

      {/* Diálogo de aprovação */}
      <Dialog open={aprovarOpen} onOpenChange={setAprovarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar contrato {contrato.codigo ?? contrato.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação transforma a minuta em contrato <strong>ATIVO</strong> e marca a proposta de origem como
            <strong> CONTRATADA</strong>. Confirme apenas após revisar cláusulas, valores e dados cadastrais.
          </p>
          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea className="mt-1" rows={2} value={aprovarObs} onChange={(e) => setAprovarObs(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprovarOpen(false)} disabled={aprovar.isPending}>Cancelar</Button>
            <Button onClick={() => void aprovar_()} disabled={aprovar.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {aprovar.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Aprovar contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de cancelamento da minuta */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar minuta {contrato.codigo ?? contrato.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A minuta será marcada como <strong>CANCELADO</strong> e a proposta de origem voltará para o
            status <strong>APROVADA</strong>, permitindo nova geração de contrato.
          </p>
          <div>
            <Label className="text-xs">Motivo (mín. 5 caracteres) *</Label>
            <Textarea className="mt-1" rows={2} value={motivoCancelar} onChange={(e) => setMotivoCancelar(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelarMinuta.isPending}>Voltar</Button>
            <Button variant="destructive" onClick={() => void cancelar_()} disabled={cancelarMinuta.isPending}>
              {cancelarMinuta.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Ban className="h-3.5 w-3.5 mr-1" />}
              Cancelar minuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
