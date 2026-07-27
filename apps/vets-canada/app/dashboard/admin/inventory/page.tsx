import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import InventoryManager, { type InvRow } from "./InventoryManager";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await requirePermission("inventory");
  const { rows } = await sql`
    SELECT
      i.id AS item_id,
      i.name AS item_name,
      i.unit_price,
      i.unit_weight,
      i.shop_limit,
      c.name AS category_name,
      COALESCE(inv.quantity, 0) AS quantity,
      inv.expiry_date
    FROM items i
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN inventory inv ON inv.item_id = i.id
    WHERE i.is_active = true
    ORDER BY c.display_order, c.name, i.display_order, i.name;
  `;
  const data: InvRow[] = rows.map((r) => ({
    itemId: r.item_id,
    itemName: r.item_name,
    categoryName: r.category_name,
    quantity: r.quantity,
    unitPrice: Number(r.unit_price),
    unitWeight: Number(r.unit_weight),
    shopLimit: r.shop_limit === null ? null : Number(r.shop_limit),
    expiryDate: r.expiry_date ? String(r.expiry_date) : null,
  }));

  return <InventoryManager rows={data} />;
}
