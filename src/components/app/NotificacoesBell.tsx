import { Bell, Check, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotificacoesMinhas,
  useNotificacoesNaoLidasCount,
  useMarcarNotifLida,
  useMarcarTodasLidas,
  NOTIF_PRIORIDADE_TONE,
  NOTIF_MODULO_LABEL,
  type NotificacaoRow,
} from "@/lib/repositories/notificacoes-repo";

function fmtRelativa(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificacoesBell() {
  const { data: notifs = [] } = useNotificacoesMinhas(20);
  const { naoLidas, criticas } = useNotificacoesNaoLidasCount();
  const marcarLida = useMarcarNotifLida();
  const marcarTodas = useMarcarTodasLidas();
  const navigate = useNavigate();

  const recentes = notifs.slice(0, 8);

  const abrirOrigem = (n: NotificacaoRow) => {
    if (n.status === "NAO_LIDA") marcarLida.mutate(n.id);
    if (n.link_origem) void navigate({ to: n.link_origem });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 relative"
          title={`${naoLidas} não lidas${criticas > 0 ? ` · ${criticas} críticas` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {naoLidas > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-bold leading-[14px] text-white grid place-items-center ${
                criticas > 0 ? "bg-rose-500 ring-1 ring-rose-300" : "bg-gold text-meta-bar"
              }`}
            >
              {naoLidas > 99 ? "99+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Notificações</span>
            {naoLidas > 0 && (
              <Badge variant="secondary" className="h-4 text-[10px]">
                {naoLidas} não lidas
              </Badge>
            )}
          </div>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px]"
              onClick={() => marcarTodas.mutate()}
              disabled={marcarTodas.isPending}
            >
              <Check className="h-3 w-3 mr-1" /> Todas lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[480px]">
          {recentes.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              Nenhuma notificação por enquanto.
            </div>
          ) : (
            <ul className="divide-y">
              {recentes.map((n) => (
                <li
                  key={n.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-muted/40 ${
                    n.status === "NAO_LIDA" ? "bg-primary/5" : ""
                  }`}
                  onClick={() => abrirOrigem(n)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 h-4 ${NOTIF_PRIORIDADE_TONE[n.prioridade]}`}
                        >
                          {n.prioridade}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {NOTIF_MODULO_LABEL[n.modulo] ?? n.modulo}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {fmtRelativa(n.criada_em)}
                        </span>
                      </div>
                      <div className="text-[12px] font-medium leading-tight truncate" title={n.titulo}>
                        {n.titulo}
                      </div>
                      {n.mensagem && (
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {n.mensagem}
                        </div>
                      )}
                    </div>
                    {n.link_origem && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t px-3 py-2 flex items-center justify-between">
          <Link
            to="/notificacoes"
            className="text-[11px] text-primary hover:underline font-medium"
          >
            Ver todas →
          </Link>
          <span className="text-[10px] text-muted-foreground">
            {notifs.length} carregadas
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
