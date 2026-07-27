"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientRecord } from "@/lib/queries";
import type { StaffOption } from "./actions";
import {
  searchClientsForApptAction,
  bookAppointmentAction,
  updateAppointmentStatusAction,
  deleteAppointmentAction,
  bookShiftAction,
  deleteShiftAction,
} from "./actions";

export interface Appt {
  id: number;
  date: string;
  time: string | null;
  name: string;
  clientCode: string | null;
  clientDbId: number | null;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  hasAllergy: boolean;
  allergyInfo: string | null;
}

export interface Shift {
  id: number;
  date: string;
  start: string | null;
  end: string | null;
  role: string | null;
  name: string;
  staffRole: string;
}

export interface Availability {
  id: number;
  date: string;
  status: "available" | "unavailable";
  start: string | null;
  end: string | null;
  note: string | null;
  name: string;
  staffRole: string;
}

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-navy/10 text-navy",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-charcoal/10 text-charcoal/50 line-through",
  no_show: "bg-military/10 text-military",
};
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function ScheduleCalendar({
  weekStart,
  appts,
  shifts,
  availability,
  staff,
  canViewClients,
}: {
  weekStart: string;
  appts: Appt[];
  shifts: Shift[];
  availability: Availability[];
  staff: StaffOption[];
  canViewClients: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"appt" | "shift" | null>(null);
  const [bookDate, setBookDate] = useState(weekStart);

  // client search (appointment form)
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ClientRecord[]>([]);
  const [chosen, setChosen] = useState<ClientRecord | null>(null);
  const [searching, startSearch] = useTransition();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayName = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { weekday: "short" });
  const dayNum = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });

  const goWeek = (delta: number) =>
    router.push(`/dashboard/schedule?week=${addDays(weekStart, delta * 7)}`);

  const doSearch = (v: string) => {
    setTerm(v);
    setChosen(null);
    startSearch(async () => setResults(await searchClientsForApptAction(v)));
  };

  const openBook = (date: string, m: "appt" | "shift") => {
    setBookDate(date);
    setMode(m);
    setError("");
    setTerm("");
    setResults([]);
    setChosen(null);
  };

  const book = async (fd: FormData) => {
    setError("");
    const res = await bookAppointmentAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setMode(null);
    router.refresh();
  };

  const bookShift = async (fd: FormData) => {
    setError("");
    const res = await bookShiftAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setMode(null);
    router.refresh();
  };

  const setStatus = (id: number, status: Appt["status"]) =>
    startTransition(async () => {
      await updateAppointmentStatusAction(id, status);
      router.refresh();
    });

  const del = (id: number) =>
    startTransition(async () => {
      await deleteAppointmentAction(id);
      router.refresh();
    });

  const delShift = (id: number) =>
    startTransition(async () => {
      await deleteShiftAction(id);
      router.refresh();
    });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-navy">Schedule</h1>
        <div className="flex gap-2">
          <button onClick={() => openBook(weekStart, "appt")} className="btn-primary text-sm">
            + Appointment
          </button>
          <button onClick={() => openBook(weekStart, "shift")} className="btn-gold text-sm">
            + Staff Shift
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => goWeek(-1)} className="btn-outline text-sm">← Prev</button>
        <button onClick={() => router.push("/dashboard/schedule")} className="btn-outline text-sm">This Week</button>
        <button onClick={() => goWeek(1)} className="btn-outline text-sm">Next →</button>
        <span className="ml-2 text-sm font-semibold text-charcoal/70">Week of {dayNum(weekStart)}</span>
      </div>

      <p className="mt-2 text-xs text-charcoal/50">
        <span className="mr-3"><span className="inline-block h-2 w-2 rounded-full bg-navy/40" /> Client appointment</span>
        <span className="mr-3"><span className="inline-block h-2 w-2 rounded-full bg-gold" /> Staff shift</span>
        <span className="mr-3"><span className="inline-block h-2 w-2 rounded-full bg-green-600" /> Available</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-military" /> Not free</span>
      </p>
      <p className="mt-1 text-xs text-charcoal/50">
        Team availability comes from each person&apos;s{" "}
        <a href="/dashboard/availability" className="font-semibold text-navy underline">
          My Availability
        </a>{" "}
        calendar.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">{error}</p>
      )}

      {/* Appointment form */}
      {mode === "appt" && (
        <form action={book} className="card mt-4">
          <p className="mb-2 font-heading text-lg font-bold text-navy">Book Client Appointment</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Client (search registered)</label>
              <input className="input" placeholder="Search name or ID…"
                value={chosen ? chosen.name : term} onChange={(e) => doSearch(e.target.value)} />
              {!chosen && term && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-black/10 bg-white">
                  {searching && <p className="px-3 py-2 text-sm text-charcoal/50">Searching…</p>}
                  {!searching && results.length === 0 && (
                    <p className="px-3 py-2 text-sm text-charcoal/50">No match — or type a name below.</p>
                  )}
                  {results.map((c) => (
                    <button type="button" key={c.id}
                      onClick={() => { setChosen(c); setResults([]); }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-navy/5">
                      {c.name} · {c.clientId}
                    </button>
                  ))}
                </div>
              )}
              <input type="hidden" name="clientId" value={chosen?.id ?? ""} />
            </div>
            <div>
              <label className="label">…or name (walk-in)</label>
              <input name="clientName" className="input" placeholder="Name" defaultValue="" />
            </div>
            <div>
              <label className="label">Date</label>
              <input name="date" type="date" className="input" value={bookDate}
                onChange={(e) => setBookDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Time</label>
              <input name="time" type="time" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes (optional)</label>
              <input name="notes" className="input" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary">Book</button>
            <button type="button" onClick={() => setMode(null)} className="btn-outline">Cancel</button>
          </div>
        </form>
      )}

      {/* Staff shift form */}
      {mode === "shift" && (
        <form action={bookShift} className="card mt-4">
          <p className="mb-2 font-heading text-lg font-bold text-navy">Schedule Staff Shift</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Volunteer / Manager</label>
              <select name="userId" className="input" required defaultValue="">
                <option value="" disabled>Choose a person…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input name="date" type="date" className="input" value={bookDate}
                onChange={(e) => setBookDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Role / task (optional)</label>
              <input name="role" className="input" placeholder="e.g. intake, deliveries, stocking" />
            </div>
            <div>
              <label className="label">Start time</label>
              <input name="start" type="time" className="input" />
            </div>
            <div>
              <label className="label">End time</label>
              <input name="end" type="time" className="input" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary">Schedule</button>
            <button type="button" onClick={() => setMode(null)} className="btn-outline">Cancel</button>
          </div>
        </form>
      )}

      {/* Week grid */}
      <div className="mt-4 grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const dayAppts = appts.filter((a) => a.date === d);
          const dayShifts = shifts.filter((s) => s.date === d);
          const dayAvail = availability.filter((a) => a.date === d);
          const isToday = d === new Date().toISOString().slice(0, 10);
          return (
            <div key={d} className={`rounded-xl border bg-white p-2 shadow-sm ${isToday ? "border-gold" : "border-black/5"}`}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-charcoal/50">{dayName(d)}</p>
                  <p className="text-sm font-bold text-navy">{dayNum(d)}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openBook(d, "appt")} title="Book appointment"
                    className="rounded-full bg-navy/10 px-2 text-lg font-bold text-navy">+</button>
                  <button onClick={() => openBook(d, "shift")} title="Add staff shift"
                    className="rounded-full bg-gold/20 px-2 text-lg font-bold text-gold">👤</button>
                </div>
              </div>

              <div className="space-y-1.5">
                {dayAppts.length === 0 &&
                  dayShifts.length === 0 &&
                  dayAvail.length === 0 && (
                    <p className="text-xs text-charcoal/30">—</p>
                  )}

                {/* Team availability */}
                {dayAvail.map((a) => (
                  <div
                    key={`av${a.id}`}
                    className={`rounded-md border p-1.5 text-xs ${
                      a.status === "unavailable"
                        ? "border-military/30 bg-military/5"
                        : "border-green-600/30 bg-green-50"
                    }`}
                  >
                    <span
                      className={`font-semibold ${
                        a.status === "unavailable" ? "text-military" : "text-green-700"
                      }`}
                    >
                      {a.status === "unavailable" ? "✕" : "✓"} {a.name}
                    </span>
                    <p className="text-[11px] text-charcoal/60">
                      {[
                        a.start && a.end ? `${a.start}–${a.end}` : a.start || "all day",
                        a.note,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ))}

                {/* Staff shifts */}
                {dayShifts.map((s) => (
                  <div key={`s${s.id}`} className="rounded-md border border-gold/40 bg-gold/10 p-1.5 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-charcoal">
                        👤 {s.name}
                      </span>
                      <button onClick={() => delShift(s.id)} className="text-[10px] font-semibold text-charcoal/40">✕</button>
                    </div>
                    <p className="text-[11px] text-charcoal/60">
                      {[s.start && s.end ? `${s.start}–${s.end}` : s.start || "", s.role].filter(Boolean).join(" · ") || "shift"}
                    </p>
                  </div>
                ))}

                {/* Client appointments */}
                {dayAppts.map((a) => (
                  <div
                    key={`a${a.id}`}
                    className={`rounded-md border p-1.5 text-xs ${
                      a.hasAllergy
                        ? "border-military/40 bg-military/5"
                        : "border-black/5 bg-offwhite"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-charcoal">
                        {a.time ? `${a.time} · ` : ""}
                        {canViewClients && a.clientCode ? (
                          <Link
                            href={`/dashboard/admin/clients?focus=${encodeURIComponent(a.clientCode)}`}
                            className="text-navy underline decoration-dotted underline-offset-2 hover:text-military"
                            title="Open client file"
                          >
                            {a.name}
                          </Link>
                        ) : (
                          a.name
                        )}
                      </span>
                    </div>
                    {a.hasAllergy && (
                      <p className="mt-0.5 rounded bg-military/15 px-1 py-0.5 text-[10px] font-bold text-military">
                        ⚠ Allergy{a.allergyInfo ? `: ${a.allergyInfo}` : ""}
                      </p>
                    )}
                    {a.notes && <p className="text-[11px] text-charcoal/50">{a.notes}</p>}
                    <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${STATUS_CLASS[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                    {a.clientDbId && a.status !== "cancelled" && (
                      <Link
                        href={`/dashboard/visit?client=${a.clientDbId}`}
                        className="mt-1 block rounded-md bg-navy px-2 py-1 text-center text-[11px] font-bold text-white hover:bg-navy/90"
                        title="Start this client's shopping visit"
                      >
                        🛒 Start Visit
                      </Link>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.status !== "completed" && (
                        <button onClick={() => setStatus(a.id, "completed")} className="text-[10px] font-semibold text-green-700">✓ Done</button>
                      )}
                      {a.status !== "no_show" && (
                        <button onClick={() => setStatus(a.id, "no_show")} className="text-[10px] font-semibold text-military">No-show</button>
                      )}
                      {a.status !== "cancelled" && (
                        <button onClick={() => setStatus(a.id, "cancelled")} className="text-[10px] font-semibold text-charcoal/50">Cancel</button>
                      )}
                      <button onClick={() => del(a.id)} className="text-[10px] font-semibold text-charcoal/40">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
