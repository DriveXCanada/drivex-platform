"use server";

import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { searchClients, type ClientRecord } from "@/lib/queries";
import { revalidatePath } from "next/cache";

export async function searchClientsAction(
  term: string
): Promise<ClientRecord[]> {
  await requireAuth();
  if (!term || term.trim().length === 0) return [];
  return searchClients(term);
}

export interface MonthStatus {
  shoppedThisMonth: boolean;
  lastVisit: string | null;
}

/** Has this client already shopped in the current calendar month? */
export async function getClientMonthStatusAction(
  clientId: number
): Promise<MonthStatus> {
  await requireAuth();
  const { rows } = await sql`
    SELECT
      MAX(created_at) AS last_visit,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS this_month
    FROM transactions
    WHERE type = 'stock_out' AND client_id = ${clientId};
  `;
  return {
    shoppedThisMonth: (rows[0]?.this_month ?? 0) > 0,
    lastVisit: rows[0]?.last_visit ? new Date(rows[0].last_visit).toLocaleDateString() : null,
  };
}

export interface VisitLineInput {
  itemId: number;
  quantity: number;
}

export interface GiftCardInput {
  store: string;
  amount: number;
}

export interface ConfirmVisitResult {
  success: boolean;
  error?: string;
  transactionId?: number;
  pointsUsed?: number;
}

export async function confirmVisitAction(
  clientId: number,
  lines: VisitLineInput[],
  notes: string,
  giftCards: GiftCardInput[] = []
): Promise<ConfirmVisitResult> {
  const session = await requireAuth();

  const cleanLines = lines.filter((l) => l.quantity > 0);
  const cleanCards = giftCards.filter((g) => g.amount > 0 || g.store.trim() !== "");
  if (cleanLines.length === 0 && cleanCards.length === 0) {
    return { success: false, error: "No items selected." };
  }

  // Look up point values (snapshot) and shop limits for each item.
  const itemIds = cleanLines.map((l) => l.itemId);
  const { rows: itemRows } = await sql.query(
    `SELECT i.id AS item_id, i.name, i.shop_limit,
            COALESCE(i.point_value, c.point_value) AS point_value
     FROM items i JOIN categories c ON c.id = i.category_id
     WHERE i.id = ANY($1::int[])`,
    [itemIds]
  );
  const pointMap = new Map<number, number>(
    itemRows.map((r) => [r.item_id, r.point_value])
  );
  const limitMap = new Map<number, { limit: number | null; name: string }>(
    itemRows.map((r) => [r.item_id, { limit: r.shop_limit, name: r.name }])
  );

  // Enforce per-item shop limits (backstop for the UI).
  for (const l of cleanLines) {
    const info = limitMap.get(l.itemId);
    if (info && info.limit != null && l.quantity > info.limit) {
      return {
        success: false,
        error: `${info.name} is limited to ${info.limit} per visit.`,
      };
    }
  }

  let pointsUsed = 0;
  for (const l of cleanLines) {
    pointsUsed += (pointMap.get(l.itemId) ?? 0) * l.quantity;
  }

  // Create the stock_out transaction.
  const { rows: txnRows } = await sql`
    INSERT INTO transactions (type, client_id, volunteer_id, notes)
    VALUES ('stock_out', ${clientId}, ${session.userId}, ${notes || null})
    RETURNING id;
  `;
  const transactionId = txnRows[0].id as number;

  for (const l of cleanLines) {
    const pv = pointMap.get(l.itemId) ?? 0;
    await sql`
      INSERT INTO transaction_items (transaction_id, item_id, quantity, point_value_at_time)
      VALUES (${transactionId}, ${l.itemId}, ${l.quantity}, ${pv});
    `;
    // Deduct from inventory (allow going to zero, not below).
    await sql`
      UPDATE inventory
      SET quantity = GREATEST(0, quantity - ${l.quantity}),
          last_updated = now()
      WHERE item_id = ${l.itemId};
    `;
  }

  // Record any gift cards given to the client on this visit.
  for (const g of cleanCards) {
    await sql`
      INSERT INTO visit_gift_cards (transaction_id, store, amount)
      VALUES (${transactionId}, ${g.store.trim() || null}, ${Math.max(0, g.amount || 0)});
    `;
  }

  revalidatePath("/dashboard/admin/inventory");
  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/admin");

  return { success: true, transactionId, pointsUsed };
}
