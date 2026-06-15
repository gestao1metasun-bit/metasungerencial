/**
 * C-ENT.1.e — Dialog reutilizável para cadastro de cliente (fonte: Supabase).
 *
 * Substitui o antigo NovoClienteDialog (que gravava em LS). Integra:
 *  - Debounce 400ms + busca de similares (rpc_cliente_buscar_similar)
 *  - ClienteDuplicidadeAlert (3 ações: abrir 360º, continuar, cancelar)
 *  - Criação oficial via useCriarClienteSupabase (RLS aplicada)
 *  - Espelho LS para compat com seletores legados (feito no repo)
 *
 * Após salvar, o callback onCreated recebe o cliente em formato ClienteRecord
 * (compat com fluxos antigos). O componente também oferece, opcionalmente,
 * o botão "Salvar e abrir 360º" via prop `showOpen360Action`.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Plus, Users, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClientesSimilares } from "@/lib/repositories/oportunidades-repo";
import { useCriarClienteSupabase } from "@/lib/repositories/clientes-supabase-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import { ClienteDuplicidadeAlert } from "./ClienteDuplicidadeAlert";
import type { ClienteRecord } from "@/lib/clientes-store";
import { buscarCEP } from "@/lib/contratos-store";

const onlyDigits = (v: string) => v.replace(/\D/g, "");
function maskDoc(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}
function maskTel(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^\((\d{2})\) (\d{4})(\d)/, "($1) $2-$3");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^\((\d{2})\) (\d{5})(\d)/, "($1) $2-$3");
}
const isDocValid = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 11 || d.length === 14;
};
const isTelValid = (v: string) => onlyDigits(v).length === 11;

const EMPTY = {
  nome: "", doc: "", telefone: "", telefone2: "", email: "",
  cep: "", rua: "", numero: "", bairro: "", complemento: "",
  cidade: "", uf: "", observacao: "",
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Disparado após cadastro com sucesso (já gravado no Supabase). */
  onCreated?: (c: ClienteRecord) => void;
  /** Mostra o botão "Salvar e abrir 360º" e navega após salvar. */
  showOpen360Action?: boolean;
  /** Sucesso silencioso (sem toast) — quando o pai já mostra um pós-modal. */
  silenceSuccessToast?: boolean;
};

