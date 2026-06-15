/**
 * C-ENT.1.f — Autocomplete oficial de Cliente (fonte: Supabase/public.clientes).
 *
 * Reutilizável. Substitui seletores baseados em LS (`useClientesFull`) no
 * módulo Comercial / Propostas / Contratos.
 *
 * Regras:
 *  - value = clienteId UUID (Supabase)
 *  - onChange(cliente | null) recebe ClienteRecord (compat com fluxos antigos)
 *  - busca server-side por nome, CPF/CNPJ, telefone e e-mail (debounce 300ms)
 *  - loading / empty / error states explícitos
 *  - botões opcionais: "Abrir 360º" e "Novo cliente"
 *  - respeita permissões `comercial.cliente.visualizar` e `comercial.cliente.criar`
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Open360Button } from "./Open360Button";
import { ClienteCadastroSupabaseDialog } from "./ClienteCadastroSupabaseDialog";
import {
  useClientesSupabase,
  useClienteSupabaseById,
  clienteRowToRecord,
  type ClienteRow,
} from "@/lib/repositories/clientes-supabase-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import type { ClienteRecord } from "@/lib/clientes-store";

type Props = {
  value?: string | null;
  onChange: (c: ClienteRecord | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showOpen360?: boolean;
  showNovoCliente?: boolean;
  /** Renderização sem o <Label> externo (útil em formulários customizados). */
  hideLabel?: boolean;
  /** Classe do container. */
  className?: string;
};

function useDebouncedValue<T>(v: T, ms = 300): T {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function ClienteAutocompleteSupabase({
  value,
  onChange,
  label = "Cliente",
  placeholder = "Buscar por nome, CPF/CNPJ, telefone ou e-mail…",
  required = false,
  disabled = false,
  showOpen360 = true,
  showNovoCliente = true,
  hideLabel = false,
  className,
}: Props) {
  // @ts-expect-error perms recém-adicionadas (regen de types pendente)
  const podeVisualizar = useHasPermission("comercial.cliente.visualizar");
  // @ts-expect-error idem
  const podeCriar = useHasPermission("comercial.cliente.criar");

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const debouncedQ = useDebouncedValue(q, 300);
  const trimmed = debouncedQ.trim();

  const { data: selecionado, isLoading: loadingSel } = useClienteSupabaseById(value ?? null);
  const {
    data: resultados = [],
    isFetching,
    isError,
    error,
  } = useClientesSupabase({
    search: trimmed.length >= 2 ? trimmed : "",
    orderBy: "nome",
    orderDir: "asc",
    limit: 20,
  });

  const showResults = open && podeVisualizar !== false;
  const lista: ClienteRow[] = useMemo(
    () => (trimmed.length >= 2 ? resultados : resultados.slice(0, 8)),
    [resultados, trimmed],
  );

  const selecionar = (row: ClienteRow) => {
    onChange(clienteRowToRecord(row));
    setOpen(false);
    setQ("");
  };
  const limpar = () => {
    onChange(null);
    setQ("");
  };

  const inputValor = open
    ? q
    : selecionado
      ? `${selecionado.nome}${selecionado.doc ? ` · ${selecionado.doc}` : ""}`
      : q;

  return (
    <div className={className}>
      {!hideLabel && (
        <Label className="mb-1.5 block">
          {label}
          {required ? " *" : ""}
        </Label>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={inputValor}
              placeholder={placeholder}
              disabled={disabled || podeVisualizar === false}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onBlur={() => setTimeout(() => setOpen(false), 180)}
              className="pl-7 pr-7"
            />
            {(value || q) && !disabled && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={limpar}
                aria-label="Limpar seleção"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {showResults && (
            <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
              {isFetching && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
                </div>
              )}
              {isError && (
                <div className="px-3 py-2 text-xs text-destructive">
                  Erro ao buscar clientes: {(error as Error)?.message ?? "tente novamente"}
                </div>
              )}
              {!isFetching && !isError && lista.length === 0 && (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  {trimmed.length >= 2
                    ? "Nenhum cliente encontrado."
                    : "Digite ao menos 2 caracteres para buscar."}
                </div>
              )}
              {!isError &&
                lista.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selecionar(c)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {c.doc || "sem CPF/CNPJ"} · {c.telefone || "sem telefone"} ·{" "}
                      {c.cidade ?? "—"}/{c.uf ?? "—"}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {showOpen360 && value && (
          <Open360Button clienteId={value} variant="outline" size="icon" />
        )}

        {showNovoCliente && podeCriar !== false && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setNovoOpen(true)}
            disabled={disabled}
            title="Cadastrar novo cliente"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Novo
          </Button>
        )}
      </div>

      {loadingSel && value && (
        <p className="mt-1 text-[11px] text-muted-foreground">Carregando cliente…</p>
      )}

      <ClienteCadastroSupabaseDialog
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        onCreated={(c) => {
          onChange(c);
          setNovoOpen(false);
        }}
        showOpen360Action
      />
    </div>
  );
}
