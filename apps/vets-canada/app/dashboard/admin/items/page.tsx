import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import ItemsManager, { type AdminCategory } from "./ItemsManager";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  await requirePermission("items");
  const { rows } = await sql`
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.point_value,
      c.display_order AS cat_order,
      i.id AS item_id,
      i.name AS item_name,
      i.unit_price,
      i.unit_weight,
      i.point_value AS item_point_value,
      i.is_active,
      i.display_order AS item_order
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    ORDER BY c.display_order, c.name, i.display_order, i.name;
  `;

  const map = new Map<number, AdminCategory>();
  for (const r of rows) {
    let cat = map.get(r.category_id);
    if (!cat) {
      cat = {
        id: r.category_id,
        name: r.category_name,
        pointValue: r.point_value,
        items: [],
      };
      map.set(r.category_id, cat);
    }
    if (r.item_id) {
      cat.items.push({
        id: r.item_id,
        name: r.item_name,
        unitPrice: Number(r.unit_price),
        unitWeight: Number(r.unit_weight),
        pointValue: r.item_point_value === null ? null : Number(r.item_point_value),
        categoryPointValue: Number(r.point_value),
        isActive: r.is_active,
        prices: [],
      });
    }
  }

  // Attach store prices to each item.
  const { rows: priceRows } = await sql`
    SELECT id, item_id, store, price FROM item_prices ORDER BY store;
  `;
  const itemIndex = new Map<number, { id: number; store: string; price: number }[]>();
  const cats = Array.from(map.values());
  for (const cat of cats) {
    for (const it of cat.items) itemIndex.set(it.id, it.prices);
  }
  for (const p of priceRows) {
    const arr = itemIndex.get(p.item_id);
    if (arr) arr.push({ id: p.id, store: p.store, price: Number(p.price) });
  }

  return <ItemsManager categories={cats} />;
}
