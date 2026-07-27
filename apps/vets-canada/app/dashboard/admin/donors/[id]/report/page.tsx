import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import { WEIGHT_UNIT } from "@/lib/units";
import { CHARITY_REG_NUMBER } from "@/lib/org";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  Number(n || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export default async function DonorReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string; to?: string };
}) {
  await requirePermission("donors");
  const id = Number(params.id);
  if (!id) notFound();

  const { rows: dRows } = await sql`SELECT name, contact, email, address FROM donors WHERE id = ${id};`;
  if (dRows.length === 0) notFound();
  const donor = dRows[0];

  const from = searchParams.from || null;
  const to = searchParams.to || null;
  const start = from ? `${from} 00:00:00` : "1900-01-01";
  const end = to ? `${to} 23:59:59` : "2999-01-01";

  // By-item breakdown
  const { rows: itemRows } = await sql`
    SELECT c.name AS category, i.name AS item, SUM(ti.quantity)::int AS qty,
           ROUND(SUM(ti.quantity * i.unit_price), 2) AS value,
           ROUND(SUM(ti.quantity * i.unit_weight), 2) AS weight
    FROM transactions t
    JOIN transaction_items ti ON ti.transaction_id = t.id
    JOIN items i ON i.id = ti.item_id
    JOIN categories c ON c.id = i.category_id
    WHERE t.type = 'stock_in' AND t.donor_id = ${id}
      AND t.created_at BETWEEN ${start} AND ${end}
    GROUP BY c.name, i.name
    ORDER BY c.name, i.name;
  `;

  const totals = itemRows.reduce(
    (a, r) => ({
      qty: a.qty + Number(r.qty),
      value: a.value + Number(r.value),
      weight: a.weight + Number(r.weight),
    }),
    { qty: 0, value: 0, weight: 0 }
  );

  // Monetary donations (cash / e-transfer / gift cards) in the period.
  const { rows: cashRows } = await sql`
    SELECT donation_date, method, amount, gift_card_store
    FROM cash_donations
    WHERE donor_id = ${id} AND donation_date BETWEEN ${from || "1900-01-01"} AND ${to || "2999-01-01"}
    ORDER BY donation_date DESC;
  `;
  const cashTotal = cashRows.reduce((a, r) => a + Number(r.amount), 0);

  const { rows: dateRows } = await sql`
    SELECT created_at, COUNT(*)::int AS lines FROM (
      SELECT t.created_at FROM transactions t WHERE t.type='stock_in' AND t.donor_id=${id}
        AND t.created_at BETWEEN ${start} AND ${end}
    ) x GROUP BY created_at ORDER BY created_at DESC;
  `;

  const rangeLabel = from || to ? `${from || "start"} → ${to || "today"}` : "All time";

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/dashboard/admin/donors" className="btn-outline text-sm">← Back</Link>
        <PrintButton />
      </div>

      <div className="border-b-2 border-navy pb-3">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-navy">
          VETS Canada — Dartmouth
        </h1>
        <p className="text-xs uppercase tracking-widest text-gold">
          Donation Summary · Proudly Supported by DriveX
        </p>
      </div>

      <div className="mt-4">
        <h2 className="font-heading text-xl font-bold text-navy">{donor.name}</h2>
        {(donor.contact || donor.email || donor.address) && (
          <p className="text-sm text-charcoal/70">
            {[donor.contact, donor.email, donor.address].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-1 text-xs text-charcoal/50">
          Period: {rangeLabel} · Generated {new Date().toLocaleString()}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: "Items Donated", value: totals.qty.toLocaleString("en-CA") },
          { label: "Estimated Value", value: money(totals.value) },
          { label: `Total Weight`, value: `${totals.weight.toLocaleString("en-CA", { maximumFractionDigits: 1 })} ${WEIGHT_UNIT}` },
        ].map((s) => (
          <div key={s.label} className="rounded border border-black/10 p-3 text-center">
            <p className="text-2xl font-bold text-navy">{s.value}</p>
            <p className="text-xs text-charcoal/60">{s.label}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-heading text-lg font-bold text-navy">Items Donated</h3>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-black/20 text-left">
            <th className="py-1">Category</th>
            <th className="py-1">Item</th>
            <th className="py-1">Qty</th>
            <th className="py-1">Value</th>
            <th className="py-1">Weight</th>
          </tr>
        </thead>
        <tbody>
          {itemRows.length === 0 && (
            <tr><td colSpan={5} className="py-3 text-center text-charcoal/40">No donations in this period.</td></tr>
          )}
          {itemRows.map((r, i) => (
            <tr key={i} className="border-b border-black/5">
              <td className="py-1.5 text-charcoal/60">{r.category}</td>
              <td className="py-1.5">{r.item}</td>
              <td className="py-1.5">{r.qty}</td>
              <td className="py-1.5">{money(Number(r.value))}</td>
              <td className="py-1.5">{Number(r.weight).toLocaleString("en-CA", { maximumFractionDigits: 1 })} {WEIGHT_UNIT}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-sm text-charcoal/60">
        {dateRows.length} donation drop-off{dateRows.length === 1 ? "" : "s"} in this period.
      </p>

      {cashRows.length > 0 && (
        <>
          <h3 className="mt-6 font-heading text-lg font-bold text-navy">
            Monetary Donations — {money(cashTotal)}
          </h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-black/20 text-left">
                <th className="py-1">Date</th>
                <th className="py-1">Type</th>
                <th className="py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {cashRows.map((r, i) => (
                <tr key={i} className="border-b border-black/5">
                  <td className="py-1.5">{new Date(r.donation_date).toLocaleDateString()}</td>
                  <td className="py-1.5">
                    {r.method}{r.gift_card_store ? ` (${r.gift_card_store})` : ""}
                  </td>
                  <td className="py-1.5">{money(Number(r.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="mt-8 text-center text-xs text-charcoal/40">
        Thank you for supporting our veterans. · VETS Canada — Dartmouth Food Bank
        <br />
        Charity Registration No. {CHARITY_REG_NUMBER}
      </p>
    </div>
  );
}
