"use server";

import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface OrderItem {
  id: number;
  itemName: string;
  category: string;
  quantity: number;
  points: number;
  inStock: number;
}

export async function getOrderItemsAction(orderId: number): Promise<OrderItem[]> {
  await requirePermission("orders");
  const { rows } = await sql`
    SELECT oi.id, i.name AS item_name, c.name AS category, oi.quantity,
           (oi.quantity * oi.point_value_at_time) AS points,
           COALESCE(inv.quantity, 0) AS in_stock
    FROM order_items oi
    JOIN items i ON i.id = oi.item_id
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN inventory inv ON inv.item_id = oi.item_id
    WHERE oi.order_id = ${orderId}
    ORDER BY c.name, i.name;
  `;
  return rows.map((r) => ({
    id: r.id,
    itemName: r.item_name,
    category: r.category,
    quantity: r.quantity,
    points: r.points,
    inStock: r.in_stock,
  }));
}

/**
 * Fulfill a delivery order: record it as a client visit (stock_out),
 * deduct inventory, and mark the order fulfilled.
 */
export async function fulfillOrderAction(orderId: number): Promise<ActionResult> {
  const session = await requirePermission("orders");

  const { rows: orderRows } = await sql`
    SELECT client_id, status, notes FROM orders WHERE id = ${orderId};
  `;
  if (orderRows.length === 0) return { success: false, error: "Order not found." };
  if (orderRows[0].status !== "pending")
    return { success: false, error: "This order has already been handled." };

  const clientId = orderRows[0].client_id as number;
  const { rows: items } = await sql`
    SELECT item_id, quantity, point_value_at_time FROM order_items WHERE order_id = ${orderId};
  `;

  const { rows: txn } = await sql`
    INSERT INTO transactions (type, client_id, volunteer_id, notes)
    VALUES ('stock_out', ${clientId}, ${session.userId}, ${`Delivery order #${orderId}` + (orderRows[0].notes ? ` — ${orderRows[0].notes}` : "")})
    RETURNING id;
  `;
  const txnId = txn[0].id as number;

  for (const it of items) {
    await sql`
      INSERT INTO transaction_items (transaction_id, item_id, quantity, point_value_at_time)
      VALUES (${txnId}, ${it.item_id}, ${it.quantity}, ${it.point_value_at_time});
    `;
    await sql`
      UPDATE inventory SET quantity = GREATEST(0, quantity - ${it.quantity}), last_updated = now()
      WHERE item_id = ${it.item_id};
    `;
  }

  await sql`
    UPDATE orders SET status = 'fulfilled', fulfilled_at = now(), fulfilled_by = ${session.userId}
    WHERE id = ${orderId};
  `;
  revalidatePath("/dashboard/admin/orders");
  revalidatePath("/dashboard/admin/inventory");
  return { success: true };
}

export async function cancelOrderAction(orderId: number): Promise<ActionResult> {
  await requirePermission("orders");
  await sql`UPDATE orders SET status = 'cancelled' WHERE id = ${orderId} AND status = 'pending';`;
  revalidatePath("/dashboard/admin/orders");
  return { success: true };
}
