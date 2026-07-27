import { requireAuth, getCurrentPermissions } from "@/lib/auth";
import { sql } from "@/lib/db";
import ScheduleCalendar, {
  type Appt,
  type Shift,
  type Availability,
} from "./ScheduleCalendar";
import type { StaffOption } from "./actions";

export const dynamic = "force-dynamic";

function mondayOf(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  await requireAuth();
  const perms = await getCurrentPermissions();
  const canViewClients = perms.includes("clients");

  const base = searchParams.week ? new Date(searchParams.week) : new Date();
  const start = mondayOf(isNaN(base.getTime()) ? new Date() : base);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const { rows } = await sql`
    SELECT a.id, a.client_id, a.client_name, a.appt_date, a.appt_time, a.status, a.notes,
           cl.name AS client_record_name, cl.client_id AS client_code,
           cl.has_allergy, cl.allergy_info
    FROM appointments a
    LEFT JOIN clients cl ON cl.id = a.client_id
    WHERE a.appt_date BETWEEN ${iso(start)}::date AND ${iso(end)}::date
    ORDER BY a.appt_date, a.appt_time NULLS LAST, a.id;
  `;

  const appts: Appt[] = rows.map((r) => ({
    id: r.id,
    date: iso(new Date(r.appt_date)),
    time: r.appt_time,
    name: r.client_record_name || r.client_name || "(unnamed)",
    clientCode: r.client_code || null,
    clientDbId: r.client_id || null,
    status: r.status,
    notes: r.notes,
    hasAllergy: !!r.has_allergy,
    allergyInfo: r.allergy_info,
  }));

  const { rows: shiftRows } = await sql`
    SELECT s.id, s.shift_date, s.start_time, s.end_time, s.role,
           u.name AS staff_name, u.role AS staff_role
    FROM shifts s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.shift_date BETWEEN ${iso(start)}::date AND ${iso(end)}::date
    ORDER BY s.shift_date, s.start_time NULLS LAST, s.id;
  `;
  const shifts: Shift[] = shiftRows.map((r) => ({
    id: r.id,
    date: iso(new Date(r.shift_date)),
    start: r.start_time,
    end: r.end_time,
    role: r.role,
    name: r.staff_name || "(removed)",
    staffRole: r.staff_role || "",
  }));

  const { rows: availRows } = await sql`
    SELECT av.id, av.avail_date, av.status, av.start_time, av.end_time, av.note,
           u.name AS staff_name, u.role AS staff_role
    FROM availability av
    LEFT JOIN users u ON u.id = av.user_id
    WHERE av.avail_date BETWEEN ${iso(start)}::date AND ${iso(end)}::date
    ORDER BY av.avail_date, av.status, av.start_time NULLS FIRST, av.id;
  `;
  const availability: Availability[] = availRows.map((r) => ({
    id: r.id,
    date: iso(new Date(r.avail_date)),
    status: r.status,
    start: r.start_time,
    end: r.end_time,
    note: r.note,
    name: r.staff_name || "(removed)",
    staffRole: r.staff_role || "",
  }));

  const { rows: staffRows } = await sql`
    SELECT id, name, role FROM users WHERE is_active = true ORDER BY role, name;
  `;
  const staff: StaffOption[] = staffRows.map((r) => ({ id: r.id, name: r.name, role: r.role }));

  return (
    <ScheduleCalendar
      weekStart={iso(start)}
      appts={appts}
      shifts={shifts}
      availability={availability}
      staff={staff}
      canViewClients={canViewClients}
    />
  );
}
