import "server-only";
import { sql } from "@/lib/db";

export interface CatalogItem {
  id: number;
  name: string;
  quantity: number;
  expiryDate: string | null;
  shopLimit: number | null;
  pointValue: number; // effective points (item override, else category default)
  pointOverride: number | null; // the item-level override, if any
}

export interface CatalogCategory {
  id: number;
  name: string;
  pointValue: number; // category default
  items: CatalogItem[];
}

/**
 * Returns all active categories with their active items and current stock.
 * Used by the visit, donation, and count flows.
 */
export async function getCatalog(
  opts: { activeOnly?: boolean } = { activeOnly: true }
): Promise<CatalogCategory[]> {
  const { rows } = await sql`
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.point_value,
      c.display_order AS cat_order,
      i.id AS item_id,
      i.name AS item_name,
      i.display_order AS item_order,
      i.shop_limit,
      i.point_value AS item_point_value,
      COALESCE(inv.quantity, 0) AS quantity,
      inv.expiry_date
    FROM categories c
    JOIN items i ON i.category_id = c.id
    LEFT JOIN inventory inv ON inv.item_id = i.id
    WHERE (${opts.activeOnly ? true : false} = false OR i.is_active = true)
    ORDER BY c.display_order, c.name, i.display_order, i.name;
  `;

  const map = new Map<number, CatalogCategory>();
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
    const override = r.item_point_value === null ? null : Number(r.item_point_value);
    cat.items.push({
      id: r.item_id,
      name: r.item_name,
      quantity: r.quantity,
      expiryDate: r.expiry_date ? String(r.expiry_date) : null,
      shopLimit: r.shop_limit === null ? null : Number(r.shop_limit),
      pointValue: override ?? Number(r.point_value),
      pointOverride: override,
    });
  }
  return Array.from(map.values());
}

export interface ClientRecord {
  id: number;
  clientId: string;
  name: string;
  familySize: number;
  pointBudget: number;
  isActive: boolean;
}

export async function searchClients(term: string): Promise<ClientRecord[]> {
  const q = `%${term.trim()}%`;
  const { rows } = await sql`
    SELECT id, client_id, name, family_size, point_budget, is_active
    FROM clients
    WHERE is_active = true
      AND (name ILIKE ${q} OR client_id ILIKE ${q})
    ORDER BY name
    LIMIT 25;
  `;
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    familySize: r.family_size,
    pointBudget: r.point_budget,
    isActive: r.is_active,
  }));
}

export async function getClientById(id: number): Promise<ClientRecord | null> {
  const { rows } = await sql`
    SELECT id, client_id, name, family_size, point_budget, is_active
    FROM clients WHERE id = ${id};
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    familySize: r.family_size,
    pointBudget: r.point_budget,
    isActive: r.is_active,
  };
}
