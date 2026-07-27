"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogCategory } from "@/lib/queries";
import { submitOrderAction, clientLogoutAction, type OrderLineInput } from "../actions";
import { useUnsavedWarning } from "@/components/useUnsavedWarning";

export interface RecentOrder {
  id: number;
  status: string;
  points: number;
  date: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting the food bank",
  fulfilled: "Packed / on the way",
  cancelled: "Cancelled",
};

export default function ClientShop({
  clientName,
  clientId,
  budget,
  catalog,
  recentOrders,
}: {
  clientName: string;
  clientId: string;
  budget: number;
  catalog: CatalogCategory[];
  recentOrders: RecentOrder[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [giftCard, setGiftCard] = useState(false);
  const [giftCardDetails, setGiftCardDetails] = useState("");
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ pointsUsed: number } | null>(null);

  const itemIndex = useMemo(() => {
    const idx = new Map<number, { name: string; pointValue: number; quantity: number; category: string; shopLimit: number | null }>();
    for (const cat of catalog)
      for (const it of cat.items)
        idx.set(it.id, { name: it.name, pointValue: it.pointValue, quantity: it.quantity, category: cat.name, shopLimit: it.shopLimit });
    return idx;
  }, [catalog]);

  const pointsUsed = useMemo(() => {
    let t = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const info = itemIndex.get(Number(id));
      if (info) t += info.pointValue * qty;
    }
    return t;
  }, [cart, itemIndex]);

  const remaining = budget - pointsUsed;
  const over = remaining < 0;

  useUnsavedWarning(!done && (Object.keys(cart).length > 0 || giftCard));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
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
  }, [catalog, search]);

  const setQty = (itemId: number, qty: number) =>
    setCart((prev) => {
      const limit = itemIndex.get(itemId)?.shopLimit ?? null;
      const capped = limit != null ? Math.min(qty, limit) : qty;
      const next = { ...prev };
      if (capped <= 0) delete next[itemId];
      else next[itemId] = capped;
      return next;
    });

  const searchActive = search.trim() !== "";
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

  const submit = async () => {
    setSubmitting(true);
    setError("");
    const lines: OrderLineInput[] = Object.entries(cart).map(([id, qty]) => ({
      itemId: Number(id),
      quantity: qty,
    }));
    const res = await submitOrderAction(lines, notes, giftCard, giftCardDetails);
    if (!res.success) {
      setError(res.error || "Could not submit your order.");
      setSubmitting(false);
      return;
    }
    setDone({ pointsUsed: res.pointsUsed ?? pointsUsed });
    setSubmitting(false);
  };

  const logout = async () => {
    await clientLogoutAction();
    router.push("/portal");
    router.refresh();
  };

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="card border-l-4 border-l-green-600">
          <h1 className="font-heading text-2xl font-bold text-navy">Order Submitted ✓</h1>
          <p className="mt-2 text-charcoal/70">
            Thank you, {clientName}. Your order ({done.pointsUsed} credits) has been
            sent to the food bank. A volunteer will shop it and arrange delivery.
            You&apos;ll keep this on your file.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => { setDone(null); setCart({}); setNotes(""); setGiftCard(false); setGiftCardDetails(""); setSearch(""); router.refresh(); }} className="btn-primary">
              Start a New Order
            </button>
            <button onClick={logout} className="btn-outline">Sign Out</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">
            Welcome, {clientName}
          </h1>
          <p className="text-sm text-charcoal/60">{clientId} · Build your delivery order below</p>
        </div>
        <button onClick={logout} className="btn-outline text-sm">Sign Out</button>
      </div>

      {recentOrders.length > 0 && (
        <div className="card mt-4">
          <p className="mb-1 text-sm font-semibold text-navy">Your recent orders</p>
          <ul className="text-sm">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex justify-between border-b border-black/5 py-1 last:border-0">
                <span>{o.date} · {o.points} credits</span>
                <span className="font-semibold text-navy">{STATUS_LABEL[o.status] ?? o.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">{error}</p>
      )}

      <input
        className="input mt-4"
        placeholder="Search items…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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
        {filtered.length === 0 && (
          <p className="text-sm text-charcoal/50">No items match “{search}”.</p>
        )}
        {filtered.map((cat) => {
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
                <span className="font-heading text-lg font-bold text-navy">{cat.name}</span>
                <span className="text-sm text-charcoal/40">({cat.items.length})</span>
                {inCart > 0 && (
                  <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-white">
                    {inCart} in cart
                  </span>
                )}
              </span>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase text-gold">
                default {cat.pointValue} pt{cat.pointValue === 1 ? "" : "s"}
              </span>
            </button>
            {open && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {cat.items.map((it) => {
                const qty = cart[it.id] ?? 0;
                const out = it.quantity <= 0;
                return (
                  <div key={it.id} className={`flex items-center justify-between rounded-lg border p-2.5 ${qty > 0 ? "border-navy/40 bg-navy/5" : "border-black/5 bg-offwhite"}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-charcoal">
                        {it.name}
                        <span className="ml-2 rounded-full bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold text-navy">
                          {it.pointValue} pt{it.pointValue === 1 ? "" : "s"}
                        </span>
                      </p>
                      <p className={`text-xs ${out ? "text-military" : "text-charcoal/50"}`}>
                        {out ? "Out of stock" : `${it.quantity} available`}
                        {it.shopLimit ? ` · limit ${it.shopLimit}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setQty(it.id, qty - 1)} disabled={qty <= 0}
                        className="h-8 w-8 rounded-md bg-white text-lg font-bold text-navy shadow-sm disabled:opacity-30">−</button>
                      <span className="w-6 text-center text-sm font-bold">{qty}</span>
                      <button onClick={() => setQty(it.id, qty + 1)} disabled={out || qty >= it.quantity || (it.shopLimit != null && qty >= it.shopLimit)}
                        className="h-8 w-8 rounded-md bg-navy text-lg font-bold text-white shadow-sm disabled:opacity-30">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
          );
        })}

        <div className="card">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={giftCard}
              onChange={(e) => setGiftCard(e.target.checked)}
              className="mt-0.5 h-5 w-5"
            />
            <span className="text-sm font-semibold text-navy">
              Request a gift card
              <span className="block text-xs font-normal text-charcoal/60">
                Let the food bank know if you&apos;re hoping for a gift card with
                your order.
              </span>
            </span>
          </label>
          {giftCard && (
            <textarea
              className="input mt-3"
              rows={2}
              value={giftCardDetails}
              onChange={(e) => setGiftCardDetails(e.target.value)}
              placeholder="What are you looking for? (e.g. grocery store, gas, pharmacy)"
            />
          )}
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            ⚠️ Gift cards are not guaranteed — requests are filled only when
            available.
          </p>
        </div>

        <div className="card">
          <label className="label" htmlFor="notes">Notes for the food bank (optional)</label>
          <textarea id="notes" className="input" rows={2} value={notes}
            onChange={(e) => setNotes(e.target.value)} placeholder="e.g. delivery time preference, dietary needs" />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <div><span className="block text-xs uppercase text-charcoal/50">Used</span><span className="text-lg font-bold text-navy">{pointsUsed}</span></div>
            <div><span className="block text-xs uppercase text-charcoal/50">Budget</span><span className="text-lg font-bold text-charcoal">{budget}</span></div>
            <div><span className="block text-xs uppercase text-charcoal/50">Left</span><span className={`text-lg font-bold ${over ? "text-military" : "text-green-700"}`}>{remaining}</span></div>
          </div>
          <button onClick={submit} disabled={submitting || (pointsUsed === 0 && !giftCard) || over}
            className="btn-primary disabled:opacity-50">
            {submitting ? "Sending…" : "Submit Order"}
          </button>
        </div>
        {over && (
          <p className="bg-military/10 px-4 py-1 text-center text-xs font-semibold text-military">
            Over your credit budget by {Math.abs(remaining)} — remove some items to submit.
          </p>
        )}
      </div>
    </main>
  );
}
