import { useCallback, useEffect, useState } from "react";

export type GridDensity = "compact" | "comfortable";

const KEY = (id: string) => `grid:density:${id}`;

export function useGridDensity(gridId: string, initial: GridDensity = "compact") {
  const [density, setDensityState] = useState<GridDensity>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY(gridId));
      if (raw === "compact" || raw === "comfortable") setDensityState(raw);
    } catch {}
  }, [gridId]);

  const setDensity = useCallback(
    (d: GridDensity) => {
      setDensityState(d);
      try {
        localStorage.setItem(KEY(gridId), d);
      } catch {}
    },
    [gridId],
  );

  return { density, setDensity };
}

/** CSS aplicado ao wrapper para reduzir paddings/heights na tabela. */
export function densityClass(d: GridDensity) {
  return d === "compact"
    ? "[&_th]:!h-8 [&_th]:!py-1 [&_td]:!py-1 [&_td]:!px-2 text-[12px]"
    : "[&_th]:!h-10 [&_td]:!py-2 [&_td]:!px-2 text-sm";
}
