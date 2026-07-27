"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createVolunteerAction,
  updateVolunteerAction,
  toggleVolunteerActiveAction,
  getVolunteerActivityAction,
  getVolunteerLogAction,
  addVolunteerLogAction,
  deleteVolunteerLogAction,
  type ActivityRow,
  type LogRow,
} from "./actions";

export interface UserRow {
  id: number;
  name: string;
  role: "manager" | "volunteer";
  isActive: boolean;
  createdAt: string;
  emergencyContact: string | null;
  availability: string | null;
  strengths: string | null;
  totalHours: number;
  permissions: string[];
}

function PermissionChecklist({ selected }: { selected?: string[] }) {
  return (
    <div className="sm:col-span-2">
      <label className="label">Extra access (managers have all of these)</label>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {PERMISSIONS.map((p) => (
          <label key={p.key} className="flex items-center gap-2 rounded-md bg-offwhite px-2 py-1.5 text-sm">
            <input
              type="checkbox"
              name="permissions"
              value={p.key}
              defaultChecked={selected?.includes(p.key)}
              className="h-4 w-4"
            />
            <span title={p.desc}>{p.label}</span>
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-charcoal/50">
        Grant a volunteer access to specific manager areas without making them a
        full manager. (Volunteer account management stays manager-only.)
      </p>
    </div>
  );
}

export default function VolunteersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [activityFor, setActivityFor] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [logFor, setLogFor] = useState<number | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);

  const today = new Date().toISOString().slice(0, 10);

  const onAdd = async (fd: FormData) => {
    setError("");
    const res = await createVolunteerAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setShowAdd(false);
    router.refresh();
  };

  const onEdit = async (fd: FormData) => {
    setError("");
    const res = await updateVolunteerAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setEditId(null);
    router.refresh();
  };

  const toggle = (id: number, active: boolean) => {
    setError("");
    startTransition(async () => {
      const res = await toggleVolunteerActiveAction(id, active);
      if (!res.success) setError(res.error || "Failed.");
      router.refresh();
    });
  };

  const loadActivity = async (id: number) => {
    if (activityFor === id) return setActivityFor(null);
    setLogFor(null);
    setActivity(await getVolunteerActivityAction(id));
    setActivityFor(id);
  };

  const loadLog = async (id: number) => {
    if (logFor === id) return setLogFor(null);
    setActivityFor(null);
    setLog(await getVolunteerLogAction(id));
    setLogFor(id);
  };

  const addLog = async (fd: FormData) => {
    setError("");
    const res = await addVolunteerLogAction(fd);
    if (!res.success) return setError(res.error || "Failed.");
    setLog(await getVolunteerLogAction(Number(fd.get("volunteerId"))));
    router.refresh();
  };

  const delLog = async (logId: number, volunteerId: number) => {
    await deleteVolunteerLogAction(logId);
    setLog(await getVolunteerLogAction(volunteerId));
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-navy">Volunteers</h1>
        <button onClick={() => setShowAdd((s) => !s)} className="btn-primary">
          {showAdd ? "Cancel" : "+ Add Account"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">
          {error}
        </p>
      )}

      {showAdd && (
        <form action={onAdd} className="card mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">4-digit PIN</label>
              <input name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} className="input text-center tracking-widest" required />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="role" className="input" defaultValue="volunteer">
                <option value="volunteer">Volunteer</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <input name="emergencyContact" className="input" placeholder="Name & phone" />
          </div>
          <div>
            <label className="label">Availability</label>
            <input name="availability" className="input" placeholder="e.g. Mon/Wed mornings" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Strengths / Skills</label>
            <input name="strengths" className="input" placeholder="e.g. driving, heavy lifting, intake" />
          </div>
          <PermissionChecklist />
          <div className="sm:col-span-2">
            <button className="btn-primary w-full">Create Account</button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {users.map((u) => (
          <div key={u.id} className="card">
            {editId === u.id ? (
              <form action={onEdit} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={u.id} />
                <div>
                  <label className="label">Name</label>
                  <input name="name" defaultValue={u.name} className="input" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">New PIN (blank = keep)</label>
                    <input name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} className="input text-center tracking-widest" placeholder="••••" />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select name="role" className="input" defaultValue={u.role}>
                      <option value="volunteer">Volunteer</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Emergency Contact</label>
                  <input name="emergencyContact" defaultValue={u.emergencyContact ?? ""} className="input" />
                </div>
                <div>
                  <label className="label">Availability</label>
                  <input name="availability" defaultValue={u.availability ?? ""} className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Strengths / Skills</label>
                  <input name="strengths" defaultValue={u.strengths ?? ""} className="input" />
                </div>
                <PermissionChecklist selected={u.permissions} />
                <div className="flex items-end gap-2 sm:col-span-2">
                  <button className="btn-primary">Save</button>
                  <button type="button" onClick={() => setEditId(null)} className="btn-outline">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy">
                      {u.name}
                      <span className="ml-2 rounded bg-navy/10 px-2 py-0.5 text-xs uppercase text-navy">
                        {u.role}
                      </span>
                      {!u.isActive && (
                        <span className="ml-2 rounded bg-charcoal/10 px-2 py-0.5 text-xs text-charcoal/60">
                          inactive
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-charcoal/50">
                      Added {u.createdAt} · {u.totalHours} hrs logged
                    </p>
                    <p className="mt-1 text-xs text-charcoal/60">
                      {u.emergencyContact && <span>📞 {u.emergencyContact} </span>}
                      {u.availability && <span>· 🗓 {u.availability} </span>}
                      {u.strengths && <span>· 💪 {u.strengths}</span>}
                    </p>
                    {u.role === "manager" ? (
                      <p className="mt-1 text-xs font-semibold text-gold">
                        🔑 Full access (manager)
                      </p>
                    ) : (
                      u.permissions.length > 0 && (
                        <p className="mt-1 text-xs font-semibold text-navy">
                          🔑 Extra access: {u.permissions.join(", ")}
                        </p>
                      )
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/admin/volunteers/${u.id}/report`} className="btn-outline text-sm">
                      PDF Report
                    </Link>
                    <button onClick={() => loadLog(u.id)} className="btn-outline text-sm">
                      {logFor === u.id ? "Hide Hours" : "Hours / Notes"}
                    </button>
                    <button onClick={() => loadActivity(u.id)} className="btn-outline text-sm">
                      {activityFor === u.id ? "Hide Activity" : "Activity"}
                    </button>
                    <button onClick={() => setEditId(u.id)} className="btn-outline text-sm">
                      Edit
                    </button>
                    <button
                      onClick={() => toggle(u.id, !u.isActive)}
                      className={u.isActive ? "btn-danger text-sm" : "btn-gold text-sm"}
                    >
                      {u.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </div>

                {logFor === u.id && (
                  <div className="mt-3 border-t border-black/5 pt-3">
                    <p className="mb-2 text-sm font-semibold text-navy">
                      Hours &amp; activity notes ·{" "}
                      <span className="text-charcoal/60">{u.totalHours} total hrs</span>
                    </p>
                    {log.length === 0 ? (
                      <p className="text-sm text-charcoal/50">No entries yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {log.map((l) => (
                          <div
                            key={l.id}
                            className="flex items-start justify-between gap-2 rounded-md bg-offwhite px-3 py-1.5 text-sm"
                          >
                            <span>
                              <span className="font-medium">{l.date}</span>
                              {l.hours > 0 && <span className="text-navy"> · {l.hours} hrs</span>}
                              {l.note && <span className="block text-xs text-charcoal/60">{l.note}</span>}
                            </span>
                            <button
                              onClick={() => delLog(l.id, u.id)}
                              className="rounded px-2 py-0.5 text-xs font-semibold text-military"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <form action={addLog} className="mt-3 grid gap-2 sm:grid-cols-4">
                      <input type="hidden" name="volunteerId" value={u.id} />
                      <input name="date" type="date" defaultValue={today} className="input" />
                      <input name="hours" type="number" min={0} step="0.25" placeholder="hrs" className="input" />
                      <input name="note" placeholder="What they did…" className="input sm:col-span-2" />
                      <div className="sm:col-span-4">
                        <button className="btn-primary text-sm">+ Add Entry</button>
                      </div>
                    </form>
                  </div>
                )}

                {activityFor === u.id && (
                  <div className="mt-3 border-t border-black/5 pt-3">
                    {activity.length === 0 ? (
                      <p className="text-sm text-charcoal/50">No activity yet.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {activity.map((a, i) => (
                          <li key={i} className="flex justify-between border-b border-black/5 py-1">
                            <span>{a.detail}</span>
                            <span className="text-charcoal/50">{a.date}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
