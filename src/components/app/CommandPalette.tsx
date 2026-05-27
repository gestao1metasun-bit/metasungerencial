/**
 * D6.7 — Command Palette (Ctrl+K).
 *
 * Paleta global de comandos estilo TOTVS RM / VS Code:
 *  - navegação rápida por NAV_ITEMS;
 *  - favoritos e recentes;
 *  - sem dependência de backend.
 *
 * Atalho: Ctrl/⌘ + K abre; Esc fecha; Enter abre item.
 */
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Star, Clock, Compass } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-structure";
import { useFavoritos, useRecentes } from "@/lib/favoritos-store";
import { useIdentidade, canAccessModule } from "@/lib/identidade";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { favoritos } = useFavoritos();
  const { recentes } = useRecentes();
  const identidade = useIdentidade();

  // Atalho global Ctrl/⌘ + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navItems = useMemo(() => {
    return NAV_ITEMS.filter((n) =>
      identidade.sessionLoading ? true : canAccessModule(identidade.role, n.accessKey),
    );
  }, [identidade.role, identidade.sessionLoading]);

  function go(path: string, tab?: string) {
    setOpen(false);
    void navigate({
      to: path,
      hash: tab ? `tab=${tab}` : undefined,
    });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar tela, módulo, favorito…  (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>

        {favoritos.length > 0 && (
          <>
            <CommandGroup heading="Favoritos">
              {favoritos.map((f, i) => (
                <CommandItem
                  key={`fav-${i}`}
                  value={`fav ${f.label}`}
                  onSelect={() => go(f.path, f.tab)}
                >
                  <Star className="mr-2 h-3.5 w-3.5 text-gold" />
                  {f.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {recentes.length > 0 && (
          <>
            <CommandGroup heading="Recentes">
              {recentes.map((r, i) => (
                <CommandItem
                  key={`rec-${i}`}
                  value={`rec ${r.label}`}
                  onSelect={() => go(r.path, r.tab)}
                >
                  <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  {r.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navegar">
          {navItems.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem
                key={n.to}
                value={`${n.label} ${n.macro} ${n.to}`}
                onSelect={() => go(n.to)}
              >
                <Icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1">{n.label}</span>
                <span className="text-[10px] text-muted-foreground/70">{n.to}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Dica">
          <CommandItem disabled value="hint">
            <Compass className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11.5px] text-muted-foreground">
              Pressione Ctrl/⌘+K em qualquer tela para abrir esta paleta.
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
