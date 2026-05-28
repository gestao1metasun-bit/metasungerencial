/**
 * D17.UI.3 — Seleção múltipla genérica para grids Enterprise RM.
 *
 * Uso:
 *   const sel = useRowSelection(filtrados, (r) => r.id);
 *   <Checkbox checked={sel.allChecked} indeterminate={sel.someChecked} onCheckedChange={sel.toggleAll}/>
 *   <Checkbox checked={sel.isSelected(r.id)} onCheckedChange={() => sel.toggle(r.id)}/>
 *   sel.selectedIds  // string[]
 *   sel.selectedRows // T[]
 *   sel.clear()
 *
 * Estado em memória. Limpa automaticamente ids que saíram da lista visível.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export function useRowSelection<T>(rows: T[], getId: (r: T) => string) {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  // Limpa seleções de linhas que não estão mais visíveis
  useEffect(() => {
    const visible = new Set(rows.map(getId));
    setIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [rows, getId]);

  const isSelected = useCallback((id: string) => ids.has(id), [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean | "indeterminate") => {
      setIds(() => {
        if (checked === true) return new Set(rows.map(getId));
        return new Set();
      });
    },
    [rows, getId],
  );

  const clear = useCallback(() => setIds(new Set()), []);

  const selectedIds = useMemo(() => Array.from(ids), [ids]);
  const selectedRows = useMemo(
    () => rows.filter((r) => ids.has(getId(r))),
    [rows, getId, ids],
  );

  const allChecked = rows.length > 0 && rows.every((r) => ids.has(getId(r)));
  const someChecked = !allChecked && rows.some((r) => ids.has(getId(r)));

  return {
    selectedIds,
    selectedRows,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allChecked,
    someChecked,
    count: ids.size,
  };
}
