"use server";

import { sql } from "@/lib/db";
import { requireManager, hashPin, isValidPinFormat, verifyPin } from "@/lib/auth";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

function permissionsJson(formData: FormData): string {
  const selected = formData
    .getAll("permissions")
    .map((p) => String(p))
    .filter((p) => PERMISSION_KEYS.includes(p));
  return JSON.stringify(Array.from(new Set(selected)));
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

async function pinInUse(pin: string, excludeId?: number): Promise<boolean> {
  const { rows } = await sql`SELECT id, pin FROM users WHERE is_active = true;`;
  for (const u of rows) {
    if (excludeId && u.id === excludeId) continue;
    if (await verifyPin(pin, u.pin)) return true;
  }
  return false;
}

export async function createVolunteerAction(
  formData: FormData
): Promise<ActionResult> {
  await requireManager();
  const name = String(formData.get("name") || "").trim();
  const pin = String(formData.get("pin") || "").trim();
  const role = String(formData.get("role") || "volunteer");

  if (!name) return { success: false, error: "Name is required." };
  if (!isValidPinFormat(pin)) return { success: false, error: "PIN must be 4 digits." };
  if (await pinInUse(pin)) return { success: false, error: "That PIN is already in use." };

  const get = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v === "" ? null : v;
  };
  const hashed = await hashPin(pin);
  await sql`
    INSERT INTO users
      (name, pin, role, must_change_pin, is_active, emergency_contact, availability, strengths, permissions)
    VALUES (
      ${name}, ${hashed}, ${role === "manager" ? "manager" : "volunteer"}, false, true,
      ${get("emergencyContact")}, ${get("availability")}, ${get("strengths")}, ${permissionsJson(formData)}
    );
  `;
  revalidatePath("/dashboard/admin/volunteers");
  return { success: true };
}

export async function updateVolunteerAction(
  formData: FormData
): Promise<ActionResult> {
  await requireManager();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "volunteer");
  const pin = String(formData.get("pin") || "").trim();

  if (!id || !name) return { success: false, error: "Name is required." };

  const get = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v === "" ? null : v;
  };
  await sql`
    UPDATE users
    SET name = ${name},
        role = ${role === "manager" ? "manager" : "volunteer"},
        emergency_contact = ${get("emergencyContact")},
        availability = ${get("availability")},
        strengths = ${get("strengths")},
        permissions = ${permissionsJson(formData)}
    WHERE id = ${id};
  `;

  if (pin) {
    if (!isValidPinFormat(pin)) return { success: false, error: "PIN must be 4 digits." };
    if (await pinInUse(pin, id)) return { success: false, error: "That PIN is already in use." };
    const hashed = await hashPin(pin);
    await sql`UPDATE users SET pin = ${hashed}, must_change_pin = false WHERE id = ${id};`;
  }

  revalidatePath("/dashboard/admin/volunteers");
  return { success: true };
}

export async function toggleVolunteerActiveAction(
  id: number,
  isActive: boolean
): Promise<ActionResult> {
  const session = await requireManager();
  if (id === session.userId && !isActive) {
    return { success: false, error: "You can't deactivate your own account." };
  }
  await sql`UPDATE users SET is_active = ${isActive} WHERE id = ${id};`;
  revalidatePath("/dashboard/admin/volunteers");
  return { success: true };
}

export interface ActivityRow {
  type: string;
  date: string;
  detail: string;
}

export async function getVolunteerActivityAction(
  id: number
): Promise<ActivityRow[]> {
  await requireManager();
  const { rows } = await sql`
    SELECT
      t.type,
      t.created_at,
      COALESCE(SUM(ti.quantity), 0)::int AS item_count
    FROM transactions t
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    WHERE t.volunteer_id = ${id}
    GROUP BY t.id, t.type, t.created_at
    ORDER BY t.created_at DESC
    LIMIT 50;
  `;
  const labels: Record<string, string> = {
    stock_out: "Client visit",
    stock_in: "Donation logged",
    audit: "Stock count",
    waste: "Write-off",
  };
  return rows.map((r) => ({
    type: r.type,
    date: new Date(r.created_at).toLocaleString(),
    detail: `${labels[r.type] ?? r.type} · ${r.item_count} items`,
  }));
}

// ------------------------------ Hours log ------------------------------

export interface LogRow {
  id: number;
  date: string;
  hours: number;
  note: string | null;
}

export async function getVolunteerLogAction(id: number): Promise<LogRow[]> {
  await requireManager();
  const { rows } = await sql`
    SELECT id, log_date, hours, note
    FROM volunteer_log WHERE volunteer_id = ${id}
    ORDER BY log_date DESC, id DESC;
  `;
  return rows.map((r) => ({
    id: r.id,
    date: String(r.log_date),
    hours: Number(r.hours),
    note: r.note,
  }));
}

export async function addVolunteerLogAction(
  formData: FormData
): Promise<ActionResult> {
  await requireManager();
  const volunteerId = Number(formData.get("volunteerId"));
  const date = String(formData.get("date") || "").trim();
  const hours = Math.max(0, Number(formData.get("hours")) || 0);
  const note = String(formData.get("note") || "").trim();
  if (!volunteerId) return { success: false, error: "Missing volunteer." };
  if (hours <= 0 && note === "")
    return { success: false, error: "Enter hours or a note." };
  await sql`
    INSERT INTO volunteer_log (volunteer_id, log_date, hours, note)
    VALUES (${volunteerId}, ${date || null}::date, ${hours}, ${note || null});
  `;
  revalidatePath("/dashboard/admin/volunteers");
  return { success: true };
}

export async function deleteVolunteerLogAction(
  id: number
): Promise<ActionResult> {
  await requireManager();
  await sql`DELETE FROM volunteer_log WHERE id = ${id};`;
  revalidatePath("/dashboard/admin/volunteers");
  return { success: true };
}
