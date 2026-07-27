import "server-only";
import { sql } from "@/lib/db";

export interface DateRange {
  from: string; // ISO date (inclusive)
  to: string; // ISO date (inclusive end-of-day handled in queries)
  label: string;
}

export type RangeKey = "today" | "week" | "month" | "custom";

/**
 * Resolve a range key (+ optional custom dates) into concrete ISO dates.
 */
export function resolveRange(
  key: RangeKey,
  customFrom?: string,
  customTo?: string
): DateRange {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const todayStr = iso(now);

  if (key === "today") {
    return { from: todayStr, to: todayStr, label: "Today" };
  }
  if (key === "week") {
    const day = now.getDay(); // 0 = Sun
    const diff = (day + 6) % 7; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    return { from: iso(monday), to: todayStr, label: "This Week" };
  }
  if (key === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: iso(first), to: todayStr, label: "This Month" };
  }
  // custom
  const from = customFrom || todayStr;
  const to = customTo || todayStr;
  return { from, to, label: `${from} → ${to}` };
}

// SQL bounds: from 00:00 of `from` to 23:59:59 of `to`.
function bounds(range: DateRange): { start: string; end: string } {
  return { start: `${range.from} 00:00:00`, end: `${range.to} 23:59:59` };
}

// 1. Client Visit Report
export async function clientVisitReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      t.id,
      t.created_at,
      cl.name AS client_name,
      cl.client_id,
      u.name AS volunteer,
      COALESCE(SUM(ti.quantity), 0)::int AS items,
      COALESCE(SUM(ti.quantity * ti.point_value_at_time), 0)::int AS points,
      COALESCE(ROUND(SUM(ti.quantity * i.unit_price), 2), 0) AS value
    FROM transactions t
    LEFT JOIN clients cl ON cl.id = t.client_id
    LEFT JOIN users u ON u.id = t.volunteer_id
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    LEFT JOIN items i ON i.id = ti.item_id
    WHERE t.type = 'stock_out'
      AND t.created_at BETWEEN ${start} AND ${end}
    GROUP BY t.id, t.created_at, cl.name, cl.client_id, u.name
    ORDER BY t.created_at DESC;
  `;
  return rows;
}

// Value received per client (stock_out), and the overall donated value.
export async function valueByClientReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      cl.name AS client_name,
      cl.client_id,
      COUNT(DISTINCT t.id)::int AS visits,
      COALESCE(SUM(ti.quantity), 0)::int AS items,
      COALESCE(ROUND(SUM(ti.quantity * i.unit_price), 2), 0) AS value,
      COALESCE(ROUND(SUM(ti.quantity * i.unit_weight), 2), 0) AS weight
    FROM transactions t
    JOIN clients cl ON cl.id = t.client_id
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    LEFT JOIN items i ON i.id = ti.item_id
    WHERE t.type = 'stock_out'
      AND t.created_at BETWEEN ${start} AND ${end}
    GROUP BY cl.name, cl.client_id
    ORDER BY value DESC;
  `;
  return rows;
}

// Total dollar value of donations (stock_in) received in the period.
export async function donatedValueTotal(range: DateRange): Promise<number> {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT COALESCE(ROUND(SUM(ti.quantity * i.unit_price), 2), 0) AS value
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    JOIN items i ON i.id = ti.item_id
    WHERE t.type = 'stock_in'
      AND t.created_at BETWEEN ${start} AND ${end};
  `;
  return Number(rows[0]?.value ?? 0);
}

// Total dollar value distributed to clients (stock_out) in the period.
export async function distributedValueTotal(range: DateRange): Promise<number> {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT COALESCE(ROUND(SUM(ti.quantity * i.unit_price), 2), 0) AS value
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    JOIN items i ON i.id = ti.item_id
    WHERE t.type = 'stock_out'
      AND t.created_at BETWEEN ${start} AND ${end};
  `;
  return Number(rows[0]?.value ?? 0);
}

