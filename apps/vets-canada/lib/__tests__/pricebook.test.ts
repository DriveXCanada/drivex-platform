import { describe, it, expect } from "vitest";
import { average, matchPrices, type StorePrice } from "../pricebook";

const sp = (store: string, price: number): StorePrice => ({ store, price });

describe("average", () => {
  it("is zero for no prices", () => {
    expect(average([])).toBe(0);
  });

  it("averages and rounds to two decimals", () => {
    expect(average([sp("A", 1), sp("B", 2)])).toBe(1.5);
    expect(average([sp("A", 1), sp("B", 1), sp("C", 2)])).toBe(1.33);
    expect(average([sp("A", 0.1), sp("B", 0.2)])).toBe(0.15);
  });

  it("handles a single price", () => {
    expect(average([sp("A", 3.499)])).toBe(3.5);
  });
});

describe("matchPrices", () => {
  it('never matches the placeholder item "Other"', () => {
    expect(matchPrices("Canned Goods", "Other")).toBeNull();
    expect(matchPrices("Anything", "  other  ")).toBeNull();
  });

  it("returns null when there is no confident match", () => {
    expect(
      matchPrices("Zzzqqq Nonsense", "Wuxyzzy Gibberish Nomatch")
    ).toBeNull();
  });

  it("returns store prices (or null) but never throws on real-looking input", () => {
    const result = matchPrices("Pasta & Sauce", "Spaghetti");
    expect(result === null || Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      for (const p of result) {
        expect(typeof p.store).toBe("string");
        expect(typeof p.price).toBe("number");
      }
    }
  });
});
