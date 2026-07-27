import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import CashManager, { type CashRow, type DonorOption } from "./CashManager";

export const dynamic = "force-dynamic";

export default async function CashDonationsPage() {
  await requirePermission("donors");

  const { rows } = await sql`
    SELECT cd.id, cd.method, cd.amount, cd.gift_card_store, cd.donation_date,
           cd.notes, cd.tax_receipt_needed,
           COALESCE(d.name, cd.donor_name) AS donor, u.name AS recorded_by
    FROM cash_donations cd
    LEFT JOIN donors d ON d.id = cd.donor_id
    LEFT JOIN users u ON u.id = cd.recorded_by
    ORDER BY cd.donation_date DESC, cd.id DESC
    LIMIT 500;
  `;
  const donations: CashRow[] = rows.map((r) => ({
    id: r.id,
    method: r.method,
    amount: Number(r.amount),
    giftCardStore: r.gift_card_store,
    date: new Date(r.donation_date).toLocaleDateString(),
    donor: r.donor,
    notes: r.notes,
    recordedBy: r.recorded_by,
    taxReceiptNeeded: r.tax_receipt_needed,
  }));

  const { rows: totalRows } = await sql`
    SELECT method, ROUND(SUM(amount), 2) AS total FROM cash_donations GROUP BY method ORDER BY total DESC;
  `;
  const byMethod = totalRows.map((r) => ({ method: r.method, total: Number(r.total) }));
  const { rows: grand } = await sql`SELECT COALESCE(ROUND(SUM(amount),2),0) AS total FROM cash_donations;`;

  const { rows: donorRows } = await sql`SELECT id, name FROM donors WHERE is_active = true ORDER BY name;`;
  const donors: DonorOption[] = donorRows.map((r) => ({ id: r.id, name: r.name }));

  return (
    <CashManager
      donations={donations}
      byMethod={byMethod}
      total={Number(grand[0]?.total ?? 0)}
      donors={donors}
    />
  );
}
