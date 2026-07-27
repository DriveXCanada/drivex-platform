"use server";

import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInitialized } from "@/lib/init";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface AvailabilityEntry {
  id: number;
  date: string;
  status: "available" | "unavailable";
  start: string | null;
  end: string | null;
  note: string | null;
}

export async function getMyAvailabilityAction(): Promise<AvailabilityEntry[]> {
  const session = await requireAuth();
  const { rows } = await sql`
    SELECT id, avail_date, status, start_time, end_time, note
    FROM availability
    WHERE user_id = ${session.userId}
      AND avail_date >= CURRENT_DATE - interval '1 day'
    ORDER BY avail_date, start_time NULLS FIRST, id;
  `;
  return rows.map((r) => ({
    id: r.id,
    date: new Date(r.avail_date).toISOString().slice(0, 10),
    status: r.status,
    start: r.start_time,
    end: r.end_time,
    note: r.note,
  }));
}

export async function addAvailabilityAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAuth();
  const date = String(formData.get("date") || "").trim();
  const status = String(formData.get("status") || "available").trim();
  const start = String(formData.get("start") || "").trim();
  const end = String(formData.get("end") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!date) return { success: false, error: "Please choose a date." };
  if (status !== "available" && status !== "unavailable") {
    return { success: false, error: "Invalid status." };
  }

  try {
    await ensureInitialized();
    await sql`
      INSERT INTO availability (user_id, avail_date, status, start_time, end_time, note)
      VALUES (${session.userId}, ${date}::date, ${status},
              ${start || null}, ${end || null}, ${note || null});
    `;
  } catch (err) {
    console.error("Add availability failed:", err);
    return { success: false, error: `Could not save: ${(err as Error).message}` };
  }
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard/schedule");
  return { success: true };
}

export async function deleteAvailabilityAction(
  id: number
): Promise<ActionResult> {
  const session = await requireAuth();
  // Only let a user remove their own entries.
  await sql`
    DELETE FROM availability WHERE id = ${id} AND user_id = ${session.userId};
  `;
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard/schedule");
  return { success: true };
}
