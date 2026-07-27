"use server";

import { sql } from "@/lib/db";
import { ensureInitialized } from "@/lib/init";
import { verifyPin } from "@/lib/auth";
import {
  createClientSession,
  destroyClientSession,
  getClientSession,
} from "@/lib/client-auth";
import { revalidatePath } from "next/cache";

export interface PortalResult {
  success: boolean;
  error?: string;
  pointsUsed?: number;
}

export async function clientLoginAction(
  clientIdRaw: string,
  pinRaw: string
): Promise<PortalResult> {
  await ensureInitialized();
  const cid = (clientIdRaw || "").trim();
  const pin = (pinRaw || "").trim();
  if (!cid) return { success: false, error: "Please enter your Client ID." };
  if (!pin) return { success: false, error: "Please enter your PIN." };

  const { rows } = await sql`
    SELECT id, client_id, name, is_active, delivery_approved, portal_pin
    FROM clients WHERE lower(client_id) = lower(${cid});
  `;
  // Generic message for not-found / wrong-pin so IDs can't be probed.
  const generic = { success: false, error: "Incorrect Client ID or PIN." };
  if (rows.length === 0) return generic;
  const c = rows[0];
  if (!c.is_active) {
    return { success: false, error: "This account isn't active. Please contact the food bank." };
  }
  if (!c.delivery_approved) {
    return {
      success: false,
      error: "Your account isn't approved for delivery ordering yet. Please contact the food bank.",
    };
  }
  if (!c.portal_pin) {
    return { success: false, error: "No portal PIN is set for this account yet. Please contact the food bank." };
  }
  const ok = await verifyPin(pin, c.portal_pin);
  if (!ok) return generic;

  await createClientSession({ clientPk: c.id, clientId: c.client_id, name: c.name });
  return { success: true };
}

export async function clientLogoutAction(): Promise<void> {
  await destroyClientSession();
}

export interface OrderLineInput {
  itemId: number;
  quantity: number;
}

export async function submitOrderAction(
  lines: OrderLineInput[],
  notes: string,
  giftCardRequested = false,
  giftCardDetails = ""
): Promise<PortalResult> {
  const session = await getClientSession();
  if (!session) {
    return { success: false, error: "Your session expired — please sign in again." };
  }
  const clean = lines.filter((l) => l.quantity > 0);
  const wantsGiftCard = !!giftCardRequested;
  if (clean.length === 0 && !wantsGiftCard) {
    return { success: false, error: "Add at least one item to your order." };
  }

  const itemIds = clean.map((l) => l.itemId);
  const { rows: itemRows } = await sql.query(
    `SELECT i.id AS item_id, i.name, i.shop_limit,
            COALESCE(i.point_value, c.point_value) AS point_value
     FROM items i JOIN categories c ON c.id = i.category_id
     WHERE i.id = ANY($1::int[])`,
    [itemIds]
  );
  const pmap = new Map<number, number>(itemRows.map((r) => [r.item_id, r.point_value]));
  const lmap = new Map<number, { limit: number | null; name: string }>(
    itemRows.map((r) => [r.item_id, { limit: r.shop_limit, name: r.name }])
  );

  // Enforce per-item shop limits (backstop for the UI).
  for (const l of clean) {
    const info = lmap.get(l.itemId);
    if (info && info.limit != null && l.quantity > info.limit) {
      return { success: false, error: `${info.name} is limited to ${info.limit} per order.` };
    }
  }

  let points = 0;
  for (const l of clean) points += (pmap.get(l.itemId) ?? 0) * l.quantity;

  const { rows: orderRows } = await sql`
    INSERT INTO orders (client_id, status, points_used, notes, gift_card_requested, gift_card_details)
    VALUES (${session.clientPk}, 'pending', ${points}, ${notes || null},
            ${wantsGiftCard}, ${wantsGiftCard ? (giftCardDetails.trim() || null) : null})
    RETURNING id;
  `;
  const orderId = orderRows[0].id as number;
  for (const l of clean) {
    const pv = pmap.get(l.itemId) ?? 0;
    await sql`
      INSERT INTO order_items (order_id, item_id, quantity, point_value_at_time)
      VALUES (${orderId}, ${l.itemId}, ${l.quantity}, ${pv});
    `;
  }
  revalidatePath("/dashboard/admin/orders");
  return { success: true, pointsUsed: points };
}
