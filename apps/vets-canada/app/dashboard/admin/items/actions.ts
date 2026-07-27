"use server";

import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { resetCatalog, recomputeItemPrice } from "@/lib/init";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

const PATH = "/dashboard/admin/items";

/**
 * Wipe the catalog and stock/transaction history and reload the default
 * food-bank basics. Manager only. Does not affect users or clients.
 */
export async function resetCatalogAction(): Promise<ActionResult> {
  await requirePermission("items");
  await resetCatalog();
  revalidatePath(PATH);
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}

export async function createCategoryAction(
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("items");
  const name = String(formData.get("name") || "").trim();
  const pointValue = Math.max(0, Number(formData.get("pointValue")) || 0);
  if (!name) return { success: false, error: "Category name is required." };

  const { rows } = await sql`SELECT COALESCE(MAX(display_order), 0) + 1 AS next FROM categories;`;
  await sql`
    INSERT INTO categories (name, point_value, display_order)
    VALUES (${name}, ${pointValue}, ${rows[0].next});
  `;
  revalidatePath(PATH);
  return { success: true };
}

export async function updateCategoryAction(
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("items");
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const pointValue = Math.max(0, Number(formData.get("pointValue")) || 0);
  if (!id || !name) return { success: false, error: "Name is required." };
  await sql`UPDATE categories SET name = ${name}, point_value = ${pointValue} WHERE id = ${id};`;
  revalidatePath(PATH);
  return { success: true };
}

export async function createItemAction(
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("items");
  const categoryId = Number(formData.get("categoryId"));
  const name = String(formData.get("name") || "").trim();
  const unitPrice = Math.max(0, Number(formData.get("unitPrice")) || 0);
  const unitWeight = Math.max(0, Number(formData.get("unitWeight")) || 0);
  const pointRaw = String(formData.get("pointValue") || "").trim();
  const pointValue = pointRaw === "" ? null : Math.max(0, Number(pointRaw) || 0);
  if (!categoryId || !name) return { success: false, error: "Item name is required." };

  const { rows } = await sql`
    SELECT COALESCE(MAX(display_order), 0) + 1 AS next FROM items WHERE category_id = ${categoryId};
  `;
  const { rows: itemRows } = await sql`
    INSERT INTO items (category_id, name, unit_price, unit_weight, point_value, display_order, is_active)
    VALUES (${categoryId}, ${name}, ${unitPrice}, ${unitWeight}, ${pointValue}, ${rows[0].next}, true)
    RETURNING id;
  `;
  await sql`INSERT INTO inventory (item_id, quantity) VALUES (${itemRows[0].id}, 0);`;
  revalidatePath(PATH);
  return { success: true };
}

export async function updateItemAction(
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("items");
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const unitPrice = Math.max(0, Number(formData.get("unitPrice")) || 0);
  const unitWeight = Math.max(0, Number(formData.get("unitWeight")) || 0);
  const pointRaw = String(formData.get("pointValue") || "").trim();
  const pointValue = pointRaw === "" ? null : Math.max(0, Number(pointRaw) || 0);
  if (!id || !name) return { success: false, error: "Name is required." };
  await sql`UPDATE items SET name = ${name}, unit_price = ${unitPrice}, unit_weight = ${unitWeight}, point_value = ${pointValue} WHERE id = ${id};`;
  revalidatePath(PATH);
  return { success: true };
}

export async function addItemPriceAction(
  itemId: number,
  store: string,
  price: number
): Promise<ActionResult> {
  await requirePermission("items");
  const s = store.trim();
  if (!itemId || !s) return { success: false, error: "Store name is required." };
  await sql`
    INSERT INTO item_prices (item_id, store, price)
    VALUES (${itemId}, ${s}, ${Math.max(0, price || 0)});
  `;
  await recomputeItemPrice(itemId);
  revalidatePath(PATH);
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}

