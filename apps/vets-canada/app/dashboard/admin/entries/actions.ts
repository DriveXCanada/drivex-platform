"use server";

import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Delete a transaction entered in error and reverse its effect on inventory:
 *  - stock_in  (donation)  → remove the added stock
 *  - stock_out (visit)     → return the stock
 *  - waste     (write-off) → return the stock
 *  - audit     (count)     → no inventory change (count set an absolute value)
 */
export async function deleteEntryAction(
  transactionId: number
): Promise<ActionResult> {
  await requirePermission("entries");

  const { rows: txn } = await sql`SELECT type FROM transactions WHERE id = ${transactionId};`;
  if (txn.length === 0) return { success: false, error: "Entry not found." };
  const type = txn[0].type as string;

  const { rows: items } = await sql`
    SELECT item_id, quantity FROM transaction_items WHERE transaction_id = ${transactionId};
  `;

  for (const it of items) {
    if (type === "stock_in") {
      await sql`UPDATE inventory SET quantity = GREATEST(0, quantity - ${it.quantity}), last_updated = now() WHERE item_id = ${it.item_id};`;
    } else if (type === "stock_out" || type === "waste") {
      await sql`UPDATE inventory SET quantity = quantity + ${it.quantity}, last_updated = now() WHERE item_id = ${it.item_id};`;
    }
    // audit: leave inventory as-is
  }

  await sql`DELETE FROM transactions WHERE id = ${transactionId};`;
  revalidatePath("/dashboard/admin/entries");
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}

export interface EntryItem {
  id: number;
  itemId: number;
  itemName: string;
  quantity: number;
  type: string;
}

/** Line items for one transaction (for editing individual lines). */
export async function getEntryItemsAction(
  transactionId: number
): Promise<EntryItem[]> {
  await requirePermission("entries");
  const { rows } = await sql`
    SELECT ti.id, ti.item_id, ti.quantity, i.name AS item_name, t.type
    FROM transaction_items ti
    JOIN items i ON i.id = ti.item_id
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE ti.transaction_id = ${transactionId}
    ORDER BY i.name;
  `;
  return rows.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    itemName: r.item_name,
    quantity: r.quantity,
    type: r.type,
  }));
}

/** Apply the inventory delta for a change of `oldQty` -> `newQty` on one line. */
async function adjustInventory(
  type: string,
  itemId: number,
  oldQty: number,
  newQty: number
) {
  if (type === "stock_in") {
    // donation: inventory holds +oldQty; move to +newQty
    await sql`UPDATE inventory SET quantity = GREATEST(0, quantity + ${newQty - oldQty}), last_updated = now() WHERE item_id = ${itemId};`;
  } else if (type === "stock_out" || type === "waste") {
    // visit/write-off: inventory holds -oldQty; move to -newQty
    await sql`UPDATE inventory SET quantity = GREATEST(0, quantity + ${oldQty - newQty}), last_updated = now() WHERE item_id = ${itemId};`;
  }
  // audit: count is absolute; leave inventory as-is
}

/** Edit a single line item's quantity, adjusting inventory accordingly. */
export async function updateEntryItemAction(
  rowId: number,
  newQuantity: number
): Promise<ActionResult> {
  await requirePermission("entries");
  const qty = Math.max(0, Math.floor(newQuantity || 0));
  const { rows } = await sql`
    SELECT ti.item_id, ti.quantity, t.type
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE ti.id = ${rowId};
  `;
  if (rows.length === 0) return { success: false, error: "Line not found." };
  const { item_id, quantity: oldQty, type } = rows[0];

  if (qty === 0) {
    // Removing the line entirely.
    return deleteEntryItemAction(rowId);
  }

  await adjustInventory(type, item_id, oldQty, qty);
  await sql`UPDATE transaction_items SET quantity = ${qty} WHERE id = ${rowId};`;
  revalidatePath("/dashboard/admin/entries");
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}

/**
 * Add a missed item onto an existing entry (e.g. a client visit), adjusting
 * inventory. If the item is already on the entry, its quantity is increased.
 */
export async function addEntryItemAction(
  transactionId: number,
  itemId: number,
  quantity: number
): Promise<ActionResult> {
  await requirePermission("entries");
  const qty = Math.max(1, Math.floor(quantity || 0));
  if (!transactionId || !itemId) return { success: false, error: "Choose an item." };

  const { rows: txn } = await sql`SELECT type FROM transactions WHERE id = ${transactionId};`;
  if (txn.length === 0) return { success: false, error: "Entry not found." };
  const type = txn[0].type as string;

  // Credits only matter for client visits (stock_out); use the item's
  // effective point value (its override, else the category default).
  let pointValue = 0;
  if (type === "stock_out") {
    const { rows: pv } = await sql`
      SELECT COALESCE(i.point_value, c.point_value) AS pv
      FROM items i JOIN categories c ON c.id = i.category_id
      WHERE i.id = ${itemId};
    `;
    pointValue = Number(pv[0]?.pv ?? 0);
  }

  const { rows: existing } = await sql`
    SELECT id, quantity FROM transaction_items
    WHERE transaction_id = ${transactionId} AND item_id = ${itemId};
  `;
  if (existing.length > 0) {
    const oldQty = existing[0].quantity as number;
    const newQty = oldQty + qty;
    await adjustInventory(type, itemId, oldQty, newQty);
    await sql`UPDATE transaction_items SET quantity = ${newQty} WHERE id = ${existing[0].id};`;
  } else {
    await adjustInventory(type, itemId, 0, qty);
    await sql`
      INSERT INTO transaction_items (transaction_id, item_id, quantity, point_value_at_time)
      VALUES (${transactionId}, ${itemId}, ${qty}, ${pointValue});
    `;
  }

  revalidatePath("/dashboard/admin/entries");
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}

/** Remove a single line item, reversing its inventory effect. */
export async function deleteEntryItemAction(
  rowId: number
): Promise<ActionResult> {
  await requirePermission("entries");
  const { rows } = await sql`
    SELECT ti.transaction_id, ti.item_id, ti.quantity, t.type
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE ti.id = ${rowId};
  `;
  if (rows.length === 0) return { success: false, error: "Line not found." };
  const { transaction_id, item_id, quantity, type } = rows[0];

  // Reverse this line's effect (same as setting its qty to 0).
  await adjustInventory(type, item_id, quantity, 0);
  await sql`DELETE FROM transaction_items WHERE id = ${rowId};`;

  // If the transaction now has no items, remove the empty entry.
  const { rows: remaining } = await sql`
    SELECT COUNT(*)::int AS n FROM transaction_items WHERE transaction_id = ${transaction_id};
  `;
  if ((remaining[0]?.n ?? 0) === 0) {
    await sql`DELETE FROM transactions WHERE id = ${transaction_id};`;
  }

  revalidatePath("/dashboard/admin/entries");
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}
