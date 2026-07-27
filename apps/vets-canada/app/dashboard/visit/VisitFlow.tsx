"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CatalogCategory, ClientRecord } from "@/lib/queries";
import { useUnsavedWarning } from "@/components/useUnsavedWarning";
import {
  searchClientsAction,
  confirmVisitAction,
  getClientMonthStatusAction,
  type VisitLineInput,
  type GiftCardInput,
} from "./actions";

type Step = "search" | "build" | "done";

export default function VisitFlow({
  catalog,
  preselect,
}: {
  catalog: CatalogCategory[];
  preselect?: ClientRecord | null;
}) {
  const [step, setStep] = useState<Step>(preselect ? "build" : "search");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ClientRecord[]>([]);
  const [searching, startSearch] = useTransition();
  const [client, setClient] = useState<ClientRecord | null>(preselect ?? null);
  const [monthWarning, setMonthWarning] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Set<number>>(new Set());

  // If we arrived from an appointment with a client already chosen, run the
  // once-a-month check for them right away.
  useEffect(() => {
    if (!preselect) return;
    getClientMonthStatusAction(preselect.id).then((s) => {
      if (s.shoppedThisMonth) {
        setMonthWarning(
          `${preselect.name} has already shopped this month${
            s.lastVisit ? ` (last visit ${s.lastVisit})` : ""
          }. Families get one visit per month — confirm only if a manager approves.`
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cart: itemId -> quantity
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [giftCards, setGiftCards] = useState<{ store: string; amount: string }[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<{
    pointsUsed: number;
    lines: { name: string; qty: number; points: number }[];
    giftCards: { store: string; amount: number }[];
  } | null>(null);

  const addGiftCard = () =>
    setGiftCards((g) => [...g, { store: "", amount: "" }]);
  const updateGiftCard = (i: number, patch: Partial<{ store: string; amount: string }>) =>
    setGiftCards((g) => g.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeGiftCard = (i: number) =>
    setGiftCards((g) => g.filter((_, idx) => idx !== i));

  // Map itemId -> { name, pointValue, quantity, categoryName }
  const itemIndex = useMemo(() => {
    const idx = new Map<
      number,
      {
        name: string;
        pointValue: number;
        quantity: number;
        category: string;
        shopLimit: number | null;
      }
    >();
    for (const cat of catalog) {
      for (const it of cat.items) {
        idx.set(it.id, {
          name: it.name,
          pointValue: it.pointValue,
          quantity: it.quantity,
          category: cat.name,
          shopLimit: it.shopLimit,
        });
      }
    }
    return idx;
  }, [catalog]);

  const pointsUsed = useMemo(() => {
    let total = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const info = itemIndex.get(Number(id));
      if (info) total += info.pointValue * qty;
    }
    return total;
  }, [cart, itemIndex]);

  const budget = client?.pointBudget ?? 0;
  const remaining = budget - pointsUsed;
  const overBudget = remaining < 0;

  const hasCartWork =
    Object.keys(cart).length > 0 ||
    giftCards.some((g) => g.store.trim() !== "" || Number(g.amount) > 0);
  useUnsavedWarning(step === "build" && !summary && hasCartWork);

  const filteredCatalog = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [catalog, itemSearch]);

  const doSearch = (value: string) => {
    setTerm(value);
    startSearch(async () => {
      const r = await searchClientsAction(value);
      setResults(r);
    });
  };

  const setQty = (itemId: number, qty: number) => {
    const limit = itemIndex.get(itemId)?.shopLimit ?? null;
    const capped = limit != null ? Math.min(qty, limit) : qty;
    setCart((prev) => {
      const next = { ...prev };
      if (capped <= 0) delete next[itemId];
      else next[itemId] = capped;
      return next;
    });
  };

  const searchActive = itemSearch.trim() !== "";
  const isOpen = (id: number) => searchActive || openCats.has(id);
  const toggleCat = (id: number) =>
    setOpenCats((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const expandAll = () => setOpenCats(new Set(catalog.map((c) => c.id)));
  const collapseAll = () => setOpenCats(new Set());

  const confirm = async () => {
    if (!client) return;
    setConfirming(true);
    setError("");
    const lines: VisitLineInput[] = Object.entries(cart).map(([id, qty]) => ({
      itemId: Number(id),
      quantity: qty,
    }));
    const cards: GiftCardInput[] = giftCards
      .filter((g) => g.store.trim() !== "" || Number(g.amount) > 0)
      .map((g) => ({ store: g.store.trim(), amount: Number(g.amount) || 0 }));
    const res = await confirmVisitAction(client.id, lines, notes, cards);
    if (!res.success) {
      setError(res.error || "Could not save visit.");
      setConfirming(false);
      return;
    }
    setSummary({
      pointsUsed: res.pointsUsed ?? pointsUsed,
      lines: lines.map((l) => {
        const info = itemIndex.get(l.itemId);
        return {
          name: info ? `${info.category} — ${info.name}` : `Item ${l.itemId}`,
          qty: l.quantity,
          points: (info?.pointValue ?? 0) * l.quantity,
        };
      }),
      giftCards: cards,
    });
    setStep("done");
    setConfirming(false);
  };

  const reset = () => {
    setStep("search");
    setTerm("");
    setResults([]);
    setClient(null);
    setCart({});
    setNotes("");
    setGiftCards([]);
    setItemSearch("");
    setSummary(null);
    setError("");
    setMonthWarning(null);
  };

  // ---------------------------------------------------------------- search
  if (step === "search") {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-heading text-2xl font-bold text-navy">
          Client Visit
        </h1>
        <p className="mt-1 text-charcoal/70">
          Search for a client by name or client ID.
        </p>
        <input
          autoFocus
          className="input mt-4"
          placeholder="e.g. VET-0042 or Jane Smith"
          value={term}
          onChange={(e) => doSearch(e.target.value)}
        />
        <div className="mt-4 space-y-2">
          {searching && (
            <p className="text-sm text-charcoal/50">Searching…</p>
          )}
          {!searching && term && results.length === 0 && (
            <p className="text-sm text-charcoal/50">No clients found.</p>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setClient(c);
                setStep("build");
                setMonthWarning(null);
                getClientMonthStatusAction(c.id).then((s) => {
                  if (s.shoppedThisMonth) {
                    setMonthWarning(
                      `${c.name} has already shopped this month${
                        s.lastVisit ? ` (last visit ${s.lastVisit})` : ""
                      }. Families get one visit per month — confirm only if a manager approves.`
                    );
                  }
                });
              }}
              className="flex w-full items-center justify-between rounded-lg border border-black/5 bg-white p-4 text-left shadow-sm transition hover:border-navy/30"
            >
              <span>
                <span className="block font-semibold text-navy">{c.name}</span>
                <span className="text-sm text-charcoal/60">
                  {c.clientId} · Family of {c.familySize}
                </span>
              </span>
              <span className="rounded-full bg-navy/10 px-3 py-1 text-sm font-semibold text-navy">
                {c.pointBudget} pts
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ done
  if (step === "done" && summary && client) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card border-l-4 border-l-green-600">
          <h1 className="font-heading text-2xl font-bold text-navy">
            Visit Recorded ✓
          </h1>
          <p className="mt-1 text-charcoal/70">
            {client.name} ({client.clientId})
          </p>
          <div className="mt-4 divide-y divide-black/5">
            {summary.lines.map((l, i) => (
              <div key={i} className="flex justify-between py-2 text-sm">
                <span>
                  {l.qty} × {l.name}
                </span>
                <span className="font-semibold text-navy">{l.points} pts</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-black/10 pt-3">
            <span className="font-semibold">Total points used</span>
            <span className="font-bold text-navy">{summary.pointsUsed}</span>
          </div>
          {summary.giftCards.length > 0 && (
            <div className="mt-3 border-t border-black/10 pt-3">
              <p className="text-sm font-semibold text-navy">Gift cards given</p>
              {summary.giftCards.map((g, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span>{g.store || "Gift card"}</span>
                  <span className="font-semibold text-navy">
                    {g.amount.toLocaleString("en-CA", { style: "currency", currency: "CAD" })}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button onClick={reset} className="btn-primary mt-6 w-full">
            New Visit
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------- build
  return (
    <div className="pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">
            {client?.name}
          </h1>
          <p className="text-sm text-charcoal/60">
            {client?.clientId} · Family of {client?.familySize}
          </p>
        </div>
        <button onClick={reset} className="btn-outline">
          Change Client
        </button>
      </div>

      {monthWarning && (
        <p className="mt-4 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800">
          ⚠️ {monthWarning}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">
          {error}
        </p>
      )}

      <input
        className="input mt-4"
        placeholder="Search items…"
        value={itemSearch}
        onChange={(e) => setItemSearch(e.target.value)}
      />

      {!searchActive && (
        <div className="mt-3 flex gap-2">
          <button onClick={expandAll} className="btn-outline text-sm">Expand all</button>
          <button onClick={collapseAll} className="btn-outline text-sm">Collapse all</button>
          <span className="self-center text-xs text-charcoal/50">
            Tap a category to open it.
          </span>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {filteredCatalog.length === 0 && (
          <p className="text-sm text-charcoal/50">No items match “{itemSearch}”.</p>
        )}
        {filteredCatalog.map((cat) => {
          const open = isOpen(cat.id);
          const inCart = cat.items.reduce((n, it) => n + (cart[it.id] ? 1 : 0), 0);
          return (
          <div key={cat.id} className="card">
            <button
              type="button"
              onClick={() => toggleCat(cat.id)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2">
                <span className="w-3 text-charcoal/50">{open ? "▾" : "▸"}</span>
                <span className="font-heading text-lg font-bold text-navy">
                  {cat.name}
                </span>
                <span className="text-sm text-charcoal/40">({cat.items.length})</span>
                {inCart > 0 && (
                  <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-white">
                    {inCart} in cart
                  </span>
                )}
              </span>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gold">
                default {cat.pointValue} pt{cat.pointValue === 1 ? "" : "s"}
              </span>
            </button>
            {open && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {cat.items.map((it) => {
                const qty = cart[it.id] ?? 0;
                const out = it.quantity <= 0;
                return (
                  <div
                    key={it.id}
                    className={`flex items-center justify-between rounded-lg border p-2.5 ${
                      qty > 0
                        ? "border-navy/40 bg-navy/5"
                        : "border-black/5 bg-offwhite"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-charcoal">
                        {it.name}
                        <span className="ml-2 rounded-full bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold text-navy">
                          {it.pointValue} pt{it.pointValue === 1 ? "" : "s"}
                        </span>
                      </p>
                      <p
                        className={`text-xs ${
                          out ? "text-military" : "text-charcoal/50"
                        }`}
                      >
                        {out ? "Out of stock" : `${it.quantity} in stock`}
                        {it.shopLimit ? ` · limit ${it.shopLimit}/visit` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setQty(it.id, qty - 1)}
                        disabled={qty <= 0}
                        className="h-8 w-8 rounded-md bg-white text-lg font-bold text-navy shadow-sm disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-bold">
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(it.id, qty + 1)}
                        disabled={it.shopLimit != null && qty >= it.shopLimit}
                        className="h-8 w-8 rounded-md bg-navy text-lg font-bold text-white shadow-sm disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
          );
        })}

        {/* Gift cards given */}
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-navy">
              Gift Cards Given
            </h2>
            <button onClick={addGiftCard} className="btn-outline text-sm">
              + Add Gift Card
            </button>
          </div>
          {giftCards.length === 0 ? (
            <p className="text-sm text-charcoal/50">
              None. Add one if a gift card was given to this client.
            </p>
          ) : (
            <div className="space-y-2">
              {giftCards.map((g, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    className="input flex-1 min-w-[10rem]"
                    placeholder="Store (e.g. Superstore, Walmart)"
                    value={g.store}
                    onChange={(e) => updateGiftCard(i, { store: e.target.value })}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-charcoal/50">$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input w-28"
                      placeholder="Amount"
                      value={g.amount}
                      onChange={(e) => updateGiftCard(i, { amount: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={() => removeGiftCard(i)}
                    className="rounded px-2 py-1 text-sm font-semibold text-military"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <label className="label" htmlFor="notes">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. manager approved extra items"
          />
        </div>
      </div>

      {/* Sticky points bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="block text-xs uppercase text-charcoal/50">
                Used
              </span>
              <span className="text-lg font-bold text-navy">{pointsUsed}</span>
            </div>
            <div>
              <span className="block text-xs uppercase text-charcoal/50">
                Budget
              </span>
              <span className="text-lg font-bold text-charcoal">{budget}</span>
            </div>
            <div>
              <span className="block text-xs uppercase text-charcoal/50">
                Remaining
              </span>
              <span
                className={`text-lg font-bold ${
                  overBudget ? "text-military" : "text-green-700"
                }`}
              >
                {remaining}
              </span>
            </div>
          </div>
          <button
            onClick={confirm}
            disabled={
              confirming ||
              (pointsUsed === 0 &&
                !giftCards.some((g) => g.store.trim() !== "" || Number(g.amount) > 0))
            }
            className={overBudget ? "btn-danger" : "btn-primary"}
          >
            {confirming
              ? "Saving…"
              : overBudget
              ? "Confirm (Over Budget)"
              : "Confirm Visit"}
          </button>
        </div>
        {overBudget && (
          <p className="bg-military/10 px-4 py-1 text-center text-xs font-semibold text-military">
            Over budget by {Math.abs(remaining)} points — confirm only if a
            manager approved extras.
          </p>
        )}
      </div>
    </div>
  );
}
