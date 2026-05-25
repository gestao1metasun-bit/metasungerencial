// Fechamento contábil — por conta bancária + mês, com fechamento global derivado.
import { useState, useMemo } from "react";
import { Lock, Unlock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useFechamentos, fecharContaMes, reabrirContaMes,
  fecharMesGlobal, reabrirMesGlobal, isMesFechado, isMesGlobalFechado,
} from "@/lib/fin-fechamento-store";
import { useContasFinanceiras } from "@/lib/fin-contas-store";
import { useMyPermissions } from "@/hooks/use-permissions";
import { useRepoTitulos } from "@/hooks/useRepoFinanceiro";
import { toast } from "sonner";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FechamentoTab() {
  const fechs = useFechamentos();
  const contas = useContasFinanceiras().filter((c) => c.ativo);
  const { can, isAdmin, userId } = useMyPermissions();
  const podeReabrir = isAdmin || can("financeiro.reabrir_periodo");
  const usuarioAtual = userId || "desconhecido";
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [saldos, setSaldos] = useState<Record<string, string>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [obsGlobal, setObsGlobal] = useState("");

  const globalFechado = useMemo(() => isMesGlobalFechado(mes), [mes, fechs]);
  const todasFechadas = contas.length > 0 && contas.every((c) => isMesFechado(mes, c.id));

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <Label>Mês de referência</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
          </div>
          <div className="text-xs text-muted-foreground max-w-md">
            Feche cada conta após a conciliação. O fechamento global do mês fica disponível quando
            todas as contas ativas estiverem fechadas.
          </div>
        </div>

        <div className="text-sm font-semibold mb-2">Contas bancárias / caixa</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Conta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[18%]">Saldo final conciliado</TableHead>
              <TableHead className="w-[34%]">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Nenhuma conta ativa.</TableCell></TableRow>
            )}
            {contas.map((c) => {
              const fechado = isMesFechado(mes, c.id);
              const reg = fechs.find((f) => f.mes === mes && f.contaId === c.id && !f.reabertoEm);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{c.tipo}{c.agencia ? ` · ag ${c.agencia}` : ""}{c.conta ? ` · cc ${c.conta}` : ""}</div>
                  </TableCell>
                  <TableCell>
                    {fechado ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Fechado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" /> Aberto</Badge>
                    )}
                    {reg && <div className="text-[11px] text-muted-foreground mt-1">{fmtBRL(reg.saldoFinal ?? 0)} · {new Date(reg.fechadoEm).toLocaleDateString("pt-BR")}</div>}
                  </TableCell>
                  <TableCell>
                    {!fechado ? (
                      <Input
                        type="number" step="0.01" placeholder="0,00"
                        value={saldos[c.id] ?? ""}
                        onChange={(e) => setSaldos((s) => ({ ...s, [c.id]: e.target.value }))}
                      />
                    ) : (
                      <span className="font-mono text-sm">{fmtBRL(reg?.saldoFinal ?? 0)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!fechado ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          const v = Number(saldos[c.id] ?? "");
                          if (!Number.isFinite(v)) return toast.error("Saldo inválido.");
                          fecharContaMes({ mes, contaId: c.id, saldoFinal: v, usuario: usuarioAtual });
                          setSaldos((s) => ({ ...s, [c.id]: "" }));
                          toast.success(`${c.nome} fechada em ${mes}.`);
                        }}
                      ><Lock className="mr-1 h-3.5 w-3.5" />Fechar conta</Button>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder={podeReabrir ? "Motivo da reabertura (mín. 5)" : "Sem permissão para reabrir"}
                          value={motivos[c.id] ?? ""}
                          onChange={(e) => setMotivos((m) => ({ ...m, [c.id]: e.target.value }))}
                          disabled={!podeReabrir}
                        />
                        <Button
                          size="sm" variant="destructive"
                          disabled={!podeReabrir}
                          title={!podeReabrir ? "Requer permissão financeiro.reabrir_periodo" : undefined}
                          onClick={() => {
                            if (!podeReabrir) return toast.error("Sem permissão para reabrir período.");
                            const m = (motivos[c.id] ?? "").trim();
                            if (m.length < 5) return toast.error("Motivo obrigatório (mín. 5 caracteres).");
                            reabrirContaMes({ mes, contaId: c.id, usuario: usuarioAtual, motivo: m });
                            setMotivos((s) => ({ ...s, [c.id]: "" }));
                            toast.success("Conta reaberta.");
                          }}
                        ><Unlock className="mr-1 h-3.5 w-3.5" />Reabrir</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="text-sm font-semibold mb-2">Fechamento global do mês</div>
        <div className="text-xs text-muted-foreground mb-3">
          Disponível somente quando todas as contas ativas estiverem fechadas em {mes}.
          Após fechado, qualquer baixa/edição em títulos do mês (em qualquer conta) é bloqueada.
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grow"><Label>Observação</Label><Input value={obsGlobal} onChange={(e) => setObsGlobal(e.target.value)} /></div>
          {!globalFechado ? (
            <Button
              disabled={!todasFechadas}
              onClick={() => { fecharMesGlobal(mes, usuarioAtual, obsGlobal); setObsGlobal(""); toast.success(`Mês ${mes} fechado.`); }}
            ><Lock className="mr-1 h-4 w-4" />Fechar mês {mes}</Button>
          ) : (
            <Button
              variant="destructive"
              disabled={!podeReabrir}
              title={!podeReabrir ? "Requer permissão financeiro.reabrir_periodo" : undefined}
              onClick={() => {
                if (!podeReabrir) return toast.error("Sem permissão para reabrir período.");
                const m = obsGlobal.trim();
                if (m.length < 5) return toast.error("Motivo obrigatório (mín. 5 caracteres).");
                reabrirMesGlobal(mes, usuarioAtual, m);
                setObsGlobal("");
                toast.success("Mês reaberto.");
              }}
            ><Unlock className="mr-1 h-4 w-4" />Reabrir mês</Button>
          )}
        </div>
        {globalFechado && !podeReabrir && (
          <div className="mt-2 text-xs text-rose-700">
            Você não tem permissão para reabrir o fechamento global. Solicite à diretoria/controladoria.
          </div>
        )}
        {!todasFechadas && !globalFechado && (
          <div className="mt-2 text-xs text-amber-700">
            Ainda há {contas.filter((c) => !isMesFechado(mes, c.id)).length} conta(s) em aberto neste mês.
          </div>
        )}
      </Card>

      <Card className="bg-[image:var(--gradient-card)]">
        <div className="p-4 text-sm font-semibold">Histórico</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Mês</TableHead><TableHead>Escopo</TableHead><TableHead>Saldo</TableHead>
            <TableHead>Fechado em</TableHead><TableHead>Por</TableHead>
            <TableHead>Reabertura</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {fechs.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum fechamento.</TableCell></TableRow>}
            {fechs.map((f, i) => {
              const conta = f.contaId ? contas.find((c) => c.id === f.contaId)?.nome ?? f.contaId : "GLOBAL";
              return (
                <TableRow key={`${f.mes}-${f.contaId ?? "G"}-${i}`}>
                  <TableCell className="font-mono">{f.mes}</TableCell>
                  <TableCell className="text-xs">{conta}</TableCell>
                  <TableCell className="font-mono text-xs">{f.saldoFinal != null ? fmtBRL(f.saldoFinal) : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(f.fechadoEm).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs">{f.fechadoPor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {f.reabertoEm ? `${new Date(f.reabertoEm).toLocaleString("pt-BR")} por ${f.reabertoPor}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{f.reabertoEm ? "Reaberto" : "Fechado"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
