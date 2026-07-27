"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  deleteEntryAction,
  getEntryItemsAction,
  updateEntryItemAction,
  deleteEntryItemAction,
  addEntryItemAction,
  type EntryItem,
} from "./actions";

export interface EntryRow {
  id: number;
  type: string;
  date: string;
  who: string | null;
  client: string | null;
  items: number;
  detail: string;
}

export interface CatalogItemLite {
  id: number;
  name: string;
  category: string;
}

const TYPE_LABEL: Record<string, string> = {
  stock_in: "Donation",
  stock_out: "Client Visit",
  waste: "Write-Off",
  audit: "Stock Count",
};

const TYPE_CLASS: Record<string, string> = {
  stock_in: "bg-green-100 text-green-700",
  stock_out: "bg-navy/10 text-navy",
  waste: "bg-military/10 text-military",
  audit: "bg-gold/15 text-gold",
};

export default function EntriesManager({
  entries,
  catalog,
}: {
  entries: EntryRow[];
  catalog: CatalogItemLite[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState("all");

  const [openId, setOpenId] = useState<number | null>(null);
  const [items, setItems] = useState<EntryItem[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});

  // Add-a-missed-item state (for the currently open entry).
  const [addSearch, setAddSearch] = useState("");
  const [addSelected, setAddSelected] = useState<CatalogItemLite | null>(null);
  const [addQty, setAddQty] = useState("1");

  const shown = entries.filter((e) => filter === "all" || e.type === filter);

  const resetAdd = () => {
    setAddSearch("");
    setAddSelected(null);
    setAddQty("1");
  };

  const loadItems = async (id: number) => {
    if (openId === id) return setOpenId(null);
    resetAdd();
    const rows = await getEntryItemsAction(id);
    setItems(rows);
    setDraft(Object.fromEntries(rows.map((r) => [r.id, String(r.quantity)])));
    setOpenId(id);
  };

  const refreshOpen = async () => {
    if (!openId) return;
    const rows = await getEntryItemsAction(openId);
    setItems(rows);
    setDraft(Object.fromEntries(rows.map((r) => [r.id, String(r.quantity)])));
  };

  const addItem = () => {
    if (!openId || !addSelected) return;
    const q = Math.max(1, Number(addQty) || 1);
    startTransition(async () => {
      await addEntryItemAction(openId, addSelected.id, q);
      await refreshOpen();
      resetAdd();
      router.refresh();
    });
  };

  // Deep-link: /dashboard/admin/entries?open=<transactionId> opens that entry.
  const searchParams = useSearchParams();
  useEffect(() => {
    const openParam = Number(searchParams.get("open"));
    if (openParam && entries.some((e) => e.id === openParam)) {
      loadItems(openParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches =
    addSearch.trim() === ""
      ? []
      : catalog
          .filter(
            (c) =>
              c.name.toLowerCase().includes(addSearch.toLowerCase()) ||
              c.category.toLowerCase().includes(addSearch.toLowerCase())
          )
          .slice(0, 8);

  const saveItem = (rowId: number) => {
    const v = Math.max(0, Number(draft[rowId]) || 0);
    startTransition(async () => {
      await updateEntryItemAction(rowId, v);
      if (openId) {
        const rows = await getEntryItemsAction(openId);
        setItems(rows);
        setDraft(Object.fromEntries(rows.map((r) => [r.id, String(r.quantity)])));
      }
      router.refresh();
    });
  };

  const removeItem = (rowId: number) => {
    if (!confirm("Remove this item from the entry and adjust inventory?")) return;
    startTransition(async () => {
      await deleteEntryItemAction(rowId);
      if (openId) {
        const rows = await getEntryItemsAction(openId);
        setItems(rows);
        setDraft(Object.fromEntries(rows.map((r) => [r.id, String(r.quantity)])));
        if (rows.length === 0) setOpenId(null);
      }
      router.refresh();
    });
  };

  const del = (e: EntryRow) => {
    const reversal =
      e.type === "stock_in"
        ? "remove that donated stock from inventory"
        : e.type === "stock_out"
        ? "return those items to inventory"
        : e.type === "waste"
        ? "return those items to inventory"
        : "not change inventory (it was a count)";
    if (
      !confirm(
        `Delete this ${TYPE_LABEL[e.type] ?? e.type} from ${e.date}? This will ${reversal}.`
      )
    )
      return;
    startTransition(async () => {
      await deleteEntryAction(e.id);
      router.refresh();
    });
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-navy">
        Entries &amp; Corrections
      </h1>
      <p className="mt-1 text-charcoal/70">
        Review recent activity. Click <span className="font-semibold">Edit items</span>{" "}
        on any entry to change a quantity, remove a line, or{" "}
        <span className="font-semibold">add a missed item</span> — inventory
        adjusts automatically. Deleting an entry reverses its whole effect.
      </p>

      <div className="mt-4">
        <label className="label">Show</label>
        <select
          className="input max-w-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All entries</option>
          <option value="stock_out">Client Visits</option>
          <option value="stock_in">Donations</option>
          <option value="waste">Write-Offs</option>
          <option value="audit">Stock Counts</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-navy/5 text-left text-navy">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Details</th>
              <th className="px-3 py-2">Items</th>
              <th className="px-3 py-2">By</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-charcoal/40">
                  No entries.
                </td>
              </tr>
            )}
            {shown.map((e) => (
              <Fragment key={e.id}>
                <tr className="border-t border-black/5">
                  <td className="px-3 py-2 whitespace-nowrap">{e.date}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        TYPE_CLASS[e.type] ?? "bg-black/5"
                      }`}
                    >
                      {TYPE_LABEL[e.type] ?? e.type}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {e.client ? <span className="font-medium">{e.client} · </span> : null}
                    {e.detail}
                  </td>
                  <td className="px-3 py-2">{e.items}</td>
                  <td className="px-3 py-2 text-charcoal/60">{e.who ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => loadItems(e.id)}
                        className="rounded px-2 py-1 text-xs font-semibold text-navy"
                      >
                        {openId === e.id ? "Close" : "Edit items"}
                      </button>
                      <button
                        onClick={() => del(e)}
                        className="rounded px-2 py-1 text-xs font-semibold text-military"
                      >
                        Delete &amp; reverse
                      </button>
                    </div>
                  </td>
                </tr>
                {openId === e.id && (
                  <tr className="border-t border-black/5 bg-navy/5">
                    <td colSpan={6} className="px-3 py-3">
                      <p className="mb-2 text-xs font-semibold text-navy">
                        Edit individual items — changing a quantity or removing a
                        line adjusts inventory automatically.
                      </p>
                      {items.length === 0 ? (
                        <p className="text-sm text-charcoal/50">No items.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {items.map((it) => (
                            <div
                              key={it.id}
                              className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-2 text-sm"
                            >
                              <span className="min-w-[10rem] flex-1 font-medium">
                                {it.itemName}
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={draft[it.id] ?? ""}
                                onChange={(ev) =>
                                  setDraft((d) => ({ ...d, [it.id]: ev.target.value }))
                                }
                                className="w-20 rounded-md border border-navy/20 px-2 py-1 text-center"
                              />
                              <button
                                onClick={() => saveItem(it.id)}
                                className="btn-primary px-3 py-1 text-xs"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => removeItem(it.id)}
                                className="rounded px-2 py-1 text-xs font-semibold text-military"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add a missed item */}
                      <div className="mt-3 rounded-md border border-navy/15 bg-white p-2.5">
                        <p className="mb-1.5 text-xs font-semibold text-navy">
                          Add a missed item
                          {e.type === "stock_out"
                            ? " to this visit"
                            : ""}{" "}
                          — adjusts inventory automatically.
                        </p>
                        {addSelected ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-navy/5 px-2 py-1 text-sm font-medium">
                              {addSelected.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAddSelected(null)}
                              className="text-xs font-semibold text-military"
                            >
                              change
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={addQty}
                              onChange={(ev) => setAddQty(ev.target.value)}
                              className="w-16 rounded-md border border-navy/20 px-2 py-1 text-center text-sm"
                              title="Quantity"
                            />
                            <button
                              onClick={addItem}
                              className="btn-primary px-3 py-1 text-xs"
                            >
                              + Add item
                            </button>
                          </div>
                        ) : (
                          <div>
                            <input
                              value={addSearch}
                              onChange={(ev) => setAddSearch(ev.target.value)}
                              placeholder="Search item to add…"
                              className="w-full max-w-sm rounded-md border border-navy/20 px-2 py-1 text-sm"
                            />
                            {matches.length > 0 && (
                              <div className="mt-1 max-h-40 max-w-sm overflow-y-auto rounded-md border border-black/10 bg-white">
                                {matches.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setAddSelected(m);
                                      setAddSearch("");
                                    }}
                                    className="block w-full px-2 py-1.5 text-left text-sm hover:bg-offwhite"
                                  >
                                    <span className="font-medium">{m.name}</span>{" "}
                                    <span className="text-xs text-charcoal/50">
                                      ({m.category})
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {e.type === "audit" && (
                        <p className="mt-2 text-xs text-charcoal/50">
                          Note: this is a stock count — editing these lines
                          updates the record but does not change current
                          inventory.
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
