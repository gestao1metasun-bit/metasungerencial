import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, Check, Archive, ExternalLink, Filter as FilterIcon, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useNotificacoesMinhas,
  useMarcarNotifLida,
  useMarcarTodasLidas,
  useArquivarNotif,
  NOTIF_PRIORIDADE_TONE,
  NOTIF_MODULO_LABEL,
  type NotifStatus,
  type NotifPrioridade,
} from "@/lib/repositories/notificacoes-repo";

export const Route = createFileRoute("/notificacoes")({
  component: NotificacoesPage,
});

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

type StatusFiltro = "TODAS" | "NAO_LIDA" | "LIDA" | "ARQUIVADA";

function NotificacoesPage() {
  const navigate = useNavigate();
  const { data: notifs = [], refetch, isFetching } = useNotificacoesMinhas(500);
  const marcarLida = useMarcarNotifLida();
  const marcarTodas = useMarcarTodasLidas();
  const arquivar = useArquivarNotif();

  const [busca, setBusca] = useState("");
  const [statusF, setStatusF] = useState<StatusFiltro>("NAO_LIDA");
  const [moduloF, setModuloF] = useState<string>("TODOS");
  const [prioridadeF, setPrioridadeF] = useState<"TODAS" | NotifPrioridade>("TODAS");

  const modulos = useMemo(
    () => Array.from(new Set(notifs.map((n) => n.modulo))).sort(),
    [notifs]
  );

  const filtradas = useMemo(() => {
    return notifs.filter((n) => {
      if (statusF !== "TODAS" && n.status !== (statusF as NotifStatus)) return false;
      if (moduloF !== "TODOS" && n.modulo !== moduloF) return false;
      if (prioridadeF !== "TODAS" && n.prioridade !== prioridadeF) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (
          !n.titulo.toLowerCase().includes(q) &&
          !(n.mensagem ?? "").toLowerCase().includes(q) &&
          !n.modulo.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [notifs, statusF, moduloF, prioridadeF, busca]);

  const counts = useMemo(
    () => ({
      total: notifs.length,
      naoLidas: notifs.filter((n) => n.status === "NAO_LIDA").length,
      criticas: notifs.filter((n) => n.status === "NAO_LIDA" && n.prioridade === "CRITICA").length,
      vencidas: notifs.filter((n) => n.vencida && n.status === "NAO_LIDA").length,
      hoje: notifs.filter((n) => {
        const d = new Date(n.criada_em);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      }).length,
    }),
    [notifs]
  );

  const abrirOrigem = (id: string, link: string | null) => {
    marcarLida.mutate(id);
    if (link) void navigate({ to: link });
  };

  return (
    <div className="space-y-3 p-2 md:p-3">
      <PageHeader
        eyebrow="Central Corporativa"
        title="Notificações"
        subtitle="Pendências, alertas e ações necessárias por módulo"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => marcarTodas.mutate()}
              disabled={counts.naoLidas === 0 || marcarTodas.isPending}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Marcar todas lidas
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total" value={counts.total} icon={Bell} />
        <StatCard label="Não lidas" value={counts.naoLidas} icon={Bell} />
        <StatCard label="Críticas" value={counts.criticas} icon={Bell} />
        <StatCard label="Vencidas" value={counts.vencidas} icon={Bell} />
        <StatCard label="Hoje" value={counts.hoje} icon={Bell} />
      </div>

      <Tabs value={statusF} onValueChange={(v) => setStatusF(v as StatusFiltro)}>
        <TabsList>
          <TabsTrigger value="NAO_LIDA">
            Não lidas {counts.naoLidas > 0 && (
              <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">{counts.naoLidas}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="LIDA">Lidas</TabsTrigger>
          <TabsTrigger value="ARQUIVADA">Arquivadas</TabsTrigger>
          <TabsTrigger value="TODAS">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2 rounded border bg-muted/30 px-3 py-2">
        <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar título, mensagem, módulo…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-7 w-64 text-xs"
        />
        <Select value={moduloF} onValueChange={setModuloF}>
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os módulos</SelectItem>
            {modulos.map((m) => (
              <SelectItem key={m} value={m}>{NOTIF_MODULO_LABEL[m] ?? m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prioridadeF} onValueChange={(v) => setPrioridadeF(v as typeof prioridadeF)}>
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas prioridades</SelectItem>
            <SelectItem value="CRITICA">Crítica</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="BAIXA">Baixa</SelectItem>
          </SelectContent>
        </Select>
        {(busca || moduloF !== "TODOS" || prioridadeF !== "TODAS") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => { setBusca(""); setModuloF("TODOS"); setPrioridadeF("TODAS"); }}
          >
            Limpar filtros
          </Button>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {filtradas.length} de {notifs.length}
        </span>
      </div>

      <div className="rounded border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Prioridade</TableHead>
              <TableHead className="w-[110px]">Módulo</TableHead>
              <TableHead>Título / Mensagem</TableHead>
              <TableHead className="w-[140px]">Criada em</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
              <TableHead className="w-[160px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                  Nenhuma notificação para os filtros atuais.
                </TableCell>
              </TableRow>
            )}
            {filtradas.map((n) => (
              <TableRow key={n.id} className={n.status === "NAO_LIDA" ? "bg-primary/5" : ""}>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${NOTIF_PRIORIDADE_TONE[n.prioridade]}`}>
                    {n.prioridade}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                  {NOTIF_MODULO_LABEL[n.modulo] ?? n.modulo}
                </TableCell>
                <TableCell>
                  <div className="text-[12.5px] font-medium leading-tight">{n.titulo}</div>
                  {n.mensagem && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{n.mensagem}</div>
                  )}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                  {fmtData(n.criada_em)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {n.status === "NAO_LIDA" ? "Não lida" : n.status === "LIDA" ? "Lida" : n.status === "ARQUIVADA" ? "Arquivada" : "Expirada"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {n.link_origem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => abrirOrigem(n.id, n.link_origem)}
                        title="Abrir origem"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                      </Button>
                    )}
                    {n.status === "NAO_LIDA" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => marcarLida.mutate(n.id)}
                        title="Marcar como lida"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {n.status !== "ARQUIVADA" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => arquivar.mutate(n.id)}
                        title="Arquivar"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