// Total weight for a given transaction type in the period (gov reporting).
async function weightTotalForType(
  range: DateRange,
  type: "stock_in" | "stock_out" | "waste"
): Promise<number> {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT COALESCE(ROUND(SUM(ti.quantity * i.unit_weight), 2), 0) AS weight
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    JOIN items i ON i.id = ti.item_id
    WHERE t.type = ${type}
      AND t.created_at BETWEEN ${start} AND ${end};
  `;
  return Number(rows[0]?.weight ?? 0);
}

export function donatedWeightTotal(range: DateRange) {
  return weightTotalForType(range, "stock_in");
}
export function distributedWeightTotal(range: DateRange) {
  return weightTotalForType(range, "stock_out");
}

// Most-needed grocery list (for donors): low / out-of-stock items, ranked by
// recent demand. Not date-filtered — it's a current snapshot.
export async function mostNeededReport(lowThreshold = 5) {
  const { rows } = await sql`
    SELECT
      i.name AS item_name,
      c.name AS category_name,
      COALESCE(inv.quantity, 0) AS quantity,
      COALESCE(d.given, 0)::int AS given_30d
    FROM items i
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN inventory inv ON inv.item_id = i.id
    LEFT JOIN (
      SELECT ti.item_id, SUM(ti.quantity) AS given
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.type = 'stock_out' AND t.created_at >= now() - interval '30 days'
      GROUP BY ti.item_id
    ) d ON d.item_id = i.id
    WHERE i.is_active = true
      AND COALESCE(inv.quantity, 0) <= ${lowThreshold}
    ORDER BY COALESCE(d.given, 0) DESC, COALESCE(inv.quantity, 0) ASC, c.name, i.name
    LIMIT 100;
  `;
  return rows;
}

// Shopping list: low / out-of-stock items, each matched to the cheapest store
// from the prices we've recorded. Grouped by store for an efficient shopping run.
export interface ShoppingItem {
  itemName: string;
  categoryName: string;
  quantity: number;
  given30d: number;
  cheapestStore: string | null;
  cheapestPrice: number | null;
}
export interface ShoppingStoreGroup {
  store: string;
  items: ShoppingItem[];
  subtotal: number;
}
export interface ShoppingList {
  groups: ShoppingStoreGroup[];
  unpriced: ShoppingItem[];
  total: number;
}

export async function shoppingListReport(
  lowThreshold = 5
): Promise<ShoppingList> {
  const { rows } = await sql`
    SELECT
      i.name AS item_name,
      c.name AS category_name,
      COALESCE(inv.quantity, 0) AS quantity,
      COALESCE(d.given, 0)::int AS given_30d,
      cp.store AS cheapest_store,
      cp.price AS cheapest_price
    FROM items i
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN inventory inv ON inv.item_id = i.id
    LEFT JOIN (
      SELECT ti.item_id, SUM(ti.quantity) AS given
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.type = 'stock_out' AND t.created_at >= now() - interval '30 days'
      GROUP BY ti.item_id
    ) d ON d.item_id = i.id
    LEFT JOIN LATERAL (
      SELECT store, price
      FROM item_prices ip
      WHERE ip.item_id = i.id
      ORDER BY price ASC, store ASC
      LIMIT 1
    ) cp ON true
    WHERE i.is_active = true
      AND COALESCE(inv.quantity, 0) <= ${lowThreshold}
    ORDER BY cp.store NULLS LAST, COALESCE(d.given, 0) DESC, c.name, i.name;
  `;

  const byStore = new Map<string, ShoppingItem[]>();
  const unpriced: ShoppingItem[] = [];

  for (const r of rows) {
    const item: ShoppingItem = {
      itemName: r.item_name,
      categoryName: r.category_name,
      quantity: Number(r.quantity),
      given30d: r.given_30d,
      cheapestStore: r.cheapest_store,
      cheapestPrice: r.cheapest_price === null ? null : Number(r.cheapest_price),
    };
    if (!item.cheapestStore) {
      unpriced.push(item);
    } else {
      const list = byStore.get(item.cheapestStore) ?? [];
      list.push(item);
      byStore.set(item.cheapestStore, list);
    }
  }

  const groups: ShoppingStoreGroup[] = Array.from(byStore.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((store) => {
      const items = byStore.get(store)!;
      const subtotal = items.reduce(
        (sum, it) => sum + (it.cheapestPrice ?? 0),
        0
      );
      return { store, items, subtotal };
    });

  const total = groups.reduce((sum, g) => sum + g.subtotal, 0);
  return { groups, unpriced, total };
}

// --------------------------- Family demographics ---------------------------

// A family "has children" if the head or any member has a recorded birthdate
// under 18. Reused by both the demographics summary and the client filter.
const CHILD_EXPR = `(
  (c.date_of_birth IS NOT NULL AND date_part('year', age(c.date_of_birth)) < 18)
  OR EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.client_id = c.id AND fm.date_of_birth IS NOT NULL
      AND date_part('year', age(fm.date_of_birth)) < 18
  )
)`;

export interface DemographicsReport {
  totalFamilies: number;
  totalPeople: number;
  withChildren: number;
  withoutChildren: number;
  memberStatus: { serving: number; retired: number; unspecified: number };
  ageGroups: { label: string; count: number }[];
  familySizes: { size: number; count: number }[];
}

export async function familyDemographicsReport(): Promise<DemographicsReport> {
  const { rows: famRows } = await sql.query(`
    SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(family_size),0)::int AS people,
      COUNT(*) FILTER (WHERE has_children)::int AS with_children,
      COUNT(*) FILTER (WHERE NOT has_children)::int AS without_children,
      COUNT(*) FILTER (WHERE member_status = 'serving')::int AS serving,
      COUNT(*) FILTER (WHERE member_status = 'retired')::int AS retired,
      COUNT(*) FILTER (WHERE member_status IS NULL OR member_status NOT IN ('serving','retired'))::int AS unspecified
    FROM (
      SELECT c.id, c.family_size, c.member_status, ${CHILD_EXPR} AS has_children
      FROM clients c WHERE c.is_active = true
    ) f;
  `);

  const { rows: ageRows } = await sql`
    WITH people AS (
      SELECT c.date_of_birth AS dob FROM clients c WHERE c.is_active = true
      UNION ALL
      SELECT fm.date_of_birth FROM family_members fm
        JOIN clients c ON c.id = fm.client_id WHERE c.is_active = true
    ),
    aged AS (
      SELECT CASE WHEN dob IS NULL THEN NULL ELSE date_part('year', age(dob)) END AS yrs
      FROM people
    )
    SELECT
      COUNT(*) FILTER (WHERE yrs < 5)::int AS a0,
      COUNT(*) FILTER (WHERE yrs >= 5 AND yrs < 13)::int AS a1,
      COUNT(*) FILTER (WHERE yrs >= 13 AND yrs < 18)::int AS a2,
      COUNT(*) FILTER (WHERE yrs >= 18 AND yrs < 30)::int AS a3,
      COUNT(*) FILTER (WHERE yrs >= 30 AND yrs < 45)::int AS a4,
      COUNT(*) FILTER (WHERE yrs >= 45 AND yrs < 65)::int AS a5,
      COUNT(*) FILTER (WHERE yrs >= 65)::int AS a6,
      COUNT(*) FILTER (WHERE yrs IS NULL)::int AS unknown
    FROM aged;
  `;

  const { rows: sizeRows } = await sql`
    SELECT family_size AS size, COUNT(*)::int AS count
    FROM clients WHERE is_active = true
    GROUP BY family_size ORDER BY family_size;
  `;

  const a = ageRows[0];
  return {
    totalFamilies: famRows[0].total,
    totalPeople: famRows[0].people,
    withChildren: famRows[0].with_children,
    withoutChildren: famRows[0].without_children,
    memberStatus: {
      serving: famRows[0].serving,
      retired: famRows[0].retired,
      unspecified: famRows[0].unspecified,
    },
    ageGroups: [
      { label: "Under 5", count: a.a0 },
      { label: "5–12", count: a.a1 },
      { label: "13–17", count: a.a2 },
      { label: "18–29", count: a.a3 },
      { label: "30–44", count: a.a4 },
      { label: "45–64", count: a.a5 },
      { label: "65+", count: a.a6 },
      { label: "Unknown (no birthdate)", count: a.unknown },
    ],
    familySizes: sizeRows.map((r) => ({ size: r.size, count: r.count })),
  };
}

// ------------------------ Customizable client filter ------------------------

export interface ClientFilters {
  status?: string; // active | archived | all
  memberStatus?: string; // serving | retired | unspecified | any
  children?: string; // with | without | any
  allergy?: string; // yes | no | any
  delivery?: string; // yes | no | any
  codeOfConduct?: string; // yes | no | any
  termsOfService?: string; // yes | no | any
  minFamily?: number | null;
  maxFamily?: number | null;
}

export interface ClientFilterRow {
  clientId: string;
  name: string;
  familySize: number;
  memberStatus: string | null;
  hasChildren: boolean;
  hasAllergy: boolean;
  deliveryApproved: boolean;
  headAge: number | null;
}

export interface ClientFilterResult {
  count: number;
  people: number;
  withChildren: number;
  withoutChildren: number;
  rows: ClientFilterRow[];
}

const yesNo = (v: string | undefined, col: string, conds: string[]) => {
  if (v === "yes") conds.push(`c.${col} = true`);
  else if (v === "no") conds.push(`c.${col} = false`);
};

export async function clientFilterReport(
  f: ClientFilters
): Promise<ClientFilterResult> {
  const conds: string[] = [];
  const params: unknown[] = [];

  // Active / archived / all
  if (f.status === "archived") conds.push("c.is_active = false");
  else if (f.status !== "all") conds.push("c.is_active = true");

  if (f.memberStatus === "serving" || f.memberStatus === "retired") {
    params.push(f.memberStatus);
    conds.push(`c.member_status = $${params.length}`);
  } else if (f.memberStatus === "unspecified") {
    conds.push(
      "(c.member_status IS NULL OR c.member_status NOT IN ('serving','retired'))"
    );
  }

  if (f.children === "with") conds.push(CHILD_EXPR);
  else if (f.children === "without") conds.push(`NOT ${CHILD_EXPR}`);

  yesNo(f.allergy, "has_allergy", conds);
  yesNo(f.delivery, "delivery_approved", conds);
  yesNo(f.codeOfConduct, "code_of_conduct", conds);
  yesNo(f.termsOfService, "terms_of_service", conds);

  if (f.minFamily != null) {
    params.push(f.minFamily);
    conds.push(`c.family_size >= $${params.length}`);
  }
  if (f.maxFamily != null) {
    params.push(f.maxFamily);
    conds.push(`c.family_size <= $${params.length}`);
  }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const { rows } = await sql.query(
    `SELECT c.client_id, c.name, c.family_size, c.member_status,
            c.has_allergy, c.delivery_approved,
            ${CHILD_EXPR} AS has_children,
            CASE WHEN c.date_of_birth IS NULL THEN NULL
                 ELSE date_part('year', age(c.date_of_birth))::int END AS head_age
     FROM clients c
     ${where}
     ORDER BY c.name
     LIMIT 2000`,
    params
  );

  const mapped: ClientFilterRow[] = rows.map((r) => ({
    clientId: r.client_id,
    name: r.name,
    familySize: r.family_size,
    memberStatus: r.member_status,
    hasChildren: r.has_children,
    hasAllergy: r.has_allergy,
    deliveryApproved: r.delivery_approved,
    headAge: r.head_age === null ? null : Number(r.head_age),
  }));

  return {
    count: mapped.length,
    people: mapped.reduce((s, r) => s + (r.familySize || 0), 0),
    withChildren: mapped.filter((r) => r.hasChildren).length,
    withoutChildren: mapped.filter((r) => !r.hasChildren).length,
    rows: mapped,
  };
}

// Client visit frequency + inactivity. Not date-filtered (lifetime view).
export async function clientActivityReport(inactiveDays = 60) {
  const { rows } = await sql`
    SELECT
      cl.name AS client_name,
      cl.client_id,
      cl.family_size,
      COUNT(t.id)::int AS visits,
      MAX(t.created_at) AS last_visit,
      CASE WHEN MAX(t.created_at) IS NULL THEN NULL
           ELSE (CURRENT_DATE - MAX(t.created_at)::date) END AS days_since
    FROM clients cl
    LEFT JOIN transactions t
      ON t.client_id = cl.id AND t.type = 'stock_out'
    WHERE cl.is_active = true
    GROUP BY cl.id, cl.name, cl.client_id, cl.family_size
    ORDER BY days_since DESC NULLS FIRST, cl.name;
  `;
  return rows.map((r) => ({
    ...r,
    inactive:
      r.days_since === null || Number(r.days_since) >= inactiveDays,
  }));
}

// Expenses report (money spent), date-filtered.
export async function expensesReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      e.expense_date,
      e.category,
      e.description,
      e.vendor,
      e.amount,
      u.name AS entered_by
    FROM expenses e
    LEFT JOIN users u ON u.id = e.created_by
    WHERE e.expense_date BETWEEN ${range.from} AND ${range.to}
    ORDER BY e.expense_date DESC, e.id DESC;
  `;
  return rows;
}