export async function deleteItemPriceAction(
  priceId: number
): Promise<ActionResult> {
  await requirePermission("items");
  const { rows } = await sql`
    DELETE FROM item_prices WHERE id = ${priceId} RETURNING item_id;
  `;
  if (rows[0]?.item_id) await recomputeItemPrice(rows[0].item_id);
  revalidatePath(PATH);
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}

export async function toggleItemActiveAction(
  id: number,
  isActive: boolean
): Promise<ActionResult> {
  await requirePermission("items");
  await sql`UPDATE items SET is_active = ${isActive} WHERE id = ${id};`;
  revalidatePath(PATH);
  return { success: true };
}

/**
 * Permanently delete an item. Refused if it appears in any past record
 * (visits/donations/counts/orders) so history and reports stay intact —
 * disable those instead. Safe deletes cascade to inventory & store prices.
 */
export async function deleteItemAction(id: number): Promise<ActionResult> {
  await requirePermission("items");
  if (!id) return { success: false, error: "Invalid item." };
  const { rows } = await sql`
    SELECT
      (SELECT COUNT(*) FROM transaction_items WHERE item_id = ${id})::int AS txn,
      (SELECT COUNT(*) FROM order_items WHERE item_id = ${id})::int AS ord;
  `;
  if ((rows[0].txn ?? 0) > 0 || (rows[0].ord ?? 0) > 0) {
    return {
      success: false,
      error:
        "This item appears in past visit, donation, or order records — deleting it would erase that history. Disable it instead to hide it from shopping.",
    };
  }
  await sql`DELETE FROM items WHERE id = ${id};`;
  revalidatePath(PATH);
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}

/**
 * Permanently delete a category and all its items. Refused if any of its
 * items appear in past records. Safe deletes cascade to items, inventory,
 * and store prices.
 */
export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  await requirePermission("items");
  if (!id) return { success: false, error: "Invalid category." };
  const { rows } = await sql`
    SELECT
      (SELECT COUNT(*) FROM transaction_items ti
        JOIN items i ON i.id = ti.item_id WHERE i.category_id = ${id})::int AS txn,
      (SELECT COUNT(*) FROM order_items oi
        JOIN items i ON i.id = oi.item_id WHERE i.category_id = ${id})::int AS ord;
  `;
  if ((rows[0].txn ?? 0) > 0 || (rows[0].ord ?? 0) > 0) {
    return {
      success: false,
      error:
        "This category has items that appear in past records, so deleting it would erase that history. Disable those items instead.",
    };
  }
  await sql`DELETE FROM categories WHERE id = ${id};`;
  revalidatePath(PATH);
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}

/** Swap display_order with the adjacent category (direction: -1 up, +1 down). */
export async function moveCategoryAction(
  id: number,
  direction: -1 | 1
): Promise<ActionResult> {
  await requirePermission("items");
  const { rows } = await sql`SELECT id, display_order FROM categories ORDER BY display_order, name;`;
  const idx = rows.findIndex((r) => r.id === id);
  const swapIdx = idx + direction;
  if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return { success: true };
  const a = rows[idx];
  const b = rows[swapIdx];
  await sql`UPDATE categories SET display_order = ${b.display_order} WHERE id = ${a.id};`;
  await sql`UPDATE categories SET display_order = ${a.display_order} WHERE id = ${b.id};`;
  revalidatePath(PATH);
  return { success: true };
}

/** Swap display_order with the adjacent item within the same category. */
export async function moveItemAction(
  id: number,
  categoryId: number,
  direction: -1 | 1
): Promise<ActionResult> {
  await requirePermission("items");
  const { rows } = await sql`
    SELECT id, display_order FROM items WHERE category_id = ${categoryId} ORDER BY display_order, name;
  `;
  const idx = rows.findIndex((r) => r.id === id);
  const swapIdx = idx + direction;
  if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return { success: true };
  const a = rows[idx];
  const b = rows[swapIdx];
  await sql`UPDATE items SET display_order = ${b.display_order} WHERE id = ${a.id};`;
  await sql`UPDATE items SET display_order = ${a.display_order} WHERE id = ${b.id};`;
  revalidatePath(PATH);
  return { success: true };
}
