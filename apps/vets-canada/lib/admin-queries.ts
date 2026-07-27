import "server-only";
import { sql } from "@/lib/db";

export const DEFAULT_EXPIRY_THRESHOLD_DAYS = 7;
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export interface LifetimeTotals {
  veteransHelped: number;
  peopleServed: number;
  valueDistributed: number;
  weightDistributed: number;
}

/** All-time impact: distinct veterans served, total $ and weight given out. */
export async function getLifetimeTotals(): Promise<LifetimeTotals> {
  const { rows: vetRows } = await sql`
    SELECT COUNT(DISTINCT client_id)::int AS count
    FROM transactions
    WHERE type = 'stock_out' AND client_id IS NOT NULL;
  `;
  const { rows: peopleRows } = await sql`
    SELECT COALESCE(SUM(family_size), 0)::int AS people
    FROM clients
    WHERE id IN (
      SELECT DISTINCT client_id FROM transactions
      WHERE type = 'stock_out' AND client_id IS NOT NULL
    );
  `;
  const { rows: valRows } = await sql`
    SELECT
      COALESCE(ROUND(SUM(ti.quantity * i.unit_price), 2), 0) AS value,
      COALESCE(ROUND(SUM(ti.quantity * i.unit_weight), 2), 0) AS weight
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    JOIN items i ON i.id = ti.item_id
    WHERE t.type = 'stock_out';
  `;
  return {
    veteransHelped: vetRows[0]?.count ?? 0,
    peopleServed: peopleRows[0]?.people ?? 0,
    valueDistributed: Number(valRows[0]?.value ?? 0),
    weightDistributed: Number(valRows[0]?.weight ?? 0),
  };
}

export interface CreditSnapshot {
  activeClients: number;
  monthlyCreditsExpected: number; // sum of active client budgets (1 shop/month)
  creditsOnHand: number; // total points-worth of current stock
}

/**
 * Monthly credit snapshot. Recomputed on every dashboard load, so it always
 * reflects the current inventory and client list.
 */
export async function getCreditSnapshot(): Promise<CreditSnapshot> {
  const { rows: clientRows } = await sql`
    SELECT
      COUNT(*)::int AS active,
      COALESCE(SUM(point_budget), 0)::int AS expected
    FROM clients WHERE is_active = true;
  `;
  const { rows: stockRows } = await sql`
    SELECT COALESCE(SUM(inv.quantity * COALESCE(i.point_value, c.point_value)), 0)::int AS on_hand
    FROM inventory inv
    JOIN items i ON i.id = inv.item_id
    JOIN categories c ON c.id = i.category_id
    WHERE i.is_active = true;
  `;
  return {
    activeClients: clientRows[0]?.active ?? 0,
    monthlyCreditsExpected: clientRows[0]?.expected ?? 0,
    creditsOnHand: stockRows[0]?.on_hand ?? 0,
  };
}

export interface MembershipBreakdown {
  serving: number;
  retired: number;
  unspecified: number;
  total: number;
}

/** Active clients split by serving / retired / unspecified member status. */
export async function getMembershipBreakdown(): Promise<MembershipBreakdown> {
  const { rows } = await sql`
    SELECT
      COUNT(*) FILTER (WHERE member_status = 'serving')::int AS serving,
      COUNT(*) FILTER (WHERE member_status = 'retired')::int AS retired,
      COUNT(*) FILTER (WHERE member_status IS NULL OR member_status NOT IN ('serving','retired'))::int AS unspecified,
      COUNT(*)::int AS total
    FROM clients
    WHERE is_active = true;
  `;
  return {
    serving: rows[0]?.serving ?? 0,
    retired: rows[0]?.retired ?? 0,
    unspecified: rows[0]?.unspecified ?? 0,
    total: rows[0]?.total ?? 0,
  };
}

export const DEFAULT_INACTIVE_DAYS = 60;

export interface InactiveClient {
  id: number;
  clientId: string;
  name: string;
  lastVisit: string | null;
  daysSince: number | null;
}

/**
 * Active clients who haven't shopped in `days`+ (or never), for check-ins.
 */