export async function expensesByCategory(range: DateRange) {
  const { rows } = await sql`
    SELECT e.category, ROUND(SUM(e.amount), 2) AS total
    FROM expenses e
    WHERE e.expense_date BETWEEN ${range.from} AND ${range.to}
    GROUP BY e.category
    ORDER BY total DESC;
  `;
  return rows;
}

export async function expenseTotal(range: DateRange): Promise<number> {
  const { rows } = await sql`
    SELECT COALESCE(ROUND(SUM(amount), 2), 0) AS total
    FROM expenses
    WHERE expense_date BETWEEN ${range.from} AND ${range.to};
  `;
  return Number(rows[0]?.total ?? 0);
}

// Donations grouped by donor (date-filtered).
export async function donationsByDonorReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      COALESCE(d.name, '(no donor recorded)') AS donor,
      COUNT(DISTINCT t.id)::int AS donations,
      SUM(ti.quantity)::int AS items,
      ROUND(SUM(ti.quantity * i.unit_price), 2) AS value,
      ROUND(SUM(ti.quantity * i.unit_weight), 2) AS weight
    FROM transactions t
    LEFT JOIN donors d ON d.id = t.donor_id
    JOIN transaction_items ti ON ti.transaction_id = t.id
    JOIN items i ON i.id = ti.item_id
    WHERE t.type = 'stock_in'
      AND t.created_at BETWEEN ${start} AND ${end}
    GROUP BY d.name
    ORDER BY value DESC;
  `;
  return rows;
}

// Gift cards given to clients during visits.
export async function giftCardsGivenReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT t.created_at, cl.name AS client_name, cl.client_id,
           u.name AS volunteer, g.store, g.amount
    FROM visit_gift_cards g
    JOIN transactions t ON t.id = g.transaction_id
    LEFT JOIN clients cl ON cl.id = t.client_id
    LEFT JOIN users u ON u.id = t.volunteer_id
    WHERE t.created_at BETWEEN ${start} AND ${end}
    ORDER BY t.created_at DESC;
  `;
  return rows;
}

