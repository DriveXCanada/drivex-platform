"use server";

import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CountLineInput {
  itemId: number;
  countedQuantity: number;
}

/** A new item typed in during a count, to be created on submit. */
export interface NewCountItemInput {
  categoryId: number;
  name: string;
  countedQuantity: number;
}

export interface CountResult {
  success: boolean;
  error?: string;
  recorded?: number;
  discrepancies?: number;
}

export async function submitCountAction(
  lines: CountLineInput[],
  notes: string,
  newItems: NewCountItemInput[] = []
): Promise<CountResult> {
  const session = await requireAuth();

  const cleanNew = newItems.filter(
    (n) => n.name.trim() !== "" && n.countedQuantity >= 0 && n.name.trim().length > 0
  );
  if (lines.length === 0 && cleanNew.length === 0) {
    return { success: false, error: "No counts entered." };
  }

  // Create any typed-in custom items and append them as normal count lines.
  const allLines: CountLineInput[] = [...lines];
  for (const n of cleanNew) {
    const name = n.name.trim();
    const existing = await sql`
      SELECT id FROM items WHERE category_id = ${n.categoryId} AND lower(name) = lower(${name});
    `;
    let itemId: number;
    if (existing.rows.length > 0) {
      itemId = existing.rows[0].id as number;
      await sql`UPDATE items SET is_active = true WHERE id = ${itemId};`;
    } else {
      const ord = await sql`
        SELECT COALESCE(MAX(display_order), 0) + 1 AS next FROM items WHERE category_id = ${n.categoryId};
      `;
      const created = await sql`
        INSERT INTO items (category_id, name, display_order, is_active)
        VALUES (${n.categoryId}, ${name}, ${ord.rows[0].next}, true)
        RETURNING id;
      `;
      itemId = created.rows[0].id as number;
      await sql`INSERT INTO inventory (item_id, quantity) VALUES (${itemId}, 0);`;
    }
    allLines.push({ itemId, countedQuantity: n.countedQuantity });
  }

  // Record an audit transaction for traceability.
  const { rows: txnRows } = await sql`
    INSERT INTO transactions (type, volunteer_id, notes)
    VALUES ('audit', ${session.userId}, ${notes || null})
    RETURNING id;
  `;
  const transactionId = txnRows[0].id as number;

  let discrepancies = 0;
  for (const l of allLines) {
    const { rows } = await sql`
      SELECT COALESCE(quantity, 0) AS quantity FROM inventory WHERE item_id = ${l.itemId};
    `;
    const systemQty = rows[0]?.quantity ?? 0;
    const discrepancy = l.countedQuantity - systemQty;
    if (discrepancy !== 0) discrepancies += 1;

    await sql`
      INSERT INTO audit_counts
        (item_id, counted_quantity, system_quantity, discrepancy, volunteer_id)
      VALUES (${l.itemId}, ${l.countedQuantity}, ${systemQty}, ${discrepancy}, ${session.userId});
    `;
    await sql`
      INSERT INTO transaction_items (transaction_id, item_id, quantity, point_value_at_time)
      VALUES (${transactionId}, ${l.itemId}, ${l.countedQuantity}, 0);
    `;
    // A physical count is the source of truth — set inventory to the counted
    // amount. Fall back to an INSERT if the item has no inventory row yet, so a
    // count can never silently fail to apply.
    const upd = await sql`
      UPDATE inventory
      SET quantity = ${l.countedQuantity}, last_updated = now()
      WHERE item_id = ${l.itemId};
    `;
    if (upd.rowCount === 0) {
      await sql`
        INSERT INTO inventory (item_id, quantity)
        VALUES (${l.itemId}, ${l.countedQuantity});
      `;
    }
  }

  // Refresh any cached views so the new counts show immediately for everyone.
  revalidatePath("/dashboard/admin/inventory");
  revalidatePath("/dashboard/count");
  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/admin");

  return { success: true, recorded: allLines.length, discrepancies };
}
