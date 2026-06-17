/**
 * Comercial — Aba de Aditivos (LS).
 * Extraído de `src/routes/comercial.tsx` em C-ENT.11.a (split puro, ZERO mudança funcional).
 * NOTA D15: continua consumindo `aditivos-store` LS — migração para Supabase fica para C-ENT.11.c.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BulkActionBar, EnterpriseRecordToolbar, RowActions,
  ribbonRmComercial, layoutBarRm, useRowSelection,
  type EnterpriseProcessItem,
} from "@/components/app/enterprise";
import { AditivoBadge } from "@/components/app/AditivoBadge";
import { AditivosPanel } from "@/components/app/AditivosPanel";
import { useAditivos, isPendente as isAditivoPendente } from "@/lib/aditivos-store";
import { usePodeGerenciarAditivos } from "@/lib/auth-store";
import { fmtBRL } from "@/lib/mock-data";
import { useAuthCurrent, type Contrato } from "./_shared";

export function AditivosTab({ contratos }: { contratos: Contrato[] }) {
  const aditivos = useAditivos();
  const podeGerenciar = usePodeGerenciarAditivos();
  const { user } = useAuthCurrent();
  const [filtro, setFiltro] = useState<"todos" | "pendentes" | "aprovados">("todos");
  const [busca, setBusca] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const contratosComAditivos = useMemo(() => {
    const set = new Set(aditivos.map((a) => a.contratoId));
    return contratos.filter((c) => set.has(c.id));
  }, [aditivos, contratos]);

  const contratosAssinados = contratos.filter((c) => c.status === "Assinado" && !c.cancelado);
  const elegiveis = filtro === "todos" ? contratosAssinados : contratosComAditivos;

  const lista = elegiveis.filter((c) => {
    const aDoContrato = aditivos.filter((a) => a.contratoId === c.id);
    if (filtro === "pendentes" && !aDoContrato.some(isAditivoPendente)) return false;
    if (filtro === "aprovados" && !aDoContrato.some((a) => a.status === "APROVADO")) return false;
    if (busca && !`${c.id} ${c.cliente}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const contratoAberto = openId ? contratos.find((c) => c.id === openId) ?? null : null;
  const selAditivos = useRowSelection(lista, (c) => c.id);

  return (
    <div className="space-y-4">
      {/* D17.UI Fase 2b — Aditivos: barra Enterprise RM/TOTVS */}
      <EnterpriseRecordToolbar
        entityType="contratos"
        selectedIds={selAditivos.selectedIds}
        availableActions={["novo", "editar", "atualizar", "anexos", "favoritos", "filtroAvancado", "colunas", "exportar", "imprimir", "historico", "auditoria"]}
        availableProcesses={[
          { key: "novo_aditivo", label: "Novo aditivo (escolher contrato)", group: "Contratos", requerSelecao: 0 },
          { key: "criar_aditivo", label: "Criar aditivo neste contrato", group: "Contratos" },
          { key: "aprovar_aditivo", label: "Aprovar aditivo", group: "Contratos" },
          { key: "cancelar_aditivo", label: "Cancelar aditivo", group: "Contratos", destructive: true, requerMotivo: true },
          { key: "gerar_financeiro_aditivo", label: "Gerar financeiro (aditivo)", group: "Contratos" },
          { key: "enviar_engenharia_aditivo", label: "Enviar para Engenharia", group: "Contratos" },
          { key: "atualizar_lista", label: "Atualizar lista", group: "Manutenção", requerSelecao: 0 },
        ] as EnterpriseProcessItem[]}
        onProcess={(key) => {
          if (key === "atualizar_lista") toast.info("Aditivos atualizados.");
          else if (key === "novo_aditivo" || key === "criar_aditivo")
            toast.info("Criação oficial de aditivo via RPC chega em D27.COM.AD.");
          else if (key === "aprovar_aditivo" || key === "cancelar_aditivo")
            toast.info("Workflow de aditivos chega em D27.COM.AD.");
          else if (key === "gerar_financeiro_aditivo")
            toast.info("Geração financeira do aditivo chega em D27.COM.AD.");
          else if (key === "enviar_engenharia_aditivo")
            toast.info("Envio do aditivo para Engenharia chega em D27.COM.AD.");
        }}
        searchPlaceholder="Buscar contrato, cliente…"
        search={busca}
        onSearchChange={setBusca}
        onAction={(a) => {
          if (a === "novo") {
            const ids = selAditivos.selectedIds;
            if (ids.length === 1) { setOpenId(ids[0]); return; }
            if (ids.length > 1) { toast.info("Selecione apenas 1 contrato para adicionar aditivo."); return; }
            if (lista.length === 1) { setOpenId(lista[0].id); return; }
            toast.info("Selecione um contrato na tabela para adicionar aditivo.");
          }
          else if (a === "atualizar") {
            setBusca("");
            setFiltro("todos");
            selAditivos.clear();
            toast.success("Lista de aditivos atualizada.");
          }
          else if (a === "exportar") {
            const SEP = ";";
            const esc = (v: unknown) => {
              const s = String(v ?? "");
              return /["\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            };
            const header = ["Contrato", "Cliente", "Valor consolidado", "Aditivos total", "Aditivos aprovados", "Situação"];
            const rows = lista.map((c) => {
              const aDoContrato = aditivos.filter((a) => a.contratoId === c.id);
              const aprov = aDoContrato.filter((a) => a.status === "APROVADO" && !a.oculto).length;
              const pend = aDoContrato.find(isAditivoPendente);
              return [c.id, c.cliente, c.valor, aDoContrato.length, aprov, pend ? "Pendente" : "—"];
            });
            const csv = [header, ...rows].map((r) => r.map(esc).join(SEP)).join("\r\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `aditivos-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exportado: ${lista.length} contrato(s).`);
          }
          else if (a === "favoritos") {
            const key = "ui.comercial.aditivos.favoritos.v1";
            const ids = selAditivos.selectedIds;
            if (ids.length === 0) { toast.info("Selecione contrato(s) para favoritar."); return; }
            try {
              const cur = JSON.parse(localStorage.getItem(key) || "[]") as string[];
              const next = Array.from(new Set([...cur, ...ids]));
              localStorage.setItem(key, JSON.stringify(next));
              toast.success(`${ids.length} contrato(s) marcados como favoritos.`);
            } catch { toast.error("Falha ao salvar favoritos."); }
          }
          else if (a === "colunas") {
            toast.info("Colunas: Contrato · Cliente · Valor · Aditivos · Situação · Ações (gestor universal em D27.COM.5).");
          }
          else if (a === "anexos") {
            const ids = selAditivos.selectedIds;
            if (ids.length !== 1) { toast.info("Selecione 1 contrato para ver anexos."); return; }
            setOpenId(ids[0]);
          }
          else if (a === "historico") {
            const ids = selAditivos.selectedIds;
            if (ids.length === 1) { setOpenId(ids[0]); return; }
            window.location.href = "/auditoria?modulo=COMERCIAL&entidade=contratos";
          }
          else if (a === "auditoria") {
            window.location.href = "/auditoria?modulo=COMERCIAL&entidade=contratos";
          }
          else if (a === "filtroAvancado") {
            const ordem: Array<"todos" | "pendentes" | "aprovados"> = ["todos", "pendentes", "aprovados"];
            const next = ordem[(ordem.indexOf(filtro) + 1) % ordem.length];
            setFiltro(next);
            toast.success(`Filtro: ${next === "todos" ? "Todos assinados" : next === "pendentes" ? "Pendentes" : "Aprovados"}.`);
          }
        }}
        statusActions={ribbonRmComercial()}
        layoutBar={layoutBarRm()}
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            {(["pendentes", "aprovados", "todos"] as const).map((f) => (
              <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>
                {f === "pendentes" ? "Pendentes" : f === "aprovados" ? "Aprovados" : "Todos os contratos assinados"}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {!podeGerenciar && (
        <Card className="p-3 border-warning/40 bg-warning/5 text-xs">
          <b>Visualização somente.</b> Apenas Financeiro/Diretoria pode criar, aprovar, reprovar ou substituir aditivos.
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={selAditivos.allChecked ? true : selAditivos.someChecked ? "indeterminate" : false}
                  onCheckedChange={selAditivos.toggleAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor consolidado</TableHead>
              <TableHead className="text-right">Aditivos</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right w-[160px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Nenhum contrato.</TableCell></TableRow>
            )}
            {lista.map((c) => {
              const aDoContrato = aditivos.filter((a) => a.contratoId === c.id);
              const pend = aDoContrato.find(isAditivoPendente);
              const aprov = aDoContrato.filter((a) => a.status === "APROVADO" && !a.oculto).length;
              return (
                <TableRow key={c.id} data-state={selAditivos.isSelected(c.id) ? "selected" : undefined}>
                  <TableCell className="w-8"><Checkbox checked={selAditivos.isSelected(c.id)} onCheckedChange={() => selAditivos.toggle(c.id)} aria-label={`Selecionar ${c.id}`} /></TableCell>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell>{c.cliente}</TableCell>
                  <TableCell className="text-right font-mono">{fmtBRL(c.valor)}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs">{aDoContrato.length} total · {aprov} aprovados</span>
                  </TableCell>
                  <TableCell>
                    {pend ? <AditivoBadge contratoId={c.id} size="sm" /> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      rowId={c.id}
                      actions={[
                        { kind: "visualizar", label: "Abrir aditivos do contrato" },
                        { kind: "anexos", label: "Anexos do contrato", badgeCount: aDoContrato.length || undefined },
                        { kind: "historico", label: "Histórico de aditivos", overflow: true },
                      ]}
                      onAction={(kind) => {
                        if (kind === "visualizar" || kind === "anexos" || kind === "historico") setOpenId(c.id);
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <BulkActionBar
        count={selAditivos.count}
        label="contrato(s) selecionado(s)"
        onClear={selAditivos.clear}
        actions={[
          { key: "aprovar", label: "Aprovar aditivos", tone: "verde", onClick: () => toast.info("Aprovação em lote chega em D27.COM.AD.") },
          { key: "gerar_fin", label: "Gerar financeiro", tone: "verde", onClick: () => toast.info("Geração financeira em lote chega em D27.COM.AD.") },
          { key: "exportar", label: "Exportar", tone: "azul", onClick: () => toast.info("Exportação CSV em lote chega em D17.UI.3.") },
        ]}
      />

      <Dialog open={!!contratoAberto} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aditivos — contrato {contratoAberto?.id} · {contratoAberto?.cliente}</DialogTitle>
          </DialogHeader>
          {contratoAberto && (
            <AditivosPanel contrato={contratoAberto} usuario={user} podeGerenciar={podeGerenciar} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
