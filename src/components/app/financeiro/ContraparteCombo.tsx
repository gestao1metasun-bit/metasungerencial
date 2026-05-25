// Combobox reutilizável de contraparte (cliente/fornecedor/obra).
// Buscável, com opção de adicionar inline quando o termo não existe.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";

export type ContraparteOption = { id: string; nome: string; sub?: string };

export function ContraparteCombo({
  value, onChange, options, placeholder, onAdd, addLabel, disabled,
}: {
  value: string;
  onChange: (nome: string) => void;
  options: ContraparteOption[];
  placeholder: string;
  onAdd?: (nome: string) => void;
  addLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const buscaTrim = busca.trim();
  const existe = options.some((o) => o.nome.toLowerCase() === buscaTrim.toLowerCase());
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" disabled={disabled} className="w-full justify-between font-normal">
          <span className={value ? "" : "text-muted-foreground"}>{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Buscar…" value={busca} onValueChange={setBusca} />
          <CommandList>
            <CommandEmpty>Nenhum encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.id} value={o.nome} onSelect={() => { onChange(o.nome); setOpen(false); }}>
                  <Check className={`mr-2 h-4 w-4 ${value === o.nome ? "opacity-100" : "opacity-0"}`} />
                  <div className="flex flex-col">
                    <span>{o.nome}</span>
                    {o.sub && <span className="text-[10px] text-muted-foreground">{o.sub}</span>}
                  </div>
                </CommandItem>
              ))}
              {onAdd && buscaTrim && !existe && (
                <CommandItem value={`__add__${buscaTrim}`} onSelect={() => { onAdd(buscaTrim); onChange(buscaTrim); setBusca(""); setOpen(false); }}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>{addLabel ?? "+ Adicionar"}: <strong>{buscaTrim}</strong></span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
