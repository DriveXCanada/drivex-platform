"use server";

import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface WasteLineInput {
  itemId: number;
  quantity: number;
}

export interface WasteResult {
  success: boolean;
  error?: string;
  totalItems?: number;
}

/**
 * Write off stock (damaged / expired / etc). Decrements inventory and logs a
 * 'waste' transaction. Keeps inventory accurate without a full recount.
 */
export async function logWasteAction(
  lines: WasteLineInput[],
  reason: string,
  notes: string
): Promise<WasteResult> {
  const session = await requireAuth();

  const clean = lines.filter((l) => l.quantity > 0);
  if (clean.length === 0) {
    return { success: false, error: "Enter a quantity for at least one item." };
  }

  const note = [reason, notes].filter(Boolean).join(" — ");

  const { rows: txnRows } = await sql`
    INSERT INTO transactions (type, volunteer_id, notes)
    VALUES ('waste', ${session.userId}, ${note || null})
    RETURNING id;
  `;
  const transactionId = txnRows[0].id as number;

  let total = 0;
  for (const l of clean) {
    total += l.quantity;
    await sql`
      INSERT INTO transaction_items (transaction_id, item_id, quantity, point_value_at_time)
      VALUES (${transactionId}, ${l.itemId}, ${l.quantity}, 0);
    `;
    await sql`
      UPDATE inventory
      SET quantity = GREATEST(0, quantity - ${l.quantity}),
          last_updated = now()
      WHERE item_id = ${l.itemId};
    `;
  }

  revalidatePath("/dashboard/admin/inventory");
  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/admin");

  return { success: true, totalItems: total };
}
