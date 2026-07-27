"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WEIGHT_UNIT } from "@/lib/units";
import {
  createDonorAction,
  updateDonorAction,
  toggleDonorActiveAction,
  deleteDonorAction,
} from "./actions";

export interface DonorRow {
  id: number;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  items: number;
  value: number;
  weight: number;
  lastDonation: string | null;
}

const money = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

function DonorFields({ d }: { d?: DonorRow }) {
  return (
    <>
      <div className="sm:col-span-2">
        <label className="label">Donor Name</label>
        <input name="name" defaultValue={d?.name ?? ""} className="input" required />
      </div>
      <div>
        <label className="label">Contact</label>
        <input name="contact" defaultValue={d?.contact ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" defaultValue={d?.email ?? ""} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Address</label>
        <input name="address" defaultValue={d?.address ?? ""} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Notes</label>
        <input name="notes" defaultValue={d?.notes ?? ""} className="input" />
      </div>
    </>
  );
}

export default function DonorsManager({ donors }: { donors: DonorRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const filtered = donors.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const onAdd = async (fd: FormData) => {
    setError("");
    const res = await createDonorAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setShowAdd(false);
    router.refresh();
  };
  const onEdit = async (fd: FormData) => {
    setError("");
    const res = await updateDonorAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setEditId(null);
    router.refresh();
  };
  const toggle = (id: number, active: boolean) =>
    startTransition(async () => {
      await toggleDonorActiveAction(id, active);
      router.refresh();
    });
  const del = (d: DonorRow) => {
    if (!confirm(`Delete donor ${d.name}? Donation history is kept but no longer linked.`)) return;
    startTransition(async () => {
      await deleteDonorAction(d.id);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-navy">Donors</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/admin/donors/cash" className="btn-outline">
            💵 Cash &amp; Gift Cards
          </Link>
          <button onClick={() => setShowAdd((s) => !s)} className="btn-primary">
            {showAdd ? "Cancel" : "+ Add Donor"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">{error}</p>
      )}

      {showAdd && (
        <form action={onAdd} className="card mt-4 grid gap-3 sm:grid-cols-2">
          <DonorFields />
          <div className="sm:col-span-2">
            <button className="btn-primary w-full">Save Donor</button>
          </div>
        </form>
      )}

      <input
        className="input mt-4"
        placeholder="Search donors…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-4 space-y-2">
        {filtered.length === 0 && <p className="text-sm text-charcoal/50">No donors.</p>}
        {filtered.map((d) => (
          <div key={d.id} className="card">
            {editId === d.id ? (
              <form action={onEdit} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={d.id} />
                <DonorFields d={d} />
                <div className="flex items-end gap-2 sm:col-span-2">
                  <button className="btn-primary">Save</button>
                  <button type="button" onClick={() => setEditId(null)} className="btn-outline">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy">
                    {d.name}
                    {!d.isActive && (
                      <span className="ml-2 rounded bg-charcoal/10 px-2 py-0.5 text-xs text-charcoal/60">inactive</span>
                    )}
                  </p>
                  <p className="text-sm text-charcoal/60">
                    {money(d.value)} · {d.weight.toLocaleString("en-CA", { maximumFractionDigits: 1 })} {WEIGHT_UNIT} · {d.items} items
                    {d.lastDonation && ` · last ${d.lastDonation}`}
                  </p>
                  {(d.contact || d.email) && (
                    <p className="text-xs text-charcoal/50">{[d.contact, d.email].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/admin/donors/${d.id}/report`} className="btn-outline text-sm">
                    Report
                  </Link>
                  <button onClick={() => setEditId(d.id)} className="btn-outline text-sm">Edit</button>
                  <button
                    onClick={() => toggle(d.id, !d.isActive)}
                    className={d.isActive ? "btn-danger text-sm" : "btn-gold text-sm"}
                  >
                    {d.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                  <button
                    onClick={() => del(d)}
                    className="rounded-lg border border-military/40 px-3 py-1.5 text-sm font-semibold text-military hover:bg-military/5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
