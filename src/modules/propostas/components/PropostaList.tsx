// PropostaList — tabela de propostas + KPIs + empty state.
// Extraído de PropostasPage.tsx durante reorganização modular.
import { useEffect, useMemo } from "react";
import { Plus, Pencil, Eye, Copy, Trash2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  type PropostaFV, type StatusProposta,
  upsertProposta, removeProposta, proximoNumeroProposta,
  calcDimensionamento, calcPrecificacao, calcResultado, fmtBRL, fmtNum,
} from "@/modules/propostas/store";

export function statusVariant(s: StatusProposta): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "APROVADA": return "default";
    case "ENVIADA": return "secondary";
    case "RECUSADA":
    case "VENCIDA":
    case "CANCELADA": return "destructive";
    default: return "outline";
  }
}

// helper síncrono para ler propostas fora de hook (evita warning do React)
function usePropostasSync(): PropostaFV[] {
  try { return JSON.parse(localStorage.getItem("ms.fv.propostas.v1") || "[]"); }
  catch { return []; }
}

export function duplicarProposta(p: PropostaFV) {
  const lista = usePropostasSync();
  const numero = proximoNumeroProposta(lista);
  const copia: PropostaFV = {
    ...p,
    id: `PRID-${Date.now()}`,
    numero,
    status: "RASCUNHO",
    criadoEm: new Date().toISOString().slice(0, 10),
    atualizadoEm: new Date().toISOString().slice(0, 10),
    contratoGeradoId: undefined,
  };
  upsertProposta(copia);
  toast.success(`Proposta duplicada como ${numero}`);
}

export function excluirProposta(p: PropostaFV) {
  if (!confirm(`Excluir proposta ${p.numero}? Esta ação não pode ser desfeita.`)) return;
  removeProposta(p.id);
  toast.success("Proposta excluída.");
}

export function PropostaList({
  propostas, onEditar, onVisualizar, onNova,
}: {
  propostas: PropostaFV[];
  onEditar: (p: PropostaFV) => void;
  onVisualizar: (id: string) => void;
  onNova: () => void;
}) {
  // Auto-vence propostas passadas da validade
  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    propostas.forEach((p) => {
      if (p.status === "ENVIADA" && p.validade && p.validade < hoje) {
        upsertProposta({ ...p, status: "VENCIDA", atualizadoEm: hoje });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propostas.length]);

  const totais = useMemo(() => {
    const total = propostas.length;
    const aprovadas = propostas.filter((p) => p.status === "APROVADA").length;
    const enviadas = propostas.filter((p) => p.status === "ENVIADA").length;
    const valorTotalAprovado = propostas
      .filter((p) => p.status === "APROVADA")
      .reduce((s, p) => s + (calcPrecificacao(p).valorFinal || 0), 0);
    return { total, aprovadas, enviadas, valorTotalAprovado };
  }, [propostas]);

  if (!propostas.length) {
    return (
      <Card className="p-12 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h3 className="text-lg font-semibold">Nenhuma proposta criada ainda</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Crie sua primeira proposta fotovoltaica em poucos minutos. O sistema
          calcula potência, quantidade de módulos, preço e margem para você.
        </p>
        <Button onClick={onNova} className="mt-4 gap-2">
          <Plus className="h-4 w-4" /> Criar primeira proposta
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-semibold">{totais.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Enviadas</div><div className="text-2xl font-semibold">{totais.enviadas}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Aprovadas</div><div className="text-2xl font-semibold text-success">{totais.aprovadas}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Valor aprovado</div><div className="text-2xl font-semibold">{fmtBRL(totais.valorTotalAprovado)}</div></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">kWp</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propostas.map((p) => {
              const dim = calcDimensionamento(p);
              const pre = calcPrecificacao(p);
              const res = calcResultado(p);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.numero}</TableCell>
                  <TableCell>{p.clienteNome || "—"}</TableCell>
                  <TableCell>{p.cidade ? `${p.cidade}/${p.estado}` : "—"}</TableCell>
                  <TableCell className="text-right">{fmtNum(dim.potenciaFinalKwp, 2)}</TableCell>
                  <TableCell className="text-right">{fmtBRL(pre.valorFinal)}</TableCell>
                  <TableCell className={`text-right ${res.margemPct < 0 ? "text-destructive" : res.margemPct < 10 ? "text-warning" : ""}`}>
                    {fmtNum(res.margemPct, 1)}%
                  </TableCell>
                  <TableCell><Badge variant={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                  <TableCell>{p.validade}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => onEditar(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Visualizar / Imprimir" onClick={() => onVisualizar(p.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicarProposta(p)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => excluirProposta(p)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
