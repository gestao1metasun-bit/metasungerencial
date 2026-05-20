/** Extrai apenas o número (kW) de um ID/label de inversor.
 *  Ex.: "INV-STD-37_5" → "37,5", "INVERSOR 37,5KW" → "37,5",
 *       "Growatt MIN 10000" → "10" (10kW), "Solis 60K" → "60",
 *       "Deye 40K" → "40", "Sungrow 50K" → "50". Sem número: retorna "".
 *  Em todo o sistema mostramos apenas o numeral.
 */
export function fmtInversorNumero(idOrText: string | null | undefined): string {
  if (!idOrText) return "";
  const s = String(idOrText).trim();
  if (!s) return "";
  // 1) Padrão INV-STD-XX ou INV-STD-37_5
  const std = /INV-STD-(\d+(?:[_.,]\d+)?)/i.exec(s);
  if (std) return std[1].replace("_", ",").replace(".", ",");
  // 2) "INVERSOR 37,5 KW" / "INVERSOR 37.5KW"
  const lbl = /INVERSOR\s+(\d+(?:[.,]\d+)?)\s*KW/i.exec(s);
  if (lbl) return lbl[1].replace(".", ",");
  // 3) "Growatt MIN 10000" — número em watts (>= 1000) → kW
  const w = /(\d{4,6})\b/.exec(s);
  if (w) {
    const kw = parseInt(w[1], 10) / 1000;
    return Number.isInteger(kw) ? String(kw) : String(kw).replace(".", ",");
  }
  // 4) "Solis 60K" / "Deye 40K" / "60kW"
  const k = /(\d+(?:[.,]\d+)?)\s*K(?:W|$| )/i.exec(s);
  if (k) return k[1].replace(".", ",");
  // 5) Apenas dígitos
  const n = /^\s*(\d+(?:[.,]\d+)?)\s*$/.exec(s);
  if (n) return n[1].replace(".", ",");
  return s;
}

/** Junta uma lista de IDs/labels em "2x 15 + 30" (apenas números). */
export function fmtInversoresLista(ids: (string | undefined | null)[]): string {
  const counts = new Map<string, number>();
  for (const v of ids) {
    const n = fmtInversorNumero(v);
    if (!n) continue;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  if (counts.size === 0) return "—";
  return [...counts.entries()].map(([n, q]) => (q > 1 ? `${q}x ${n}` : n)).join(" + ");
}
