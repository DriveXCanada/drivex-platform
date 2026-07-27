"use server";

import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createDonorAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("donors");
  const name = String(formData.get("name") || "").trim();
  if (!name) return { success: false, error: "Donor name is required." };
  const get = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v === "" ? null : v;
  };
  await sql`
    INSERT INTO donors (name, contact, email, address, notes)
    VALUES (${name}, ${get("contact")}, ${get("email")}, ${get("address")}, ${get("notes")});
  `;
  revalidatePath("/dashboard/admin/donors");
  return { success: true };
}

export async function updateDonorAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("donors");
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { success: false, error: "Donor name is required." };
  const get = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v === "" ? null : v;
  };
  await sql`
    UPDATE donors
    SET name = ${name}, contact = ${get("contact")}, email = ${get("email")},
        address = ${get("address")}, notes = ${get("notes")}
    WHERE id = ${id};
  `;
  revalidatePath("/dashboard/admin/donors");
  return { success: true };
}

export async function toggleDonorActiveAction(
  id: number,
  isActive: boolean
): Promise<ActionResult> {
  await requirePermission("donors");
  await sql`UPDATE donors SET is_active = ${isActive} WHERE id = ${id};`;
  revalidatePath("/dashboard/admin/donors");
  return { success: true };
}

export async function deleteDonorAction(id: number): Promise<ActionResult> {
  await requirePermission("donors");
  // Donations keep their history; donor link is set NULL.
  await sql`DELETE FROM donors WHERE id = ${id};`;
  revalidatePath("/dashboard/admin/donors");
  return { success: true };
}
