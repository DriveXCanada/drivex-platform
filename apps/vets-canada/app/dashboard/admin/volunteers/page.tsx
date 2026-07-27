import { requireManager } from "@/lib/auth";
import { sql } from "@/lib/db";
import { parsePermissions } from "@/lib/permissions";
import VolunteersManager, { type UserRow } from "./VolunteersManager";

export const dynamic = "force-dynamic";

export default async function VolunteersPage() {
  await requireManager();
  const { rows } = await sql`
    SELECT u.id, u.name, u.role, u.is_active, u.created_at,
           u.emergency_contact, u.availability, u.strengths, u.permissions,
           COALESCE((SELECT ROUND(SUM(hours),1) FROM volunteer_log vl WHERE vl.volunteer_id = u.id), 0) AS total_hours
    FROM users u
    ORDER BY u.is_active DESC, u.role, u.name;
  `;
  const users: UserRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    isActive: r.is_active,
    createdAt: new Date(r.created_at).toLocaleDateString(),
    emergencyContact: r.emergency_contact,
    availability: r.availability,
    strengths: r.strengths,
    totalHours: Number(r.total_hours),
    permissions: parsePermissions(r.permissions),
  }));

  return <VolunteersManager users={users} />;
}