export async function getInactiveClients(
  days = DEFAULT_INACTIVE_DAYS
): Promise<InactiveClient[]> {
  const { rows } = await sql.query(
    `SELECT cl.id, cl.client_id, cl.name,
            MAX(t.created_at) AS last_visit,
            (CURRENT_DATE - MAX(t.created_at)::date) AS days_since
     FROM clients cl
     LEFT JOIN transactions t ON t.client_id = cl.id AND t.type = 'stock_out'
     WHERE cl.is_active = true
     GROUP BY cl.id, cl.client_id, cl.name
     HAVING MAX(t.created_at) IS NULL
        OR MAX(t.created_at)::date <= CURRENT_DATE - ($1::int)
     ORDER BY days_since DESC NULLS FIRST
     LIMIT 25`,
    [days]
  );
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    lastVisit: r.last_visit ? new Date(r.last_visit).toLocaleDateString() : null,
    daysSince: r.days_since === null ? null : Number(r.days_since),
  }));
}

export interface OverviewStats {
  clientsServedThisWeek: number;
  itemsDistributedThisWeek: number;
  lowStockCount: number;
  expiringSoonCount: number;
}

export async function getOverviewStats(
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
  expiryThresholdDays = DEFAULT_EXPIRY_THRESHOLD_DAYS
): Promise<OverviewStats> {
  const { rows: clientRows } = await sql`
    SELECT COUNT(DISTINCT client_id)::int AS count
    FROM transactions
    WHERE type = 'stock_out'
      AND client_id IS NOT NULL
      AND created_at >= date_trunc('week', now());
  `;

  const { rows: itemRows } = await sql`
    SELECT COALESCE(SUM(ti.quantity), 0)::int AS count
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE t.type = 'stock_out'
      AND t.created_at >= date_trunc('week', now());
  `;

  const { rows: lowRows } = await sql`
    SELECT COUNT(*)::int AS count
    FROM inventory inv
    JOIN items i ON i.id = inv.item_id
    WHERE i.is_active = true AND inv.quantity <= ${lowStockThreshold};
  `;

  const { rows: expRows } = await sql.query(
    `SELECT COUNT(*)::int AS count
     FROM inventory inv
     JOIN items i ON i.id = inv.item_id
     WHERE i.is_active = true
       AND inv.expiry_date IS NOT NULL
       AND inv.quantity > 0
       AND inv.expiry_date <= (CURRENT_DATE + ($1 || ' days')::interval)`,
    [expiryThresholdDays]
  );

  return {
    clientsServedThisWeek: clientRows[0]?.count ?? 0,
    itemsDistributedThisWeek: itemRows[0]?.count ?? 0,
    lowStockCount: lowRows[0]?.count ?? 0,
    expiringSoonCount: expRows[0]?.count ?? 0,
  };
}

export interface ExpiringItem {
  itemId: number;
  itemName: string;
  categoryName: string;
  quantity: number;
  expiryDate: string;
  daysLeft: number;
}

export async function getExpiringItems(
  thresholdDays = DEFAULT_EXPIRY_THRESHOLD_DAYS
): Promise<ExpiringItem[]> {
  const { rows } = await sql.query(
    `SELECT
       i.id AS item_id,
       i.name AS item_name,
       c.name AS category_name,
       inv.quantity,
       inv.expiry_date,
       (inv.expiry_date - CURRENT_DATE)::int AS days_left
     FROM inventory inv
     JOIN items i ON i.id = inv.item_id
     JOIN categories c ON c.id = i.category_id
     WHERE i.is_active = true
       AND inv.expiry_date IS NOT NULL
       AND inv.quantity > 0
       AND inv.expiry_date <= (CURRENT_DATE + ($1 || ' days')::interval)
     ORDER BY inv.expiry_date ASC`,
    [thresholdDays]
  );
  return rows.map((r) => ({
    itemId: r.item_id,
    itemName: r.item_name,
    categoryName: r.category_name,
    quantity: r.quantity,
    expiryDate: String(r.expiry_date),
    daysLeft: r.days_left,
  }));
}
