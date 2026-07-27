import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { WEIGHT_UNIT } from "@/lib/units";

export const dynamic = "force-dynamic";

// Public, read-only aggregate stats — safe to embed anywhere. No personal data.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=30",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT
        (SELECT COUNT(DISTINCT client_id) FROM transactions
          WHERE type = 'stock_out' AND client_id IS NOT NULL)::int AS veterans,
        COALESCE((SELECT SUM(family_size) FROM clients WHERE id IN (
          SELECT DISTINCT client_id FROM transactions WHERE type = 'stock_out' AND client_id IS NOT NULL
        )), 0)::int AS people,
        COALESCE((SELECT SUM(ti.quantity) FROM transaction_items ti
          JOIN transactions t ON t.id = ti.transaction_id
          WHERE t.type = 'stock_out'), 0)::int AS items,
        COALESCE((SELECT ROUND(SUM(ti.quantity * i.unit_price), 2) FROM transaction_items ti
          JOIN transactions t ON t.id = ti.transaction_id
          JOIN items i ON i.id = ti.item_id
          WHERE t.type = 'stock_out'), 0) AS value,
        COALESCE((SELECT ROUND(SUM(ti.quantity * i.unit_weight), 2) FROM transaction_items ti
          JOIN transactions t ON t.id = ti.transaction_id
          JOIN items i ON i.id = ti.item_id
          WHERE t.type = 'stock_out'), 0) AS weight,
        (SELECT COUNT(*) FROM transactions
          WHERE type = 'stock_out' AND created_at >= date_trunc('month', now()))::int AS visits_month;
    `;
    const r = rows[0];
    return NextResponse.json(
      {
        veteransHelped: r.veterans ?? 0,
        peopleServed: r.people ?? 0,
        itemsDistributed: r.items ?? 0,
        valueDistributed: Number(r.value ?? 0),
        poundsDistributed: Number(r.weight ?? 0),
        weightUnit: WEIGHT_UNIT,
        visitsThisMonth: r.visits_month ?? 0,
        updatedAt: new Date().toISOString(),
      },
      { headers: CORS }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: CORS }
    );
  }
}
