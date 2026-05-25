// Menu de ações de uma linha de Título financeiro.
// Replica o dropdown do sistema de referência:
// Editar / Baixar / Cadastrar cheque / Estornar / Excluir /
// Ratear / Detalhar / Imprimir modelo / Gerar cópia / Arquivos / Histórico.
import { useState } from "react";
import {
  Settings, SquarePen, CheckCircle2, Banknote, Undo2, Trash2,
  Split, Eye, Printer, Copy, Paperclip, History, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  cancelarTitulo, estornarMovimento, gerarCopiaTitulo, cadastrarCheque,
  type Titulo,
} from "@/lib/fin-titulos-store";

export type TituloRowActionsProps = {
  titulo: Titulo;
  onEditar: (t: Titulo) => void;
  onBaixar: (t: Titulo) => void;
  onRatear: (t: Titulo) => void;
  onDetalhar: (t: Titulo) => void;
  onArquivos: (t: Titulo) => void;
  onHistorico: (t: Titulo) => void;
  onRenegociar?: (t: Titulo) => void;
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TituloRowActions(p: TituloRowActionsProps) {
  const t = p.titulo;
  const bloqueado = !!t.bloqueadoFechamento;
  const quitado = t.status === "pago" || t.status === "recebido";
  const cancelado = t.status === "cancelado";

  const [excluirOpen, setExcluirOpen] = useState(false);
  const [motivoExcluir, setMotivoExcluir] = useState("");

  const [estornarOpen, setEstornarOpen] = useState(false);
  const [movSel, setMovSel] = useState<string>("");
  const [motivoEstorno, setMotivoEstorno] = useState("");

  const [chequeOpen, setChequeOpen] = useState(false);
  const [cheque, setCheque] = useState({ numero: "", banco: "", agencia: "", conta: "", bom_para: "", titular: "" });

  const [copiaOpen, setCopiaOpen] = useState(false);
  const [copia, setCopia] = useState({ vencimento: t.vencimento, valor: t.valorOriginal, descricao: `${t.descricao} (cópia)` });

  const movEstornaveis = (t.movimentos ?? []).filter((m) => !m.estornado);

  function imprimir() {
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) { toast.error("Bloqueio de pop-up impediu a impressão."); return; }
    const linhas = (t.rateios ?? []).map(
      (r) => `<tr><td>${fmtBRL(r.valor)}</td><td>${r.centroCusto ?? ""}</td><td>${r.natureza ?? ""}</td><td>${r.tipoTitulo ?? ""}</td><td>${r.ordemServico ?? ""}</td></tr>`,
    ).join("");
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Título ${t.id}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px}
        .muted{color:#666;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;margin-top:12px;font-size:13px}
      </style></head><body>
      <h1>${t.tipo === "AP" ? "Conta a pagar" : "Conta a receber"} — ${t.id}</h1>
      <div class="muted">Emitido em ${new Date().toLocaleString("pt-BR")}</div>
      <div class="grid">
        <div><b>Descrição:</b> ${t.descricao}</div>
        <div><b>${t.tipo === "AP" ? "Fornecedor" : "Cliente"}:</b> ${(t.fornecedor ?? t.cliente) || "—"}</div>
        <div><b>Vencimento:</b> ${t.vencimento}</div>
        <div><b>Valor:</b> ${fmtBRL(t.valorOriginal)}</div>
        <div><b>Pago:</b> ${fmtBRL(t.valorPago)}</div>
        <div><b>Saldo:</b> ${fmtBRL(t.saldo)}</div>
        <div><b>Centro de custo:</b> ${t.centroCusto || "—"}</div>
        <div><b>Natureza:</b> ${t.natureza || "—"}</div>
        <div><b>Status:</b> ${t.status}</div>
      </div>
      ${linhas ? `<h3 style="margin-top:18px;font-size:14px">Rateios</h3><table><thead><tr><th>Valor</th><th>Centro de custo</th><th>Natureza</th><th>Tipo</th><th>O.S</th></tr></thead><tbody>${linhas}</tbody></table>` : ""}
      ${t.observacao ? `<h3 style="margin-top:18px;font-size:14px">Observações</h3><pre style="white-space:pre-wrap;font-size:12px">${t.observacao}</pre>` : ""}
      <script>window.print()</script>
      </body></html>`);
    w.document.close();
  }

  function handleGerarCopia() {
    try {
      const nova = gerarCopiaTitulo(t.id, {
        vencimento: copia.vencimento,
        valorOriginal: Number(copia.valor),
        descricao: copia.descricao,
      });
      toast.success(`Cópia gerada: ${nova.id}`);
      setCopiaOpen(false);
    } catch (e: any) { toast.error(e?.message ?? "Falha ao gerar cópia."); }
  }

  function handleCadastrarCheque() {
    try {
      if (!cheque.numero.trim()) { toast.error("Número do cheque é obrigatório."); return; }
      cadastrarCheque(t.id, cheque);
      toast.success("Cheque cadastrado.");
      setChequeOpen(false);
      setCheque({ numero: "", banco: "", agencia: "", conta: "", bom_para: "", titular: "" });
    } catch (e: any) { toast.error(e?.message ?? "Falha ao cadastrar cheque."); }
  }

  function handleExcluir() {
    try {
      if (motivoExcluir.trim().length < 3) { toast.error("Motivo precisa ter ao menos 3 caracteres."); return; }
      cancelarTitulo(t.id, motivoExcluir);
      toast.success("Título cancelado.");
      setExcluirOpen(false);
    } catch (e: any) { toast.error(e?.message ?? "Falha ao excluir."); }
  }

  function handleEstornar() {
    try {
      if (!movSel) { toast.error("Selecione o movimento."); return; }
      if (motivoEstorno.trim().length < 3) { toast.error("Motivo precisa ter ao menos 3 caracteres."); return; }
      estornarMovimento(t.id, movSel, motivoEstorno);
      toast.success("Movimento estornado.");
      setEstornarOpen(false);
      setMovSel(""); setMotivoEstorno("");
    } catch (e: any) { toast.error(e?.message ?? "Falha ao estornar."); }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2">
            <Settings className="h-3.5 w-3.5" />
            <span className="text-xs">Opções</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs">Ações do título</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem disabled={bloqueado || quitado || cancelado} onClick={() => p.onEditar(t)}>
            <SquarePen className="mr-2 h-4 w-4" /> Editar / Painel
          </DropdownMenuItem>
          <DropdownMenuItem disabled={bloqueado || quitado || cancelado} onClick={() => p.onBaixar(t)}>
            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Baixar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={cancelado} onClick={() => setChequeOpen(true)}>
            <Banknote className="mr-2 h-4 w-4" /> Cadastrar cheque
          </DropdownMenuItem>
          <DropdownMenuItem disabled={bloqueado || movEstornaveis.length === 0} onClick={() => setEstornarOpen(true)}>
            <Undo2 className="mr-2 h-4 w-4" /> Estornar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={bloqueado || cancelado || (t.valorPago > 0)} onClick={() => setExcluirOpen(true)} className="text-rose-600 focus:text-rose-600">
            <Trash2 className="mr-2 h-4 w-4" /> Excluir título
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem disabled={bloqueado || cancelado} onClick={() => p.onRatear(t)}>
            <Split className="mr-2 h-4 w-4 text-indigo-600" /> Ratear
          </DropdownMenuItem>
          {p.onRenegociar && (
            <DropdownMenuItem disabled={bloqueado || cancelado || t.statusRenegociacao === "renegociado"} onClick={() => p.onRenegociar!(t)}>
              <Sparkles className="mr-2 h-4 w-4 text-primary" /> Renegociar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => p.onDetalhar(t)}>
            <Eye className="mr-2 h-4 w-4" /> Detalhar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={imprimir}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir modelo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCopiaOpen(true)}>
            <Copy className="mr-2 h-4 w-4" /> Gerar cópia
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => p.onArquivos(t)}>
            <Paperclip className="mr-2 h-4 w-4" /> Arquivos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => p.onHistorico(t)}>
            <History className="mr-2 h-4 w-4" /> Histórico de alterações
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Excluir */}
      <Dialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Excluir título {t.id}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">A exclusão cancela o título. Informe o motivo:</p>
            <Textarea rows={3} value={motivoExcluir} onChange={(e) => setMotivoExcluir(e.target.value)} placeholder="Motivo do cancelamento" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExcluirOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluir}>Confirmar exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estornar */}
      <Dialog open={estornarOpen} onOpenChange={setEstornarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Estornar movimento — título {t.id}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs">Movimento</Label>
              <select className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" value={movSel} onChange={(e) => setMovSel(e.target.value)}>
                <option value="">Selecione…</option>
                {movEstornaveis.map((m) => (
                  <option key={m.id} value={m.id}>{m.data} — {fmtBRL(m.valor)} {m.contaFinanceira ? `· ${m.contaFinanceira}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Motivo</Label>
              <Textarea rows={3} value={motivoEstorno} onChange={(e) => setMotivoEstorno(e.target.value)} placeholder="Motivo do estorno" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEstornarOpen(false)}>Cancelar</Button>
            <Button onClick={handleEstornar}>Estornar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cheque */}
      <Dialog open={chequeOpen} onOpenChange={setChequeOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Cadastrar cheque — título {t.id}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs">Número *</Label>
              <Input value={cheque.numero} onChange={(e) => setCheque({ ...cheque, numero: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Banco</Label>
              <Input value={cheque.banco} onChange={(e) => setCheque({ ...cheque, banco: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Agência</Label>
              <Input value={cheque.agencia} onChange={(e) => setCheque({ ...cheque, agencia: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Conta</Label>
              <Input value={cheque.conta} onChange={(e) => setCheque({ ...cheque, conta: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Bom para</Label>
              <Input type="date" value={cheque.bom_para} onChange={(e) => setCheque({ ...cheque, bom_para: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Titular</Label>
              <Input value={cheque.titular} onChange={(e) => setCheque({ ...cheque, titular: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChequeOpen(false)}>Cancelar</Button>
            <Button onClick={handleCadastrarCheque}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gerar cópia */}
      <Dialog open={copiaOpen} onOpenChange={setCopiaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Gerar cópia do título {t.id}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <Label className="text-xs">Descrição</Label>
              <Input value={copia.descricao} onChange={(e) => setCopia({ ...copia, descricao: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Novo vencimento</Label>
              <Input type="date" value={copia.vencimento} onChange={(e) => setCopia({ ...copia, vencimento: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Valor</Label>
              <Input type="number" step="0.01" value={copia.valor} onChange={(e) => setCopia({ ...copia, valor: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCopiaOpen(false)}>Cancelar</Button>
            <Button onClick={handleGerarCopia}>Gerar cópia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
