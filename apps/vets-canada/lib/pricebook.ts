import { PRICE_BOOK, type PriceBookEntry } from "./pricebook-data";

export interface StorePrice {
  store: string;
  price: number;
}

const STOP = new Set(
  "the a of and to in for with from large small can canned box cups cup pack 1kg g ml l other size".split(
    " "
  )
);

/** Tokenize a name into a deduped array of significant words. */
function toks(s: string): string[] {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  const out: string[] = [];
  for (const t of cleaned.split(/\s+/)) {
    if (t && t.length > 2 && !STOP.has(t) && out.indexOf(t) === -1) out.push(t);
  }
  return out;
}

const BOOK = PRICE_BOOK.map((e: PriceBookEntry) => ({
  entry: e,
  t: toks(e.name),
}));

/**
 * Best-effort match of a catalog (category, item) to a price-book row.
 * Returns the matched store prices, or null if no confident match.
 */
export function matchPrices(
  categoryName: string,
  itemName: string
): StorePrice[] | null {
  if (itemName.trim().toLowerCase() === "other") return null;
  const ct = toks(categoryName);
  let it = toks(itemName);
  if (it.length === 0) it = ct;
  const target: string[] = [];
  for (const w of ct) if (target.indexOf(w) === -1) target.push(w);
  for (const w of it) if (target.indexOf(w) === -1) target.push(w);

  let best: { prices: StorePrice[]; score: number } | null = null;
  for (const { entry, t } of BOOK) {
    // The item's own words must overlap the price-book name.
    const itemOverlap = it.some((w) => t.indexOf(w) !== -1);
    if (!itemOverlap) continue;
    let score = 0;
    for (const w of target) if (t.indexOf(w) !== -1) score += 1;
    if (!best || score > best.score) best = { prices: entry.prices, score };
  }
  if (best && best.score >= 2) return best.prices;
  return null;
}

export function average(prices: StorePrice[]): number {
  if (prices.length === 0) return 0;
  const sum = prices.reduce((s, p) => s + p.price, 0);
  return Math.round((sum / prices.length) * 100) / 100;
}
