import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import { WEIGHT_UNIT } from "@/lib/units";
import { ORG_NAME, ORG_TAGLINE, CHARITY_REG_NUMBER } from "@/lib/org";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  Number(n || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
const weight = (n: number) =>
  `${Number(n || 0).toLocaleString("en-CA", { maximumFractionDigits: 1 })} ${WEIGHT_UNIT}`;

interface LineItem {
  category: string;
  item: string;
  quantity: number;
  credits: number;
  value: number;
  weight: number;
}
interface Visit {
  id: number;
  date: Date;
  volunteer: string | null;
  notes: string | null;
  items: LineItem[];
  giftCards: { store: string | null; amount: number }[];
}

export default async function ClientReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string; to?: string };
}) {
  await requirePermission("clients");
  const id = Number(params.id);
  if (!id) notFound();

  const { rows: cRows } = await sql`
    SELECT client_id, name, family_size, point_budget FROM clients WHERE id = ${id};
  `;
  if (cRows.length === 0) notFound();
  const client = cRows[0];

  const from = searchParams.from || null;
  const to = searchParams.to || null;
  const start = from ? `${from} 00:00:00` : "1900-01-01";
  const end = to ? `${to} 23:59:59` : "2999-01-01";

  // All shopping visits (stock_out) for this client in range.
  const { rows: visitRows } = await sql`
    SELECT t.id, t.created_at, t.notes, u.name AS volunteer
    FROM transactions t
    LEFT JOIN users u ON u.id = t.volunteer_id
    WHERE t.type = 'stock_out' AND t.client_id = ${id}
      AND t.created_at BETWEEN ${start} AND ${end}
    ORDER BY t.created_at DESC;
  `;

  const visits: Visit[] = visitRows.map((r) => ({
    id: r.id,
    date: new Date(r.created_at),
    volunteer: r.volunteer,
    notes: r.notes,
    items: [],
    giftCards: [],
  }));
  const byId = new Map<number, Visit>(visits.map((v) => [v.id, v]));

  if (visits.length > 0) {
    const ids = visits.map((v) => v.id);
    const { rows: itemRows } = await sql.query(
      `SELECT ti.transaction_id, c.name AS category, i.name AS item, ti.quantity,
              (ti.quantity * ti.point_value_at_time)::int AS credits,
              ROUND(ti.quantity * i.unit_price, 2) AS value,
              ROUND(ti.quantity * i.unit_weight, 2) AS weight
       FROM transaction_items ti
       JOIN items i ON i.id = ti.item_id
       JOIN categories c ON c.id = i.category_id
       WHERE ti.transaction_id = ANY($1::int[])
       ORDER BY c.name, i.name`,
      [ids]
    );
    for (const r of itemRows) {
      byId.get(r.transaction_id)?.items.push({
        category: r.category,
        item: r.item,
        quantity: r.quantity,
        credits: r.credits,
        value: Number(r.value),
        weight: Number(r.weight),
      });
    }
    const { rows: gcRows } = await sql.query(
      `SELECT transaction_id, store, amount FROM visit_gift_cards
       WHERE transaction_id = ANY($1::int[])`,
      [ids]
    );
    for (const r of gcRows) {
      byId.get(r.transaction_id)?.giftCards.push({
        store: r.store,
        amount: Number(r.amount),
      });
    }
  }

  const totals = visits.reduce(
    (a, v) => {
      for (const it of v.items) {
        a.qty += it.quantity;
        a.credits += it.credits;
        a.value += it.value;
        a.weight += it.weight;
      }
      for (const g of v.giftCards) a.giftCards += g.amount;
      return a;
    },
    { qty: 0, credits: 0, value: 0, weight: 0, giftCards: 0 }
  );

  const rangeLabel = from || to ? `${from || "start"} → ${to || "today"}` : "All time";

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/dashboard/admin/clients" className="btn-outline text-sm">
          ← Back
        </Link>
        <PrintButton />
      </div>

      <div className="border-b-2 border-navy pb-3">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-navy">
          {ORG_NAME}
        </h1>
        <p className="text-xs uppercase tracking-widest text-gold">
          Client Visit Report · {ORG_TAGLINE}
        </p>
      </div>

      <div className="mt-4">
        <h2 className="font-heading text-xl font-bold text-navy">{client.name}</h2>
        <p className="text-sm text-charcoal/70">
          Client ID {client.client_id} · Family of {client.family_size} ·{" "}
          {client.point_budget} credits/month
        </p>
        <p className="mt-1 text-xs text-charcoal/50">
          Period: {rangeLabel} · Generated {new Date().toLocaleString()} · Charity
          No. {CHARITY_REG_NUMBER}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Visits", value: visits.length.toLocaleString("en-CA") },
          { label: "Items received", value: totals.qty.toLocaleString("en-CA") },
          { label: "Credits used", value: totals.credits.toLocaleString("en-CA") },
          { label: "Est. value", value: money(totals.value) },
        ].map((s) => (
          <div key={s.label} className="rounded border border-black/10 p-3 text-center">
            <p className="text-2xl font-bold text-navy">{s.value}</p>
            <p className="text-xs text-charcoal/60">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-charcoal/50">
        Total weight received: {weight(totals.weight)}
        {totals.giftCards > 0 && ` · Gift cards given: ${money(totals.giftCards)}`}
      </p>

      {visits.length === 0 && (
        <p className="mt-6 text-sm text-charcoal/50">
          No visits recorded in this period.
        </p>
      )}

      {visits.map((v) => {
        const vItems = v.items.reduce((a, it) => a + it.quantity, 0);
        const vCredits = v.items.reduce((a, it) => a + it.credits, 0);
        const vValue = v.items.reduce((a, it) => a + it.value, 0);
        return (
          <div key={v.id} className="mt-6 break-inside-avoid">
            <div className="flex items-baseline justify-between border-b border-navy/20 pb-1">
              <h3 className="font-heading text-base font-bold text-navy">
                {v.date.toLocaleDateString("en-CA", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                <span className="ml-2 text-xs font-normal text-charcoal/50">
                  {v.date.toLocaleTimeString("en-CA", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {v.volunteer ? ` · by ${v.volunteer}` : ""}
                </span>
              </h3>
              <span className="text-xs text-charcoal/60">
                {vItems} items · {vCredits} credits · {money(vValue)}
              </span>
            </div>
            <table className="mt-1 w-full text-sm">
              <thead>
                <tr className="text-left text-charcoal/50">
                  <th className="py-0.5">Category</th>
                  <th className="py-0.5">Item</th>
                  <th className="py-0.5">Qty</th>
                  <th className="py-0.5">Credits</th>
                  <th className="py-0.5">Value</th>
                </tr>
              </thead>
              <tbody>
                {v.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-1 text-charcoal/40">
                      No item detail recorded.
                    </td>
                  </tr>
                )}
                {v.items.map((it, i) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="py-1 text-charcoal/60">{it.category}</td>
                    <td className="py-1">{it.item}</td>
                    <td className="py-1">{it.quantity}</td>
                    <td className="py-1">{it.credits}</td>
                    <td className="py-1">{money(it.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {v.giftCards.length > 0 && (
              <p className="mt-1 text-xs text-charcoal/70">
                🎁 Gift cards given:{" "}
                {v.giftCards
                  .map((g) => `${g.store || "Gift card"} ${money(g.amount)}`)
                  .join(", ")}
              </p>
            )}
            {v.notes && (
              <p className="mt-1 text-xs italic text-charcoal/60">Note: {v.notes}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
