import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-store";

export type Favorito = { path: string; tab?: string; label: string };
export type Recente = Favorito & { at: number };

const MAX_FAVS = 12;
const MAX_RECENTES = 8;

function favKey(uid: string) { return `ms:favs:${uid}`; }
function recKey(uid: string) { return `ms:recent:${uid}`; }

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  // notify other hooks
  window.dispatchEvent(new CustomEvent("ms:favs:changed", { detail: key }));
}

function uidOf(auth: ReturnType<typeof useAuth>): string {
  return auth.user?.id ?? "__signed_out__";
}

function sameItem(a: Favorito, b: Favorito) {
  return a.path === b.path && (a.tab ?? "") === (b.tab ?? "");
}

export function useFavoritos() {
  const auth = useAuth();
  const uid = uidOf(auth);
  const key = favKey(uid);
  const [items, setItems] = useState<Favorito[]>(() => read<Favorito[]>(key, []));

  useEffect(() => {
    const handler = () => setItems(read<Favorito[]>(key, []));
    window.addEventListener("ms:favs:changed", handler);
    window.addEventListener("storage", handler);
    setItems(read<Favorito[]>(key, []));
    return () => {
      window.removeEventListener("ms:favs:changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, [key]);

  const isFav = useCallback((it: Favorito) => items.some((i) => sameItem(i, it)), [items]);

  const toggle = useCallback((it: Favorito) => {
    const cur = read<Favorito[]>(key, []);
    const exists = cur.some((i) => sameItem(i, it));
    const next = exists ? cur.filter((i) => !sameItem(i, it)) : [it, ...cur].slice(0, MAX_FAVS);
    write(key, next);
  }, [key]);

  const remove = useCallback((it: Favorito) => {
    const cur = read<Favorito[]>(key, []);
    write(key, cur.filter((i) => !sameItem(i, it)));
  }, [key]);

  return { favoritos: items, isFav, toggle, remove };
}

export function useRecentes() {
  const auth = useAuth();
  const uid = uidOf(auth);
  const key = recKey(uid);
  const [items, setItems] = useState<Recente[]>(() => read<Recente[]>(key, []));

  useEffect(() => {
    const handler = () => setItems(read<Recente[]>(key, []));
    window.addEventListener("ms:favs:changed", handler);
    setItems(read<Recente[]>(key, []));
    return () => window.removeEventListener("ms:favs:changed", handler);
  }, [key]);

  const push = useCallback((it: Favorito) => {
    const cur = read<Recente[]>(key, []);
    const filtered = cur.filter((i) => !sameItem(i, it));
    const next: Recente[] = [{ ...it, at: Date.now() }, ...filtered].slice(0, MAX_RECENTES);
    write(key, next);
  }, [key]);

  return { recentes: items, push };
}
