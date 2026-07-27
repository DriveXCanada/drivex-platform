import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import OrdersManager, { type OrderRow } from "./OrdersManager";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requirePermission("orders");

  const { rows } = await sql`
    SELECT o.id, o.status, o.points_used, o.notes, o.created_at,
           o.gift_card_requested, o.gift_card_details,
           cl.name AS client_name, cl.client_id, cl.address, cl.contact,
           u.name AS fulfilled_by,
           COALESCE(SUM(oi.quantity), 0)::int AS items
    FROM orders o
    JOIN clients cl ON cl.id = o.client_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN users u ON u.id = o.fulfilled_by
    GROUP BY o.id, cl.name, cl.client_id, cl.address, cl.contact, u.name
    ORDER BY (o.status = 'pending') DESC, o.created_at DESC
    LIMIT 200;
  `;

  const orders: OrderRow[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    points: r.points_used,
    notes: r.notes,
    date: new Date(r.created_at).toLocaleString(),
    clientName: r.client_name,
    clientId: r.client_id,
    address: r.address,
    contact: r.contact,
    items: r.items,
    fulfilledBy: r.fulfilled_by,
    giftCardRequested: r.gift_card_requested,
    giftCardDetails: r.gift_card_details,
  }));

  return <OrdersManager orders={orders} />;
}
