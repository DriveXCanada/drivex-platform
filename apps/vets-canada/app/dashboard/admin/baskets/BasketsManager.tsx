"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addBasketAction,
  deleteBasketAction,
  getClientBasketsAction,
  type HolidayBasket,
} from "../clients/actions";
import { getAllBasketsAction } from "./actions";
import { HOLIDAYS } from "@/lib/holidays";

interface ClientOption {
  id: number;
  clientId: string;
  name: string;
}

export default function BasketsManager({
  clients,
  baskets: initialBaskets,
}: {
  clients: ClientOption[];
  baskets: HolidayBasket[];
}) {
  const router = useRouter();
  const [baskets, setBaskets] = useState<HolidayBasket[]>(initialBaskets);
  const [error, setError] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<number | "">("");

  const [filterHoliday, setFilterHoliday] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [search, setSearch] = useState("");

  const years = useMemo(() => {
    const set = new Set<number>();
    baskets.forEach((b) => set.add(b.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [baskets]);

  const matchingClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.clientId.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [clients, clientSearch]);

  const filtered = baskets.filter((b) => {
    if (filterHoliday && b.holiday !== filterHoliday) return false;
    if (filterYear && String(b.year) !== filterYear) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !b.clientName.toLowerCase().includes(q) &&
        !b.clientCode.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const refresh = async () => {
    setBaskets(await getAllBasketsAction());
    router.refresh();
  };

  const onLog = async (fd: FormData) => {
    setError("");
    if (!selectedClient) return setError("Pick a client first.");
    fd.set("clientId", String(selectedClient));
    const res = await addBasketAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setClientSearch("");
    setSelectedClient("");
    await refresh();
  };

  const remove = async (id: number) => {
    if (!confirm("Remove this holiday basket record?")) return;
    await deleteBasketAction(id);
    await refresh();
  };

  const selectedName = selectedClient
    ? clients.find((c) => c.id === selectedClient)
    : null;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-navy">
        Holiday Baskets
      </h1>
      <p className="mt-1 text-charcoal/70">
        Log and track holiday baskets given to clients — Easter, Christmas, Back
        to School, Thanksgiving and more. You can also log baskets from a
        client&apos;s profile under <span className="font-semibold">Clients → 🎁 Baskets</span>.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">
          {error}
        </p>
      )}

      {/* Log a basket */}
      <form action={onLog} className="card mt-4 grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label">Client</label>
          {selectedName ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-navy/20 bg-navy/5 px-3 py-2.5">
              <span className="text-sm font-semibold text-navy">
                {selectedName.name}{" "}
                <span className="font-normal text-charcoal/50">
                  ({selectedName.clientId})
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedClient("");
                  setClientSearch("");
                }}
                className="text-xs font-semibold text-military"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                className="input"
                placeholder="Search client by name or ID…"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
              {clientSearch && (
                <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-black/10 bg-white">
                  {matchingClients.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-charcoal/50">
                      No matches.
                    </p>
                  ) : (
                    matchingClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c.id);
                          setClientSearch("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-offwhite"
                      >
                        <span className="font-medium">{c.name}</span>{" "}
                        <span className="text-charcoal/50">({c.clientId})</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div>
          <label className="label">Holiday</label>
          <select name="holiday" className="input" defaultValue="" required>
            <option value="" disabled>
              Choose…
            </option>
            {HOLIDAYS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <input
            name="year"
            type="number"
            className="input"
            defaultValue={new Date().getFullYear()}
          />
        </div>
        <div className="sm:col-span-4">
          <input name="notes" placeholder="Notes (optional)" className="input" />
        </div>
        <div className="sm:col-span-4">
          <button className="btn-primary">+ Log Basket Given</button>
        </div>
      </form>

      {/* Filters */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <select
          className="input"
          value={filterHoliday}
          onChange={(e) => setFilterHoliday(e.target.value)}
        >
          <option value="">All holidays</option>
          {HOLIDAYS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Search client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="mt-3 text-sm text-charcoal/60">
        {filtered.length} basket{filtered.length === 1 ? "" : "s"}
        {filterHoliday ? ` · ${filterHoliday}` : ""}
        {filterYear ? ` · ${filterYear}` : ""}
      </p>

      <div className="mt-2 space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-charcoal/50">No baskets match.</p>
        )}
        {filtered.map((b) => (
          <div
            key={b.id}
            className="card flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-semibold text-navy">
                {b.holiday} {b.year}
              </p>
              <p className="text-sm text-charcoal/60">
                {b.clientName}{" "}
                <span className="text-charcoal/40">({b.clientCode})</span> · given{" "}
                {b.givenAt}
                {b.givenBy ? ` · by ${b.givenBy}` : ""}
              </p>
              {b.notes && (
                <p className="text-xs text-charcoal/50">{b.notes}</p>
              )}
            </div>
            <button
              onClick={() => remove(b.id)}
              className="rounded-lg border border-military/40 px-3 py-1.5 text-sm font-semibold text-military hover:bg-military/5"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
