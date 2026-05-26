// ============================================================================
// Modal "Receber Parcela" — registra recebimento real via RPC.
// Estrutura ERP padronizada em abas (Identificação / Financeiro / Auditoria).
// ============================================================================
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useReceberParcela,
  useContasFinanceiras,
  type ParcelaFinanceira,
} from "@/hooks/useTitulosFinanceiros";

interface Props {
  parcela: ParcelaFinanceira | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(n ?? 0));

export function ReceberParcelaModal({ parcela, open, onOpenChange }: Props) {
  const [valor, setValor] = useState("");
  const [contaId, setContaId] = useState<string>("");
  const [forma, setForma] = useState("");
  const [obs, setObs] = useState("");
  const receber = useReceberParcela();
  const { data: contas = [] } = useContasFinanceiras();

  useEffect(() => {
    if (parcela) {
      setValor(String(parcela.saldo ?? 0));
      setForma("");
      setObs("");
      setContaId("");
    }
  }, [parcela]);

  if (!parcela) return null;

  const valorNum = Number(valor.replace(",", "."));
  const invalido =
    !Number.isFinite(valorNum) ||
    valorNum <= 0 ||
    valorNum > Number(parcela.saldo) + 0.001;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receber parcela #{parcela.numero}</DialogTitle>
          <DialogDescription>
            Vencimento {new Date(parcela.vencimento).toLocaleDateString("pt-BR")}
            {" · "}Saldo {fmtBRL(parcela.saldo)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Valor recebido</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            {invalido && valor !== "" && (
              <p className="text-xs text-destructive">
                Valor deve ser positivo e ≤ saldo da parcela.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Conta de destino</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar conta (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} ({c.tipo})
                  </SelectItem>
                ))}
                {contas.length === 0 && (
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    Nenhuma conta cadastrada.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Forma de pagamento</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {["pix", "boleto", "ted", "dinheiro", "cartao", "permuta"].map(
                  (f) => (
                    <SelectItem key={f} value={f}>
                      {f.toUpperCase()}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Observação</Label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={invalido || receber.isPending}
            onClick={() =>
              receber.mutate(
                {
                  parcelaId: parcela.id,
                  tituloId: parcela.titulo_id,
                  valor: valorNum,
                  contaId: contaId || undefined,
                  formaPagamento: forma || undefined,
                  observacao: obs || undefined,
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            Registrar recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