export async function giftCardsGivenTotal(range: DateRange): Promise<number> {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT COALESCE(ROUND(SUM(g.amount), 2), 0) AS total
    FROM visit_gift_cards g
    JOIN transactions t ON t.id = g.transaction_id
    WHERE t.created_at BETWEEN ${start} AND ${end};
  `;
  return Number(rows[0]?.total ?? 0);
}

// Write-off / waste report
export async function wasteReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      t.created_at,
      t.notes AS reason,
      u.name AS volunteer,
      i.name AS item_name,
      c.name AS category_name,
      ti.quantity,
      ROUND(ti.quantity * i.unit_price, 2) AS value,
      ROUND(ti.quantity * i.unit_weight, 2) AS weight
    FROM transactions t
    JOIN transaction_items ti ON ti.transaction_id = t.id
    JOIN items i ON i.id = ti.item_id
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN users u ON u.id = t.volunteer_id
    WHERE t.type = 'waste'
      AND t.created_at BETWEEN ${start} AND ${end}
    ORDER BY t.created_at DESC;
  `;
  return rows;
}

// 2. Top Items Report
export async function topItemsReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      i.name AS item_name,
      c.name AS category_name,
      SUM(ti.quantity)::int AS total
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    JOIN items i ON i.id = ti.item_id
    JOIN categories c ON c.id = i.category_id
    WHERE t.type = 'stock_out'
      AND t.created_at BETWEEN ${start} AND ${end}
    GROUP BY i.name, c.name
    ORDER BY total DESC
    LIMIT 50;
  `;
  return rows;
}

// 3. Inventory Levels Report (not date-filtered — current snapshot)
export async function inventoryLevelsReport(lowThreshold = 5) {
  const { rows } = await sql`
    SELECT
      i.name AS item_name,
      c.name AS category_name,
      COALESCE(inv.quantity, 0) AS quantity
    FROM items i
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN inventory inv ON inv.item_id = i.id
    WHERE i.is_active = true
    ORDER BY quantity ASC, c.name, i.name;
  `;
  return rows.map((r) => ({
    ...r,
    low: r.quantity <= lowThreshold,
  }));
}

// 4. Donations Report
export async function donationsReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      i.name AS item_name,
      c.name AS category_name,
      SUM(ti.quantity)::int AS total,
      ROUND(SUM(ti.quantity * i.unit_price), 2) AS value,
      ROUND(SUM(ti.quantity * i.unit_weight), 2) AS weight
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    JOIN items i ON i.id = ti.item_id
    JOIN categories c ON c.id = i.category_id
    WHERE t.type = 'stock_in'
      AND t.created_at BETWEEN ${start} AND ${end}
    GROUP BY i.name, c.name
    ORDER BY total DESC;
  `;
  return rows;
}

