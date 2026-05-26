// ============================================================================
// Modal de Pedido de Venda — tabs: Resumo / Pagamento / Engenharia / Histórico.
// Sem mock. Tudo via Supabase + RPCs.
// ============================================================================
import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, CheckCircle2, HardHat, Ban, Save } from "lucide-react";
import {
  usePedidoVenda, useHistoricoPV, useUpdatePV,
  useEnviarPVParaAnalise, useAprovarPV, useCancelarPV, useEnviarPVParaEngenharia,
  PV_STATUS_LABEL, PV_STATUS_TONE, type PVStatus,
} from "@/hooks/usePedidosVenda";
import { useIsAdmin } from "@/lib/auth-store";

interface Props {
  pvId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("pt-BR") : "—";

export function PedidoVendaModal({ pvId, open, onOpenChange }: Props) {
  const isAdmin = useIsAdmin();
  const { data: pv, isLoading } = usePedidoVenda(pvId ?? undefined);
  const { data: historico = [] } = useHistoricoPV(pvId ?? undefined);

  const upd = useUpdatePV();
  const enviar = useEnviarPVParaAnalise();
  const aprovar = useAprovarPV();
  const cancelar = useCancelarPV();
  const enviarEng = useEnviarPVParaEngenharia();

  const [form, setForm] = useState({
    forma_pagamento: "",
    possui_financiamento: false,
    financiamento_banco: "",
    financiamento_valor: "",
    observacoes: "",
    valor_total: "",
  });
  const [motivoCancel, setMotivoCancel] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (pv) {
      setForm({
        forma_pagamento: pv.forma_pagamento ?? "",
        possui_financiamento: !!pv.possui_financiamento,
        financiamento_banco: pv.financiamento_banco ?? "",
        financiamento_valor: pv.financiamento_valor != null ? String(pv.financiamento_valor) : "",
        observacoes: pv.observacoes ?? "",
        valor_total: pv.valor_total != null ? String(pv.valor_total) : "",
      });
    }
  }, [pv?.id]);

  const status = (pv?.status ?? "RASCUNHO") as PVStatus;
  const podeEditar = useMemo(
    () => isAdmin || ["RASCUNHO", "EM_ANALISE"].includes(status),
    [isAdmin, status],
  );

  const onSalvar = () => {
    if (!pvId) return;
    upd.mutate({
      pvId,
      patch: {
        forma_pagamento: form.forma_pagamento || null,
        possui_financiamento: form.possui_financiamento,
        financiamento_banco: form.financiamento_banco || null,
        financiamento_valor: form.financiamento_valor ? Number(form.financiamento_valor) : null,
        observacoes: form.observacoes || null,
        valor_total: form.valor_total ? Number(form.valor_total) : 0,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Pedido de Venda</span>
            {pv?.codigo && (
              <span className="text-sm font-mono text-muted-foreground">{pv.codigo}</span>
            )}
            {pv && (
              <Badge className={PV_STATUS_TONE[status]}>
                {PV_STATUS_LABEL[status]}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Fluxo: Rascunho → Em análise → Aprovado → Em execução → Faturado → Finalizado.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !pv ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
              <TabsTrigger value="engenharia">Engenharia</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* RESUMO */}
            <TabsContent value="resumo" className="space-y-3 pt-4">
              <Linha k="Contrato" v={pv.contrato_id} />
              <Linha k="Projeto" v={pv.projeto_contrato_id ?? "—"} />
              <Linha k="Cliente" v={pv.cliente_id} />
              <Linha k="Consultor" v={pv.consultor_id} />
              <Linha k="Criado em" v={fmtDateTime(pv.created_at)} />
              <Linha k="Aprovado em" v={fmtDateTime(pv.aprovado_em)} />
              <Linha k="Valor total" v={fmtBRL(pv.valor_total)} />
              {pv.motivo_cancelamento && (
                <Linha k="Motivo do cancelamento" v={pv.motivo_cancelamento} />
              )}
            </TabsContent>

            {/* PAGAMENTO */}
            <TabsContent value="pagamento" className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor total (R$)">
                  <Input
                    type="number" step="0.01" disabled={!podeEditar}
                    value={form.valor_total}
                    onChange={(e) => setForm((f) => ({ ...f, valor_total: e.target.value }))}
                  />
                </Field>
                <Field label="Forma de pagamento">
                  <Select
                    value={form.forma_pagamento || "_none_"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, forma_pagamento: v === "_none_" ? "" : v }))
                    }
                    disabled={!podeEditar}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">—</SelectItem>
                      <SelectItem value="vista">À vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                      <SelectItem value="financiamento">Financiamento</SelectItem>
                      <SelectItem value="permuta">Permuta</SelectItem>
                      <SelectItem value="misto">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Possui financiamento?">
                  <Select
                    value={form.possui_financiamento ? "1" : "0"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, possui_financiamento: v === "1" }))
                    }
                    disabled={!podeEditar}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Não</SelectItem>
                      <SelectItem value="1">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Banco">
                  <Input
                    disabled={!podeEditar || !form.possui_financiamento}
                    value={form.financiamento_banco}
                    onChange={(e) => setForm((f) => ({ ...f, financiamento_banco: e.target.value }))}
                  />
                </Field>
                <Field label="Valor financiado (R$)">
                  <Input
                    type="number" step="0.01"
                    disabled={!podeEditar || !form.possui_financiamento}
                    value={form.financiamento_valor}
                    onChange={(e) => setForm((f) => ({ ...f, financiamento_valor: e.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Observações">
                <Textarea
                  rows={3} disabled={!podeEditar}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                />
              </Field>

              {podeEditar && (
                <Button onClick={onSalvar} disabled={upd.isPending} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar alterações
                </Button>
              )}
            </TabsContent>

            {/* ENGENHARIA */}
            <TabsContent value="engenharia" className="space-y-3 pt-4">
              {pv.obra_id ? (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  Obra vinculada: <span className="font-mono">{pv.obra_id}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma obra gerada ainda. Aprovar o PV e enviar para engenharia gera a obra.
                </p>
              )}
              {status === "APROVADO" && !pv.obra_id && (
                <Button
                  onClick={() => enviarEng.mutate(pv.id)}
                  disabled={enviarEng.isPending}
                >
                  <HardHat className="h-4 w-4 mr-2" />
                  Enviar para engenharia
                </Button>
              )}
            </TabsContent>

            {/* HISTÓRICO */}
            <TabsContent value="historico" className="space-y-2 pt-4">
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem mudanças de status ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {historico.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between rounded border bg-card px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {h.status_anterior ?? "—"} → {h.status_novo}
                        </Badge>
                        {h.motivo && <span className="text-muted-foreground">— {h.motivo}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {h.user_email ?? h.user_id ?? "sistema"} · {fmtDateTime(h.created_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="flex flex-wrap justify-between gap-2 border-t pt-3">
          <div className="flex flex-wrap gap-2">
            {status === "RASCUNHO" && (
              <Button
                size="sm" variant="default"
                onClick={() => pv && enviar.mutate(pv.id)}
                disabled={enviar.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar para análise
              </Button>
            )}
            {status === "EM_ANALISE" && (
              <Button
                size="sm"
                onClick={() => pv && aprovar.mutate({ pvId: pv.id })}
                disabled={aprovar.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            )}
            {pv && !["FINALIZADO", "CANCELADO"].includes(status) && (
              <Button
                size="sm" variant="destructive"
                onClick={() => setConfirmCancel(true)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Cancelar PV
              </Button>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>

        {/* Modal interno de motivo do cancelamento */}
        <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Motivo do cancelamento</DialogTitle>
              <DialogDescription>Mínimo 3 caracteres. Auditado.</DialogDescription>
            </DialogHeader>
            <Textarea
              rows={3} value={motivoCancel}
              onChange={(e) => setMotivoCancel(e.target.value)}
              placeholder="Ex: cliente desistiu, projeto reformulado..."
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmCancel(false)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                disabled={motivoCancel.trim().length < 3 || cancelar.isPending}
                onClick={() => {
                  if (!pv) return;
                  cancelar.mutate(
                    { pvId: pv.id, motivo: motivoCancel.trim() },
                    {
                      onSuccess: () => {
                        setConfirmCancel(false);
                        setMotivoCancel("");
                      },
                    },
                  );
                }}
              >
                Confirmar cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Linha({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium font-mono">{v}</span>
    </div>
  );
}
