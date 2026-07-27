import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import EntriesManager, { type EntryRow, type CatalogItemLite } from "./EntriesManager";

export const dynamic = "force-dynamic";

export default async function EntriesPage() {
  await requirePermission("entries");

  const { rows } = await sql`
    SELECT
      t.id,
      t.type,
      t.created_at,
      t.notes,
      u.name AS who,
      cl.name AS client,
      COALESCE(SUM(ti.quantity), 0)::int AS items
    FROM transactions t
    LEFT JOIN users u ON u.id = t.volunteer_id
    LEFT JOIN clients cl ON cl.id = t.client_id
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    GROUP BY t.id, t.type, t.created_at, t.notes, u.name, cl.name
    ORDER BY t.created_at DESC
    LIMIT 200;
  `;

  const entries: EntryRow[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    date: new Date(r.created_at).toLocaleString(),
    who: r.who,
    client: r.client,
    items: r.items,
    detail: r.notes || `${r.items} item(s)`,
  }));

  // Active items, for adding a missed item onto an entry.
  const { rows: itemRows } = await sql`
    SELECT i.id, i.name, c.name AS category
    FROM items i JOIN categories c ON c.id = i.category_id
    WHERE i.is_active = true
    ORDER BY c.name, i.name;
  `;
  const catalog: CatalogItemLite[] = itemRows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
  }));

  return <EntriesManager entries={entries} catalog={catalog} />;
}
