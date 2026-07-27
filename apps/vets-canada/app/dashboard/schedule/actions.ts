"use server";

import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { searchClients, type ClientRecord } from "@/lib/queries";
import { ensureInitialized } from "@/lib/init";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function searchClientsForApptAction(
  term: string
): Promise<ClientRecord[]> {
  await requireAuth();
  if (!term || term.trim().length === 0) return [];
  return searchClients(term);
}

export async function bookAppointmentAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAuth();
  const clientIdRaw = String(formData.get("clientId") || "").trim();
  const clientId = clientIdRaw ? Number(clientIdRaw) : null;
  const clientName = String(formData.get("clientName") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const time = String(formData.get("time") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!date) return { success: false, error: "Please choose a date." };
  if (!clientId && !clientName)
    return { success: false, error: "Choose a client or enter a name." };

  try {
    await ensureInitialized();
    await sql`
      INSERT INTO appointments (client_id, client_name, appt_date, appt_time, notes, created_by)
      VALUES (${clientId}, ${clientName || null}, ${date}::date, ${time || null}, ${notes || null}, ${session.userId});
    `;
  } catch (err) {
    console.error("Book appointment failed:", err);
    return { success: false, error: `Could not save: ${(err as Error).message}` };
  }
  revalidatePath("/dashboard/schedule");
  return { success: true };
}

export async function updateAppointmentStatusAction(
  id: number,
  status: "scheduled" | "completed" | "cancelled" | "no_show"
): Promise<ActionResult> {
  await requireAuth();
  await sql`UPDATE appointments SET status = ${status} WHERE id = ${id};`;
  revalidatePath("/dashboard/schedule");
  return { success: true };
}

export async function deleteAppointmentAction(id: number): Promise<ActionResult> {
  await requireAuth();
  await sql`DELETE FROM appointments WHERE id = ${id};`;
  revalidatePath("/dashboard/schedule");
  return { success: true };
}

// ------------------------------ Staff shifts ------------------------------

export interface StaffOption {
  id: number;
  name: string;
  role: string;
}

export async function getStaffAction(): Promise<StaffOption[]> {
  await requireAuth();
  const { rows } = await sql`
    SELECT id, name, role FROM users WHERE is_active = true ORDER BY role, name;
  `;
  return rows.map((r) => ({ id: r.id, name: r.name, role: r.role }));
}

export async function bookShiftAction(formData: FormData): Promise<ActionResult> {
  const session = await requireAuth();
  const userId = Number(formData.get("userId"));
  const date = String(formData.get("date") || "").trim();
  const start = String(formData.get("start") || "").trim();
  const end = String(formData.get("end") || "").trim();
  const role = String(formData.get("role") || "").trim();
  if (!userId) return { success: false, error: "Choose a volunteer or manager." };
  if (!date) return { success: false, error: "Please choose a date." };

  await sql`
    INSERT INTO shifts (user_id, shift_date, start_time, end_time, role, created_by)
    VALUES (${userId}, ${date}::date, ${start || null}, ${end || null}, ${role || null}, ${session.userId});
  `;
  revalidatePath("/dashboard/schedule");
  return { success: true };
}

export async function deleteShiftAction(id: number): Promise<ActionResult> {
  await requireAuth();
  await sql`DELETE FROM shifts WHERE id = ${id};`;
  revalidatePath("/dashboard/schedule");
  return { success: true };
}