// 5. Audit / Discrepancy Report
export async function auditReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      ac.created_at,
      i.name AS item_name,
      c.name AS category_name,
      ac.counted_quantity,
      ac.system_quantity,
      ac.discrepancy,
      u.name AS volunteer
    FROM audit_counts ac
    JOIN items i ON i.id = ac.item_id
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN users u ON u.id = ac.volunteer_id
    WHERE ac.created_at BETWEEN ${start} AND ${end}
    ORDER BY ABS(ac.discrepancy) DESC, ac.created_at DESC;
  `;
  return rows;
}

// 6. Expiry Report (current snapshot)
export async function expiryReport() {
  const { rows } = await sql`
    SELECT
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
    ORDER BY inv.expiry_date ASC;
  `;
  return rows;
}

// 7. Volunteer Activity Report
export async function volunteerActivityReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      u.name AS volunteer,
      COUNT(*) FILTER (WHERE t.type = 'stock_out')::int AS visits,
      COUNT(*) FILTER (WHERE t.type = 'stock_in')::int AS donations,
      COUNT(*) FILTER (WHERE t.type = 'audit')::int AS counts
    FROM users u
    LEFT JOIN transactions t
      ON t.volunteer_id = u.id
      AND t.created_at BETWEEN ${start} AND ${end}
    GROUP BY u.name
    ORDER BY visits DESC, donations DESC;
  `;
  return rows;
}

// 8. Points Usage Report (avg points per visit by family size)
export async function pointsUsageReport(range: DateRange) {
  const { start, end } = bounds(range);
  const { rows } = await sql`
    SELECT
      cl.family_size,
      COUNT(DISTINCT t.id)::int AS visits,
      ROUND(AVG(visit_points.points), 1) AS avg_points
    FROM transactions t
    JOIN clients cl ON cl.id = t.client_id
    JOIN (
      SELECT transaction_id, SUM(quantity * point_value_at_time) AS points
      FROM transaction_items
      GROUP BY transaction_id
    ) visit_points ON visit_points.transaction_id = t.id
    WHERE t.type = 'stock_out'
      AND t.created_at BETWEEN ${start} AND ${end}
    GROUP BY cl.family_size
    ORDER BY cl.family_size;
  `;
  return rows;
}
