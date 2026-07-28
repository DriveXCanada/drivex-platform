"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addExpenseAction,
  deleteExpenseAction,
  setMonthlyBudgetAction,
} from "./actions";

export interface ExpenseRow {
  id: number;
  date: string;
  category: string;
  description: string | null;
  vendor: string | null;
  amount: number;
  isFood: boolean;
  enteredBy: string | null;
}

export interface ItemOption {
  id: number;
  name: string;
  category: string;
}

interface FoodLine {
  itemId: number;
  name: string;
  quantity: number;
}

const CATEGORIES = [
  "Food Purchase",
  "Rent / Utilities",
  "Supplies",
  "Equipment",
  "Transportation / Fuel",
  "Maintenance",
  "Admin / Office",
  "Other",
];

const money = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

const monthName = new Date().toLocaleDateString("en-CA", {
  month: "long",
  year: "numeric",
});

export default function ExpensesManager({
  expenses,
  total,
  byCategory,
  monthSpent,
  budget,
  items,
}: {
  expenses: ExpenseRow[];
  total: number;
  byCategory: { category: string; total: number }[];
  monthSpent: number;
  budget: number;
  items: ItemOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  // Budget editing
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(budget || ""));
  const [savingBudget, setSavingBudget] = useState(false);

  // Food-for-pantry state
  const [isFood, setIsFood] = useState(false);
  const [foodLines, setFoodLines] = useState<FoodLine[]>([]);
  const [pickId, setPickId] = useState("");
  const [pickQty, setPickQty] = useState("1");
  const [itemSearch, setItemSearch] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const remaining = budget - monthSpent;
  const overBudget = budget > 0 && remaining < 0;

  // Filter + group items for the picker (there can be ~1,000+).
  const groupedItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q)
        )
      : items;
    const map = new Map<string, ItemOption[]>();
    for (const it of filtered) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category)!.push(it);
    }
    return Array.from(map.entries());
  }, [items, itemSearch]);

  const addFoodLine = () => {
    const id = Number(pickId);
    const qty = Math.max(1, Math.floor(Number(pickQty) || 1));
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setFoodLines((prev) => {
      const existing = prev.find((l) => l.itemId === id);
      if (existing) {
        return prev.map((l) =>
          l.itemId === id ? { ...l, quantity: l.quantity + qty } : l
        );
      }
      return [...prev, { itemId: id, name: item.name, quantity: qty }];
    });
    setPickId("");
    setPickQty("1");
    setItemSearch("");
  };

  const removeFoodLine = (id: number) =>
    setFoodLines((prev) => prev.filter((l) => l.itemId !== id));

  const resetForm = () => {
    setShowAdd(false);
    setIsFood(false);
    setFoodLines([]);
    setPickId("");
    setPickQty("1");
    setItemSearch("");
  };

  const onAdd = async (fd: FormData) => {
    setError("");
    fd.set("is_food", isFood ? "1" : "");
    fd.set(
      "foodItems",
      JSON.stringify(
        foodLines.map((l) => ({ itemId: l.itemId, quantity: l.quantity }))
      )
    );
    const res = await addExpenseAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    resetForm();
    router.refresh();
  };

  const saveBudget = async () => {
    setSavingBudget(true);
    await setMonthlyBudgetAction(Number(budgetInput) || 0);
    setSavingBudget(false);
    setEditingBudget(false);
    router.refresh();
  };

  const del = (id: number) => {
    if (!confirm("Delete this expense?")) return;
    startTransition(async () => {
      await deleteExpenseAction(id);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-navy">Expenses</h1>
        <button onClick={() => setShowAdd((s) => !s)} className="btn-primary">
          {showAdd ? "Cancel" : "+ Add Expense"}
        </button>
      </div>

      {/* Monthly budget */}
      <div className="mt-4 rounded-xl border border-navy/20 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold text-navy">
            Monthly Budget — {monthName}
          </h2>
          {!editingBudget && (
            <button
              onClick={() => {
                setBudgetInput(String(budget || ""));
                setEditingBudget(true);
              }}
              className="text-sm font-semibold text-navy underline"
            >
              {budget > 0 ? "Edit budget" : "Set budget"}
            </button>
          )}
        </div>

        {editingBudget ? (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="label">Monthly budget ($)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="input"
                autoFocus
              />
            </div>
            <button
              onClick={saveBudget}
              disabled={savingBudget}
              className="btn-primary"
            >
              {savingBudget ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditingBudget(false)}
              className="btn-outline"
            >
              Cancel
            </button>
          </div>
        ) : budget > 0 ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-bold text-navy">{money(budget)}</p>
              <p className="text-sm text-charcoal/60">Budget</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-navy">{money(monthSpent)}</p>
              <p className="text-sm text-charcoal/60">Spent this month</p>
            </div>
            <div>
              <p
                className={`text-2xl font-bold ${
                  overBudget ? "text-military" : "text-green-700"
                }`}
              >
                {money(remaining)}
              </p>
              <p className="text-sm text-charcoal/60">
                {overBudget ? "Over budget" : "Remaining"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-charcoal/60">
            No monthly budget set yet. Set one to track how much is left each
            month.
          </p>
        )}
      </div>

      {/* Totals */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-military/30 bg-military/10 p-4 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
            Total recorded (all time)
          </p>
          <p className="text-3xl font-bold text-navy">{money(total)}</p>
        </div>
        <div className="card sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal/60">
            By category
          </p>
          {byCategory.length === 0 ? (
            <p className="text-sm text-charcoal/40">No expenses yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {byCategory.map((c) => (
                <span
                  key={c.category}
                  className="rounded-full bg-offwhite px-3 py-1 text-sm"
                >
                  {c.category}:{" "}
                  <span className="font-semibold text-navy">
                    {money(c.total)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">
          {error}
        </p>
      )}

      {showAdd && (
        <form action={onAdd} className="card mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Date</label>
            <input
              name="date"
              type="date"
              defaultValue={today}
              className="input"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              name="category"
              className="input"
              defaultValue={CATEGORIES[0]}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount ($)</label>
            <input
              name="amount"
              type="number"
              min={0}
              step="0.01"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Vendor (optional)</label>
            <input name="vendor" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description (optional)</label>
            <input name="description" className="input" />
          </div>

          {/* Food for the pantry */}
          <div className="sm:col-span-2 rounded-lg border border-navy/10 bg-navy/5 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-navy">
              <input
                type="checkbox"
                checked={isFood}
                onChange={(e) => setIsFood(e.target.checked)}
                className="h-4 w-4"
              />
              🍎 This expense is food for the pantry
            </label>

            {isFood && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-charcoal/60">
                  Choose the items you bought and the quantity. These are added
                  to your inventory and tracked as food bought out of pocket.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[160px] flex-1">
                    <label className="label">Search items</label>
                    <input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Type to filter…"
                      className="input"
                    />
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <label className="label">Item</label>
                    <select
                      value={pickId}
                      onChange={(e) => setPickId(e.target.value)}
                      className="input"
                    >
                      <option value="">Select an item…</option>
                      {groupedItems.map(([cat, list]) => (
                        <optgroup key={cat} label={cat}>
                          {list.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="label">Qty</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={pickQty}
                      onChange={(e) => setPickQty(e.target.value)}
                      className="input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addFoodLine}
                    className="btn-outline"
                  >
                    Add item
                  </button>
                </div>

                {foodLines.length > 0 && (
                  <ul className="divide-y divide-black/5 rounded-lg border border-black/5 bg-white">
                    {foodLines.map((l) => (
                      <li
                        key={l.itemId}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span>
                          <span className="font-medium">{l.name}</span> ×{" "}
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFoodLine(l.itemId)}
                          className="text-xs font-semibold text-military"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <button className="btn-primary w-full">Save Expense</button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-navy/5 text-left text-navy">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">By</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center text-charcoal/40"
                >
                  No expenses recorded yet.
                </td>
              </tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-black/5">
                <td className="px-3 py-2">{e.date}</td>
                <td className="px-3 py-2">
                  {e.category}
                  {e.isFood && (
                    <span className="ml-1" title="Food for the pantry">
                      🍎
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{e.description ?? "—"}</td>
                <td className="px-3 py-2">{e.vendor ?? "—"}</td>
                <td className="px-3 py-2 font-semibold text-navy">
                  {money(e.amount)}
                </td>
                <td className="px-3 py-2 text-charcoal/60">
                  {e.enteredBy ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => del(e.id)}
                    className="rounded px-2 py-1 text-xs font-semibold text-military"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