export function ClienteCadastroSupabaseDialog({
  open, onClose, onCreated, showOpen360Action = false, silenceSuccessToast = false,
}: Props) {
  const navigate = useNavigate();
  const podeCriar = useHasPermission("comercial.cliente.criar");
  const criar = useCriarClienteSupabase();

  const [f, setF] = useState({ ...EMPTY });
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [dupAlertOpen, setDupAlertOpen] = useState(false);
  const [openAfterSave, setOpenAfterSave] = useState(false);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setF({ ...EMPTY });
      setDupAlertOpen(false);
      setOpenAfterSave(false);
    }
  }, [open]);

  // C-ENT.1.c — debounce 400ms para consulta de similares
  const [debounced, setDebounced] = useState({ nome: "", doc: "", telefone: "", email: "" });
  useEffect(() => {
    const t = setTimeout(() => setDebounced({
      nome: f.nome.trim(), doc: f.doc.trim(),
      telefone: f.telefone.trim(), email: f.email.trim(),
    }), 400);
    return () => clearTimeout(t);
  }, [f.nome, f.doc, f.telefone, f.email]);
  const similares = useClientesSimilares(debounced, open);

  const lookupCEP = async (cep: string) => {
    set("cep", cep);
    if (onlyDigits(cep).length !== 8) return;
    const r = await buscarCEP(cep);
    if (r) setF((p) => ({
      ...p,
      rua: r.rua ?? p.rua, bairro: r.bairro ?? p.bairro,
      cidade: r.cidade ?? p.cidade, uf: r.uf ?? p.uf,
    }));
  };

  const podeSalvar = useMemo(() => {
    if (!f.nome.trim()) return false;
    if (f.doc && !isDocValid(f.doc)) return false;
    if (f.telefone && !isTelValid(f.telefone)) return false;
    return true;
  }, [f.nome, f.doc, f.telefone]);

  const persistir = async (alsoOpen360: boolean) => {
    try {
      const c = await criar.mutateAsync({
        nome: f.nome.trim(),
        doc: f.doc || undefined,
        telefone: f.telefone || undefined,
        telefone2: f.telefone2 || undefined,
        email: f.email || undefined,
        cep: f.cep || undefined,
        rua: f.rua || undefined,
        numero: f.numero || undefined,
        bairro: f.bairro || undefined,
        complemento: f.complemento || undefined,
        cidade: f.cidade || undefined,
        uf: f.uf || undefined,
      });
      if (!silenceSuccessToast) toast.success(`Cliente cadastrado: ${c.nome}`);
      onCreated?.(c);
      onClose();
      if (alsoOpen360) {
        navigate({ to: "/comercial/clientes/$clienteId", params: { clienteId: c.id } });
      }
    } catch (e) {
      const msg = (e as Error)?.message ?? "Erro desconhecido";
      // 23505 = duplicidade (unique no doc)
      if (msg.includes("duplicate") || msg.includes("uq_clientes_doc_norm") || msg.includes("clientes_doc_unique")) {
        toast.error("CPF/CNPJ já cadastrado no banco oficial.");
      } else {
        toast.error(`Falha ao cadastrar cliente: ${msg}`);
      }
    }
  };

  const salvar = (alsoOpen360: boolean) => {
    if (!f.nome.trim()) { toast.error("Informe o nome"); return; }
    if (f.doc && !isDocValid(f.doc)) { toast.error("CPF/CNPJ inválido"); return; }
    if (f.telefone && !isTelValid(f.telefone)) { toast.error("Telefone inválido"); return; }
    if (!f.telefone && !f.email) {
      toast.warning("Recomendado informar telefone ou e-mail");
    }
    setOpenAfterSave(alsoOpen360);
    if ((similares.data ?? []).length > 0) {
      setDupAlertOpen(true);
      return;
    }
    void persistir(alsoOpen360);
  };

  const bloqueado = podeCriar.data === false;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-0 gap-0">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">Novo cliente</DialogTitle>
                <DialogDescription className="text-xs">
                  Cadastro oficial em Supabase. Duplicidades são verificadas automaticamente.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4" style={{ maxHeight: "calc(92vh - 160px)" }}>
          {bloqueado && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Você não possui a permissão <code>comercial.cliente.criar</code>. Solicite ao administrador.
            </div>
          )}

          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Identificação</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Nome / Razão social *</Label>
                <Input value={f.nome} onChange={(e) => set("nome", e.target.value)} disabled={bloqueado} />
              </div>
              <div className="space-y-1.5">
                <Label>CPF / CNPJ</Label>
                <Input value={f.doc} onChange={(e) => set("doc", maskDoc(e.target.value))} maxLength={18} placeholder="000.000.000-00" disabled={bloqueado} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={f.telefone} onChange={(e) => set("telefone", maskTel(e.target.value))} maxLength={15} placeholder="(00) 00000-0000" disabled={bloqueado} />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input value={f.telefone2} onChange={(e) => set("telefone2", maskTel(e.target.value))} maxLength={15} disabled={bloqueado} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} disabled={bloqueado} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Endereço</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input value={f.cep} onChange={(e) => lookupCEP(e.target.value)} maxLength={10} placeholder="69000-000" disabled={bloqueado} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Rua</Label>
                <Input value={f.rua} onChange={(e) => set("rua", e.target.value)} disabled={bloqueado} />
              </div>
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input value={f.numero} onChange={(e) => set("numero", e.target.value)} maxLength={10} disabled={bloqueado} />
              </div>
              <div className="space-y-1.5">
                <Label>Bairro</Label>
                <Input value={f.bairro} onChange={(e) => set("bairro", e.target.value)} disabled={bloqueado} />
              </div>
              <div className="space-y-1.5">
                <Label>Complemento</Label>
                <Input value={f.complemento} onChange={(e) => set("complemento", e.target.value)} disabled={bloqueado} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Cidade</Label>
                <Input value={f.cidade} onChange={(e) => set("cidade", e.target.value)} disabled={bloqueado} />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Input value={f.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} maxLength={2} disabled={bloqueado} />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Observações</Label>
                <Textarea value={f.observacao} onChange={(e) => set("observacao", e.target.value)} rows={2} disabled={bloqueado} />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t bg-muted/30 px-6 py-3">
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={onClose} disabled={criar.isPending}>Cancelar</Button>
            <div className="flex flex-wrap gap-2">
              {showOpen360Action && (
                <Button
                  variant="outline"
                  onClick={() => salvar(true)}
                  disabled={!podeSalvar || criar.isPending || bloqueado}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Salvar e abrir 360º
                </Button>
              )}
              <Button
                onClick={() => salvar(false)}
                disabled={!podeSalvar || criar.isPending || bloqueado}
                className="bg-primary text-primary-foreground"
              >
                {criar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Cadastrar cliente
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>

      <ClienteDuplicidadeAlert
        open={dupAlertOpen}
        onOpenChange={setDupAlertOpen}
        similares={similares.data ?? []}
        novoCliente={{ nome: f.nome, doc: f.doc, telefone: f.telefone, email: f.email }}
        onContinuar={() => { setDupAlertOpen(false); void persistir(openAfterSave); }}
        onCancelar={() => setDupAlertOpen(false)}
      />
    </Dialog>
  );
}
