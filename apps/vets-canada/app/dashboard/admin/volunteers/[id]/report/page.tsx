import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { sql } from "@/lib/db";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function VolunteerReportPage({
  params,
}: {
  params: { id: string };
}) {
  await requireManager();
  const id = Number(params.id);
  if (!id) notFound();

  const { rows: userRows } = await sql`
    SELECT name, role, is_active, created_at, emergency_contact, availability, strengths
    FROM users WHERE id = ${id};
  `;
  if (userRows.length === 0) notFound();
  const u = userRows[0];

  const { rows: logRows } = await sql`
    SELECT log_date, hours, note FROM volunteer_log
    WHERE volunteer_id = ${id} ORDER BY log_date DESC, id DESC;
  `;
  const totalHours = logRows.reduce((s, r) => s + Number(r.hours), 0);

  const { rows: actRows } = await sql`
    SELECT
      COUNT(*) FILTER (WHERE type = 'stock_out')::int AS visits,
      COUNT(*) FILTER (WHERE type = 'stock_in')::int AS donations,
      COUNT(*) FILTER (WHERE type = 'audit')::int AS counts,
      COUNT(*) FILTER (WHERE type = 'waste')::int AS writeoffs
    FROM transactions WHERE volunteer_id = ${id};
  `;
  const act = actRows[0];

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/dashboard/admin/volunteers" className="btn-outline text-sm">
          ← Back
        </Link>
        <PrintButton />
      </div>

      {/* Letterhead */}
      <div className="border-b-2 border-navy pb-3">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-navy">
          VETS Canada — Dartmouth
        </h1>
        <p className="text-xs uppercase tracking-widest text-gold">
          Volunteer Report · Proudly Supported by DriveX
        </p>
      </div>

      <div className="mt-4">
        <h2 className="font-heading text-xl font-bold text-navy">{u.name}</h2>
        <p className="text-sm text-charcoal/70">
          {u.role === "manager" ? "Manager" : "Volunteer"} ·{" "}
          {u.is_active ? "Active" : "Inactive"} · Joined{" "}
          {new Date(u.created_at).toLocaleDateString()}
        </p>
        <p className="mt-1 text-xs text-charcoal/40">
          Generated {new Date().toLocaleString()}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded border border-black/10 p-3">
          <p className="text-xs font-semibold uppercase text-charcoal/50">Emergency Contact</p>
          <p>{u.emergency_contact || "—"}</p>
        </div>
        <div className="rounded border border-black/10 p-3">
          <p className="text-xs font-semibold uppercase text-charcoal/50">Availability</p>
          <p>{u.availability || "—"}</p>
        </div>
        <div className="col-span-2 rounded border border-black/10 p-3">
          <p className="text-xs font-semibold uppercase text-charcoal/50">Strengths / Skills</p>
          <p>{u.strengths || "—"}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total Hours", value: totalHours.toFixed(1) },
          { label: "Client Visits", value: act.visits },
          { label: "Donations", value: act.donations },
          { label: "Stock Counts", value: act.counts },
          { label: "Write-Offs", value: act.writeoffs },
        ].map((s) => (
          <div key={s.label} className="rounded border border-black/10 p-3 text-center">
            <p className="text-2xl font-bold text-navy">{s.value}</p>
            <p className="text-xs text-charcoal/60">{s.label}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-heading text-lg font-bold text-navy">
        Hours &amp; Activity Log
      </h3>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-black/20 text-left">
            <th className="py-1">Date</th>
            <th className="py-1">Hours</th>
            <th className="py-1">Notes</th>
          </tr>
        </thead>
        <tbody>
          {logRows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-3 text-center text-charcoal/40">
                No hours or notes logged.
              </td>
            </tr>
          )}
          {logRows.map((l, i) => (
            <tr key={i} className="border-b border-black/5">
              <td className="py-1.5">{new Date(l.log_date).toLocaleDateString()}</td>
              <td className="py-1.5">{Number(l.hours) > 0 ? Number(l.hours) : "—"}</td>
              <td className="py-1.5">{l.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-8 text-center text-xs text-charcoal/40">
        VETS Canada — Dartmouth Food Bank · Proudly Supported by DriveX
      </p>
    </div>
  );
}
