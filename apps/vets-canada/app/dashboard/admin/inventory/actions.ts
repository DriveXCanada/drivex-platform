"use server";

import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function updateInventoryAction(
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("inventory");
  const itemId = Number(formData.get("itemId"));
  const quantity = Math.max(0, Number(formData.get("quantity")) || 0);
  const expiryRaw = String(formData.get("expiry") || "").trim();
  const expiry = expiryRaw === "" ? null : expiryRaw;
  const limitRaw = String(formData.get("shopLimit") || "").trim();
  const shopLimit = limitRaw === "" ? null : Math.max(1, Number(limitRaw) || 0);
  if (!itemId) return { success: false, error: "Invalid item." };

  await sql`
    UPDATE inventory
    SET quantity = ${quantity}, expiry_date = ${expiry}, last_updated = now()
    WHERE item_id = ${itemId};
  `;
  await sql`UPDATE items SET shop_limit = ${shopLimit} WHERE id = ${itemId};`;
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}
