"use server";

import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { BUDGET_KEY } from "./constants";

export interface ActionResult {
  success: boolean;
  error?: string;
}

const PATH = "/dashboard/admin/expenses";

/** Set (or update) the tenant's recurring monthly expense budget. */
export async function setMonthlyBudgetAction(
  amount: number
): Promise<ActionResult> {
  await requirePermission("expenses");
  const val = Math.max(0, Number(amount) || 0);
  await sql`
    INSERT INTO settings (key, value)
    VALUES (${BUDGET_KEY}, ${String(val)})
    ON CONFLICT (tenant_id, key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  `;
  revalidatePath(PATH);
  return { success: true };
}

export async function addExpenseAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("expenses");
  const date = String(formData.get("date") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const vendor = String(formData.get("vendor") || "").trim();
  const amount = Math.max(0, Number(formData.get("amount")) || 0);
  const isFood =
    formData.get("is_food") === "on" || formData.get("is_food") === "1";

  // Food line items (item + quantity) are passed as a JSON string.
  let foodItems: { itemId: number; quantity: number }[] = [];
  try {
    const raw = JSON.parse(String(formData.get("foodItems") || "[]"));
    if (Array.isArray(raw)) {
      foodItems = raw
        .map((x) => ({
          itemId: Number(x.itemId),
          quantity: Math.floor(Number(x.quantity)),
        }))
        .filter((x) => x.itemId > 0 && x.quantity > 0);
    }
  } catch {
    /* ignore malformed input */
  }

  if (!category) return { success: false, error: "Category is required." };
  if (amount <= 0)
    return { success: false, error: "Amount must be greater than 0." };
  if (isFood && foodItems.length === 0) {
    return {
      success: false,
      error: "Add at least one food item, or uncheck 'food for the pantry'.",
    };
  }

  const { rows } = await sql`
    INSERT INTO expenses (expense_date, category, description, vendor, amount, is_food, created_by)
    VALUES (
      ${date || null}::date,
      ${category},
      ${description || null},
      ${vendor || null},
      ${amount},
      ${isFood},
      ${session.userId}
    )
    RETURNING id;
  `;
  const expenseId = rows[0].id as number;

  if (isFood) {
    // Record what food was bought (for tracking) AND add it to inventory.
    for (const f of foodItems) {
      await sql`
        INSERT INTO expense_items (expense_id, item_id, quantity)
        VALUES (${expenseId}, ${f.itemId}, ${f.quantity});
      `;
      const upd = await sql`
        UPDATE inventory
        SET quantity = quantity + ${f.quantity}, last_updated = now()
        WHERE item_id = ${f.itemId};
      `;
      if (upd.rowCount === 0) {
        await sql`INSERT INTO inventory (item_id, quantity) VALUES (${f.itemId}, ${f.quantity});`;
      }
    }
    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard/admin");
  }

  revalidatePath(PATH);
  return { success: true };
}

export async function deleteExpenseAction(id: number): Promise<ActionResult> {
  await requirePermission("expenses");
  // Cascade removes any linked expense_items. Inventory that was already added
  // is intentionally NOT reversed (the stock may already have been used).
  await sql`DELETE FROM expenses WHERE id = ${id};`;
  revalidatePath(PATH);
  return { success: true };
}
