"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addExpenseAction, deleteExpenseAction } from "./actions";

export interface ExpenseRow {
  id: number;
  date: string;
  category: string;
  description: string | null;
  vendor: string | null;
  amount: number;
  enteredBy: string | null;
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

export default function ExpensesManager({
  expenses,
  total,
  byCategory,
}: {
  expenses: ExpenseRow[];
  total: number;
  byCategory: { category: string; total: number }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const onAdd = async (fd: FormData) => {
    setError("");
    const res = await addExpenseAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setShowAdd(false);
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

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-military/30 bg-military/10 p-4 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
            Total recorded
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
            <input name="date" type="date" defaultValue={today} className="input" />
          </div>
          <div>
            <label className="label">Category</label>
            <select name="category" className="input" defaultValue={CATEGORIES[0]}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount ($)</label>
            <input name="amount" type="number" min={0} step="0.01" className="input" required />
          </div>
          <div>
            <label className="label">Vendor (optional)</label>
            <input name="vendor" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description (optional)</label>
            <input name="description" className="input" />
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
                <td colSpan={7} className="px-3 py-4 text-center text-charcoal/40">
                  No expenses recorded yet.
                </td>
              </tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-black/5">
                <td className="px-3 py-2">{e.date}</td>
                <td className="px-3 py-2">{e.category}</td>
                <td className="px-3 py-2">{e.description ?? "—"}</td>
                <td className="px-3 py-2">{e.vendor ?? "—"}</td>
                <td className="px-3 py-2 font-semibold text-navy">{money(e.amount)}</td>
                <td className="px-3 py-2 text-charcoal/60">{e.enteredBy ?? "—"}</td>
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
