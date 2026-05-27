/**
 * D6.10.1 — Popover para definir a flag pessoal do registro corrente.
 *
 * 6 cores semânticas oficiais + rótulo curto + observação + SLA opcional.
 * Operações via RPCs flag_set / flag_clear / flag_resolve.
 */
import { useEffect, useState } from "react";
import { Flag, X, Check, Calendar } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FLAG_CORES, flagCorMeta,
  useFlagMutations, useOwnRecordFlag,
  type FlagCor,
} from "@/hooks/useRecordFlags";

type Props = {
  entidade: string;
  registroId: string | null | undefined;
  disabled?: boolean;
  /** Permite renderizar o trigger customizado; default = botão compacto. */
  triggerLabel?: string;
  className?: string;
};

export function FlagPicker({
  entidade, registroId, disabled, triggerLabel = "Flag", className,
}: Props) {
  const [open, setOpen] = useState(false);
  const { data: flag } = useOwnRecordFlag(entidade, registroId);
  const { set, clear, resolve } = useFlagMutations(entidade);

  const [cor, setCor] = useState<FlagCor | null>(null);
  const [rotulo, setRotulo] = useState("");
  const [obs, setObs] = useState("");
  const [sla, setSla] = useState("");

  useEffect(() => {
    if (open) {
      setCor(flag?.cor ?? null);
      setRotulo(flag?.rotulo ?? "");
      setObs(flag?.observacao ?? "");
      setSla(flag?.sla_em ? flag.sla_em.slice(0, 16) : "");
    }
  }, [open, flag]);

  const meta = flag?.cor ? flagCorMeta(flag.cor) : null;

  const handleSave = async () => {
    if (!registroId || !cor) return;
    await set.mutateAsync({
      registro_id: registroId,
      cor,
      rotulo: rotulo.trim() || null,
      observacao: obs.trim() || null,
      sla_em: sla ? new Date(sla).toISOString() : null,
    });
    setOpen(false);
  };

  const handleClear = async () => {
    if (!registroId) return;
    await clear.mutateAsync(registroId);
    setOpen(false);
  };

  const handleResolve = async () => {
    if (!registroId || !flag) return;
    await resolve.mutateAsync({ flag_id: flag.id, registro_id: registroId });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || !registroId}
          className={cn(
            "h-7 px-2 gap-1 rounded-sm text-[11.5px] text-foreground/80",
            className,
          )}
          title={meta ? `Flag: ${meta.label}` : "Sinalizar registro"}
        >
          <Flag
            className="h-3.5 w-3.5"
            fill={meta?.hex ?? "none"}
            style={{ color: meta?.hex ?? undefined }}
          />
          <span className="hidden md:inline">
            {meta ? meta.label : triggerLabel}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Sinalizar registro
            </span>
            {flag && (
              <Button
                type="button" variant="ghost" size="sm"
                onClick={handleClear}
                className="h-6 px-1.5 text-[10.5px] text-destructive"
              >
                <X className="h-3 w-3 mr-0.5" /> Remover
              </Button>
            )}
          </div>

          <div className="grid grid-cols-6 gap-1">
            {FLAG_CORES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCor(c.value)}
                title={`${c.label} — ${c.semantica}`}
                className={cn(
                  "relative h-7 rounded-sm border transition",
                  cor === c.value ? "ring-2 ring-offset-1 ring-foreground" : "hover:scale-105",
                )}
                style={{ backgroundColor: c.hex, borderColor: c.hex }}
              >
                {cor === c.value && (
                  <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white" />
                )}
              </button>
            ))}
          </div>
          {cor && (
            <div className="text-[10.5px] text-muted-foreground">
              <strong className="text-foreground">{flagCorMeta(cor).label}</strong>
              {" — "}{flagCorMeta(cor).semantica}
            </div>
          )}

          <div>
            <label className="text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">Rótulo</label>
            <Input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value.slice(0, 40))}
              placeholder="Ex.: cobrar amanhã"
              className="h-7 text-[12px] mt-0.5"
              maxLength={40}
            />
          </div>

          <div>
            <label className="text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">Observação</label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value.slice(0, 500))}
              placeholder="Contexto adicional…"
              className="text-[12px] mt-0.5 min-h-[52px]"
              maxLength={500}
            />
          </div>

          <div>
            <label className="text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> SLA / prazo (opcional)
            </label>
            <Input
              type="datetime-local"
              value={sla}
              onChange={(e) => setSla(e.target.value)}
              className="h-7 text-[12px] mt-0.5"
            />
          </div>

          <div className="flex items-center gap-1 pt-1">
            <Button
              type="button" size="sm"
              onClick={handleSave}
              disabled={!cor || set.isPending}
              className="h-7 px-2 text-[11.5px] flex-1"
            >
              {set.isPending ? "Salvando…" : flag ? "Atualizar" : "Sinalizar"}
            </Button>
            {flag && flag.cor !== "VERDE" && (
              <Button
                type="button" size="sm" variant="outline"
                onClick={handleResolve}
                disabled={resolve.isPending}
                className="h-7 px-2 text-[11.5px]"
                title="Marcar como resolvido (VERDE + data de resolução)"
              >
                <Check className="h-3 w-3 mr-0.5" /> Resolver
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
