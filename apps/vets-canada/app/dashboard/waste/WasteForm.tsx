"use client";

import { useMemo, useState } from "react";
import { useUnsavedWarning } from "@/components/useUnsavedWarning";
import type { CatalogCategory } from "@/lib/queries";
import { logWasteAction, type WasteLineInput } from "./actions";

const REASONS = ["Expired", "Damaged", "Spoiled", "Recalled", "Other"];

export default function WasteForm({
  catalog,
}: {
  catalog: CatalogCategory[];
}) {
  const [lines, setLines] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("Expired");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ totalItems: number } | null>(null);

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

  const totalQty = useMemo(
    () => Object.values(lines).reduce((s, n) => s + (n || 0), 0),
    [lines]
  );

  useUnsavedWarning(!done && totalQty > 0);

  const setQty = (itemId: number, qty: number, max: number) => {
    setLines((prev) => {
      const next = { ...prev };
      const clamped = Math.max(0, Math.min(qty, max));
      if (clamped <= 0) delete next[itemId];
      else next[itemId] = clamped;
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    const payload: WasteLineInput[] = Object.entries(lines)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ itemId: Number(id), quantity: q }));
    const res = await logWasteAction(payload, reason, notes);
    if (!res.success) {
      setError(res.error || "Could not save write-off.");
      setSaving(false);
      return;
    }
    setDone({ totalItems: res.totalItems ?? totalQty });
    setSaving(false);
  };

  const reset = () => {
    setLines({});
    setReason("Expired");
    setNotes("");
    setSearch("");
    setDone(null);
    setError("");
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card border-l-4 border-l-military">
          <h1 className="font-heading text-2xl font-bold text-navy">
            Write-Off Recorded ✓
          </h1>
          <p className="mt-2 text-charcoal/70">
            {done.totalItems} item{done.totalItems === 1 ? "" : "s"} removed from
            inventory.
          </p>
          <button onClick={reset} className="btn-primary mt-6 w-full">
            Record Another Write-Off
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <h1 className="font-heading text-2xl font-bold text-navy">
        Write-Off / Remove Stock
      </h1>
      <p className="mt-1 text-charcoal/70">
        Remove damaged or expired items. This deducts from inventory without a
        full recount.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="reason">
            Reason
          </label>
          <select
            id="reason"
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="search">
            Filter items
          </label>
          <input
            id="search"
            className="input"
            placeholder="Filter items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-5">
        {filtered.map((cat) => (
          <div key={cat.id} className="card">
            <h2 className="mb-3 font-heading text-lg font-bold text-navy">
              {cat.name}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {cat.items.map((it) => {
                const qty = lines[it.id] ?? 0;
                const none = it.quantity <= 0;
                return (
                  <div
                    key={it.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 ${
                      qty > 0
                        ? "border-military/40 bg-military/5"
                        : "border-black/5 bg-offwhite"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-charcoal">
                        {it.name}
                      </p>
                      <p className="text-xs text-charcoal/50">
                        {it.quantity} in stock
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setQty(it.id, qty - 1, it.quantity)}
                        disabled={qty <= 0}
                        className="h-8 w-8 rounded-md bg-white text-lg font-bold text-navy shadow-sm disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-bold">
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(it.id, qty + 1, it.quantity)}
                        disabled={none || qty >= it.quantity}
                        className="h-8 w-8 rounded-md bg-military text-lg font-bold text-white shadow-sm disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-5">
        <label className="label" htmlFor="wnotes">
          Notes (optional)
        </label>
        <textarea
          id="wnotes"
          className="input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. freezer failure, broken pallet…"
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-sm">
            <span className="font-bold text-military">{totalQty}</span> items to
            remove
          </span>
          <button
            onClick={submit}
            disabled={saving || totalQty === 0}
            className="btn-danger"
          >
            {saving ? "Saving…" : "Confirm Write-Off"}
          </button>
        </div>
      </div>
    </div>
  );
}
