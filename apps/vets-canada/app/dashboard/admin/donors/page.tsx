import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import DonorsManager, { type DonorRow } from "./DonorsManager";

export const dynamic = "force-dynamic";

export default async function DonorsPage() {
  await requirePermission("donors");

  const { rows } = await sql`
    SELECT d.id, d.name, d.contact, d.email, d.address, d.notes, d.is_active,
           COALESCE(SUM(ti.quantity), 0)::int AS items,
           COALESCE(ROUND(SUM(ti.quantity * i.unit_price), 2), 0) AS value,
           COALESCE(ROUND(SUM(ti.quantity * i.unit_weight), 2), 0) AS weight,
           MAX(t.created_at) AS last_donation
    FROM donors d
    LEFT JOIN transactions t ON t.donor_id = d.id AND t.type = 'stock_in'
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    LEFT JOIN items i ON i.id = ti.item_id
    GROUP BY d.id
    ORDER BY d.is_active DESC, d.name;
  `;

  const donors: DonorRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    contact: r.contact,
    email: r.email,
    address: r.address,
    notes: r.notes,
    isActive: r.is_active,
    items: r.items,
    value: Number(r.value),
    weight: Number(r.weight),
    lastDonation: r.last_donation ? new Date(r.last_donation).toLocaleDateString() : null,
  }));

  return <DonorsManager donors={donors} />;
}
