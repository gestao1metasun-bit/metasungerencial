// PropostaList — visão em CARDS por cliente.
// Cada card mostra: nome do cliente, consultor, valor total e bolinha de
// "dias no status" (cor varia conforme idade). Dentro do card podem haver
// várias propostas. Se qualquer proposta do card estiver APROVADA, o card
// fica bloqueado para edição (apenas visualização/duplicação).
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Pencil, Eye, Copy, Trash2, Sparkles, Lock, ChevronDown, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  type PropostaFV, type StatusProposta,
  upsertProposta, removeProposta, proximoNumeroProposta,
  calcPrecificacao, fmtBRL,
} from "@/modules/propostas/store";

export function statusVariant(s: StatusProposta): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "APROVADA": return "default";
    case "GERADA":
    case "ENVIADA": return "secondary";
    case "RECUSADA":
    case "VENCIDA":
    case "CANCELADA": return "destructive";
    default: return "outline";
  }
}

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

function diasDesde(iso?: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function dotColorFor(dias: number): string {
  if (dias <= 3) return "bg-success";
  if (dias <= 7) return "bg-info";
  if (dias <= 15) return "bg-warning";
  return "bg-destructive";
}

type Grupo = {
  chave: string;
  clienteNome: string;
  consultor: string;
  propostas: PropostaFV[];
  valorTotal: number;
  diasMax: number;
  bloqueado: boolean;
  statusResumo: StatusProposta;
};

function agrupar(propostas: PropostaFV[]): Grupo[] {
  const map = new Map<string, Grupo>();
  for (const p of propostas) {
    const chave = (p.clienteDoc || p.clienteNome || p.id).trim().toUpperCase();
    const valor = calcPrecificacao(p).valorFinal || 0;
    const dias = diasDesde(p.atualizadoEm || p.criadoEm);
    const g = map.get(chave);
    if (!g) {
      map.set(chave, {
        chave,
        clienteNome: p.clienteNome || "—",
        consultor: p.consultor || "",
        propostas: [p],
        valorTotal: valor,
        diasMax: dias,
        bloqueado: p.status === "APROVADA",
        statusResumo: p.status,
      });
    } else {
      g.propostas.push(p);
      g.valorTotal += valor;
      if (dias > g.diasMax) g.diasMax = dias;
      if (!g.consultor && p.consultor) g.consultor = p.consultor;
      if (p.status === "APROVADA") { g.bloqueado = true; g.statusResumo = "APROVADA"; }
    }
  }
  // ordena cards: bloqueados ao final, depois por dias desc
  return Array.from(map.values()).sort((a, b) => {
    if (a.bloqueado !== b.bloqueado) return a.bloqueado ? 1 : -1;
    return b.diasMax - a.diasMax;
  });
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

  const grupos = useMemo(() => agrupar(propostas), [propostas]);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setAbertos((s) => ({ ...s, [k]: !s[k] }));

  const totais = useMemo(() => {
    const total = propostas.length;
    const aprovadas = propostas.filter((p) => p.status === "APROVADA").length;
    const enviadas = propostas.filter((p) => p.status === "ENVIADA").length;
    const valorTotalAprovado = propostas
      .filter((p) => p.status === "APROVADA")
      .reduce((s, p) => s + (calcPrecificacao(p).valorFinal || 0), 0);
    return { total, aprovadas, enviadas, valorTotalAprovado, clientes: grupos.length };
  }, [propostas, grupos.length]);

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
        <Card className="p-4"><div className="text-xs text-muted-foreground">Clientes</div><div className="text-2xl font-semibold">{totais.clientes}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Enviadas</div><div className="text-2xl font-semibold">{totais.enviadas}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Aprovadas</div><div className="text-2xl font-semibold text-success">{totais.aprovadas}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Valor aprovado</div><div className="text-2xl font-semibold">{fmtBRL(totais.valorTotalAprovado)}</div></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {grupos.map((g) => {
          const aberto = !!abertos[g.chave];
          const dotCls = dotColorFor(g.diasMax);
          return (
            <Card
              key={g.chave}
              className={`overflow-hidden transition ${g.bloqueado ? "border-success/40 bg-success/5" : "hover:shadow-md"}`}
            >
              <button
                type="button"
                onClick={() => toggle(g.chave)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <div className="mt-1">
                  {aberto ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-base font-semibold">{g.clienteNome}</div>
                    {g.bloqueado && (
                      <Badge variant="default" className="gap-1">
                        <Lock className="h-3 w-3" /> Aprovado
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    Consultor: {g.consultor || "—"}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-lg font-semibold">{fmtBRL(g.valorTotal)}</div>
                    <div className="flex items-center gap-1.5" title={`${g.diasMax} dia(s) no status ${g.statusResumo}`}>
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotCls}`} />
                      <span className="text-xs font-medium text-muted-foreground">{g.diasMax}d</span>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {g.propostas.length} proposta{g.propostas.length > 1 ? "s" : ""}
                  </div>
                </div>
              </button>

              {aberto && (
                <div className="border-t bg-muted/30">
                  {g.propostas.map((p) => {
                    const valor = calcPrecificacao(p).valorFinal || 0;
                    const dias = diasDesde(p.atualizadoEm || p.criadoEm);
                    return (
                      <div key={p.id} className="flex items-center gap-2 border-b px-4 py-2 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{p.numero}</span>
                            <Badge variant={statusVariant(p.status)} className="text-[10px]">{p.status}</Badge>
                            <span className="text-[11px] text-muted-foreground">{dias}d</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {fmtBRL(valor)} · validade {p.validade}
                          </div>
                        </div>
                        <div className="flex shrink-0">
                          <Button variant="ghost" size="icon" title="Visualizar / Imprimir" onClick={() => onVisualizar(p.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!g.bloqueado && (
                            <Button variant="ghost" size="icon" title="Editar" onClick={() => onEditar(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicarProposta(p)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!g.bloqueado && (
                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => excluirProposta(p)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
