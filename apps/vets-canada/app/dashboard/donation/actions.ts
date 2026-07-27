"use server";

import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface DonationLineInput {
  itemId: number;
  quantity: number;
  expiryDate?: string | null;
}

/** A brand-new item typed in by the volunteer, to be created on submit. */
export interface NewItemInput {
  categoryId: number;
  name: string;
  quantity: number;
  expiryDate?: string | null;
}

export interface DonationResult {
  success: boolean;
  error?: string;
  totalItems?: number;
}

export interface DonorInput {
  donorId?: number | null;
  newDonorName?: string;
}

export async function logDonationAction(
  lines: DonationLineInput[],
  notes: string,
  newItems: NewItemInput[] = [],
  donor: DonorInput = {}
): Promise<DonationResult> {
  const session = await requireAuth();

  const clean = lines.filter((l) => l.quantity > 0);
  const cleanNew = newItems.filter(
    (n) => n.quantity > 0 && n.name.trim() !== ""
  );
  if (clean.length === 0 && cleanNew.length === 0) {
    return { success: false, error: "Enter a quantity for at least one item." };
  }

  // Create any typed-in custom items first, then treat them like normal lines.
  for (const n of cleanNew) {
    const name = n.name.trim();
    // Reuse an existing item with the same name in this category if present.
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
    clean.push({ itemId, quantity: n.quantity, expiryDate: n.expiryDate ?? null });
  }

  // Resolve donor: use selected donor, or create a new one from a typed name.
  let donorId: number | null = donor.donorId ?? null;
  const newName = (donor.newDonorName || "").trim();
  if (!donorId && newName) {
    const existing = await sql`SELECT id FROM donors WHERE lower(name) = lower(${newName});`;
    if (existing.rows.length > 0) {
      donorId = existing.rows[0].id as number;
    } else {
      const created = await sql`INSERT INTO donors (name) VALUES (${newName}) RETURNING id;`;
      donorId = created.rows[0].id as number;
    }
  }

  const { rows: txnRows } = await sql`
    INSERT INTO transactions (type, volunteer_id, donor_id, notes)
    VALUES ('stock_in', ${session.userId}, ${donorId}, ${notes || null})
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
    const expiry = l.expiryDate && l.expiryDate.trim() !== "" ? l.expiryDate : null;
    if (expiry) {
      await sql`
        UPDATE inventory
        SET quantity = quantity + ${l.quantity},
            expiry_date = ${expiry},
            last_updated = now()
        WHERE item_id = ${l.itemId};
      `;
    } else {
      await sql`
        UPDATE inventory
        SET quantity = quantity + ${l.quantity},
            last_updated = now()
        WHERE item_id = ${l.itemId};
      `;
    }
  }

  revalidatePath("/dashboard/admin/inventory");
  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/admin");

  return { success: true, totalItems: total };
}
