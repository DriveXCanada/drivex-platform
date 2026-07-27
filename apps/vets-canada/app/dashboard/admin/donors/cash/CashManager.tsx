"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCashDonationAction, deleteCashDonationAction } from "./actions";

export interface CashRow {
  id: number;
  method: string;
  amount: number;
  giftCardStore: string | null;
  date: string;
  donor: string | null;
  notes: string | null;
  recordedBy: string | null;
  taxReceiptNeeded: boolean;
}
export interface DonorOption {
  id: number;
  name: string;
}

const METHODS = ["Cash", "E-transfer", "Gift Card", "Cheque", "Other"];
const money = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export default function CashManager({
  donations,
  byMethod,
  total,
  donors,
}: {
  donations: CashRow[];
  byMethod: { method: string; total: number }[];
  total: number;
  donors: DonorOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("Cash");
  const [donorChoice, setDonorChoice] = useState("");
  const [taxReceipt, setTaxReceipt] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const onAdd = async (fd: FormData) => {
    setError("");
    const res = await addCashDonationAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setShowAdd(false);
    setMethod("Cash");
    setDonorChoice("");
    setTaxReceipt(false);
    router.refresh();
  };
  const del = (id: number) => {
    if (!confirm("Delete this donation record?")) return;
    startTransition(async () => {
      await deleteCashDonationAction(id);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-navy">
          Cash &amp; Gift Card Donations
        </h1>
        <div className="flex gap-2">
          <Link href="/dashboard/admin/donors" className="btn-outline text-sm">
            ← Donor Registry
          </Link>
          <button onClick={() => setShowAdd((s) => !s)} className="btn-primary">
            {showAdd ? "Cancel" : "+ Add Donation"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
            Total received
          </p>
          <p className="text-3xl font-bold text-navy">{money(total)}</p>
        </div>
        <div className="card sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal/60">By type</p>
          {byMethod.length === 0 ? (
            <p className="text-sm text-charcoal/40">Nothing recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {byMethod.map((m) => (
                <span key={m.method} className="rounded-full bg-offwhite px-3 py-1 text-sm">
                  {m.method}: <span className="font-semibold text-navy">{money(m.total)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">{error}</p>
      )}

      {showAdd && (
        <form action={onAdd} className="card mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Date</label>
            <input name="date" type="date" defaultValue={today} className="input" />
          </div>
          <div>
            <label className="label">Type</label>
            <select name="method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount ($)</label>
            <input name="amount" type="number" min={0} step="0.01" className="input" required />
          </div>
          {method === "Gift Card" && (
            <div>
              <label className="label">Gift card store</label>
              <input name="giftCardStore" className="input" placeholder="e.g. Superstore, Walmart" />
            </div>
          )}
          <div>
            <label className="label">Donor (optional)</label>
            <select name="donorChoice" className="input" value={donorChoice} onChange={(e) => setDonorChoice(e.target.value)}>
              <option value="">— Anonymous / no donor —</option>
              {donors.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              <option value="new">+ Add a new donor…</option>
            </select>
            {donorChoice === "new" && (
              <input name="newDonorName" className="input mt-2" placeholder="New donor name" />
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes (optional)</label>
            <input name="notes" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2.5">
              <input
                type="checkbox"
                name="taxReceipt"
                checked={taxReceipt}
                onChange={(e) => setTaxReceipt(e.target.checked)}
                className="h-5 w-5"
              />
              <span className="text-sm font-semibold text-navy">Tax receipt needed</span>
            </label>
          </div>
          {taxReceipt && (
            <>
              <div className="sm:col-span-2">
                <label className="label">Receipt contact (name / phone / email)</label>
                <input name="receiptContact" className="input" placeholder="For the receipt" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Mailing address (for the receipt)</label>
                <input name="receiptAddress" className="input" placeholder="Street, City, Province, Postal Code" />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <button className="btn-primary w-full">Save Donation</button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-navy/5 text-left text-navy">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Donor</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">By</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-charcoal/40">No donations recorded yet.</td></tr>
            )}
            {donations.map((c) => (
              <tr key={c.id} className="border-t border-black/5">
                <td className="px-3 py-2 whitespace-nowrap">{c.date}</td>
                <td className="px-3 py-2">
                  {c.method}
                  {c.method === "Gift Card" && c.giftCardStore ? ` (${c.giftCardStore})` : ""}
                </td>
                <td className="px-3 py-2 font-semibold text-navy">{money(c.amount)}</td>
                <td className="px-3 py-2">{c.donor ?? "Anonymous"}</td>
                <td className="px-3 py-2 text-charcoal/60">{c.notes ?? "—"}</td>
                <td className="px-3 py-2 text-charcoal/60">
                  {c.recordedBy ?? "—"}
                  {c.taxReceiptNeeded && (
                    <span className="ml-1 rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                      receipt
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/admin/donors/cash/${c.id}/receipt`}
                      className="rounded px-2 py-1 text-xs font-semibold text-navy"
                    >
                      🧾 Receipt
                    </Link>
                    <button onClick={() => del(c.id)} className="rounded px-2 py-1 text-xs font-semibold text-military">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
