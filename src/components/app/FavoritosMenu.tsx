import { Link, useRouterState } from "@tanstack/react-router";
import { Star, Clock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFavoritos, useRecentes, type Favorito } from "@/lib/favoritos-store";
import { ROUTE_TABS, parseHash } from "@/lib/route-tabs";

function labelFor(path: string, tab?: string): string {
  const cfg = ROUTE_TABS[path];
  const moduleLabel = path.replace("/", "").replace(/^\w/, (c) => c.toUpperCase()) || "Início";
  if (!tab || !cfg) return moduleLabel;
  const t = cfg.tabs.find((x) => x.value === tab);
  return t ? `${moduleLabel} · ${t.label}` : moduleLabel;
}

/** Hook que registra cada mudança de rota+tab como "recente". */
export function useRegisterRecente() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const { push } = useRecentes();
  const tab = parseHash(hash);
  const last = useRef<string>("");
  useEffect(() => {
    if (!path || path === "/login" || path === "/auth") return;
    const key = `${path}#${tab}`;
    if (key === last.current) return;
    last.current = key;
    push({ path, tab: tab || undefined, label: labelFor(path, tab || undefined) });
  }, [path, tab, push]);
}

export function FavoritosMenu() {
  const [open, setOpen] = useState(false);
  const { favoritos, remove } = useFavoritos();
  const { recentes } = useRecentes();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Favoritos e últimos acessos"
        className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:text-gold hover:bg-accent transition"
      >
        <Star className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-elegant z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/70">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Star className="h-3 w-3 text-gold" /> Favoritos
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {favoritos.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Nenhum favorito ainda. Use a estrela no topo de cada página.</li>
            )}
            {favoritos.map((f) => (
              <li key={`f-${f.path}-${f.tab ?? ""}`} className="group flex items-center justify-between gap-2 px-1">
                <Link
                  to={f.path}
                  hash={f.tab ? `tab=${f.tab}` : undefined}
                  onClick={() => setOpen(false)}
                  className="flex-1 truncate rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  {f.label}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(f)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                  title="Remover dos favoritos"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 border-y border-border/70">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Clock className="h-3 w-3" /> Últimos acessos
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {recentes.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Sem histórico ainda.</li>
            )}
            {recentes.map((r) => (
              <li key={`r-${r.path}-${r.tab ?? ""}-${r.at}`}>
                <Link
                  to={r.path}
                  hash={r.tab ? `tab=${r.tab}` : undefined}
                  onClick={() => setOpen(false)}
                  className="block truncate rounded-md px-3 py-1.5 text-sm hover:bg-accent"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Botão estrela para favoritar a página/aba atual — usado no PageHeader. */
export function FavoritarPaginaButton({ title }: { title: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const tab = parseHash(hash) || undefined;
  const { isFav, toggle } = useFavoritos();
  const item: Favorito = { path, tab, label: tab ? `${title} · ${ROUTE_TABS[path]?.tabs.find(t => t.value === tab)?.label ?? tab}` : title };
  const active = isFav(item);
  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`grid h-7 w-7 place-items-center rounded-md transition ${active ? "text-gold" : "text-muted-foreground hover:text-gold"}`}
    >
      <Star className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
    </button>
  );
}
