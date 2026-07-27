"use server";

import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

const PATH = "/dashboard/admin/expenses";

export async function addExpenseAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("expenses");
  const date = String(formData.get("date") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const vendor = String(formData.get("vendor") || "").trim();
  const amount = Math.max(0, Number(formData.get("amount")) || 0);

  if (!category) return { success: false, error: "Category is required." };
  if (amount <= 0) return { success: false, error: "Amount must be greater than 0." };

  await sql`
    INSERT INTO expenses (expense_date, category, description, vendor, amount, created_by)
    VALUES (
      ${date || null}::date,
      ${category},
      ${description || null},
      ${vendor || null},
      ${amount},
      ${session.userId}
    );
  `;
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteExpenseAction(id: number): Promise<ActionResult> {
  await requirePermission("expenses");
  await sql`DELETE FROM expenses WHERE id = ${id};`;
  revalidatePath(PATH);
  return { success: true };
}
