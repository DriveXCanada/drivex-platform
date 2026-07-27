"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAvailabilityAction,
  deleteAvailabilityAction,
  type AvailabilityEntry,
} from "./actions";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function AvailabilityManager({
  name,
  entries,
}: {
  name: string;
  entries: AvailabilityEntry[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"available" | "unavailable">("available");

  const add = async (fd: FormData) => {
    setError("");
    fd.set("status", status);
    const res = await addAvailabilityAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    router.refresh();
  };

  const remove = (id: number) =>
    startTransition(async () => {
      await deleteAvailabilityAction(id);
      router.refresh();
    });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-navy">My Availability</h1>
      <p className="mt-1 text-charcoal/70">
        Mark the days you can come in and the days you&apos;re not free, {name}.
        Managers see this on the team{" "}
        <span className="font-semibold">Schedule</span> when planning shifts.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">
          {error}
        </p>
      )}

      {/* Add form */}
      <form action={add} className="card mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">I am…</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("available")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                status === "available"
                  ? "bg-green-600 text-white"
                  : "bg-white text-charcoal hover:bg-green-50"
              }`}
            >
              ✓ Available
            </button>
            <button
              type="button"
              onClick={() => setStatus("unavailable")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                status === "unavailable"
                  ? "bg-military text-white"
                  : "bg-white text-charcoal hover:bg-military/10"
              }`}
            >
              ✕ Not free
            </button>
          </div>
        </div>
        <div>
          <label className="label">Date</label>
          <input name="date" type="date" className="input" defaultValue={today} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">From (optional)</label>
            <input name="start" type="time" className="input" />
          </div>
          <div>
            <label className="label">To (optional)</label>
            <input name="end" type="time" className="input" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Note (optional)</label>
          <input name="note" className="input" placeholder="e.g. can stock shelves, away until noon" />
        </div>
        <div className="sm:col-span-2">
          <button className="btn-primary">+ Add to My Calendar</button>
        </div>
      </form>

      {/* My entries */}
      <h2 className="mt-6 mb-2 font-heading text-lg font-bold text-navy">
        Upcoming
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-charcoal/50">
          Nothing marked yet. Add the days you can (or can&apos;t) come in above.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className={`card flex flex-wrap items-center justify-between gap-3 ${
                e.status === "unavailable" ? "border-l-4 border-military" : "border-l-4 border-green-600"
              }`}
            >
              <div>
                <p className="font-semibold text-navy">
                  {fmtDate(e.date)}{" "}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                      e.status === "unavailable"
                        ? "bg-military/15 text-military"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {e.status === "unavailable" ? "✕ Not free" : "✓ Available"}
                  </span>
                </p>
                <p className="text-sm text-charcoal/60">
                  {[
                    e.start && e.end ? `${e.start}–${e.end}` : e.start || "all day",
                    e.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                onClick={() => remove(e.id)}
                className="rounded-lg border border-military/40 px-3 py-1.5 text-sm font-semibold text-military hover:bg-military/5"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
