import { requirePermission } from "@/lib/auth";
import {
  resolveRange,
  type RangeKey,
  clientVisitReport,
  topItemsReport,
  inventoryLevelsReport,
  donationsReport,
  auditReport,
  expiryReport,
  volunteerActivityReport,
  pointsUsageReport,
  valueByClientReport,
  donatedValueTotal,
  distributedValueTotal,
  donatedWeightTotal,
  distributedWeightTotal,
  wasteReport,
  mostNeededReport,
  shoppingListReport,
  familyDemographicsReport,
  clientFilterReport,
  clientActivityReport,
  expensesReport,
  expenseTotal,
  donationsByDonorReport,
  giftCardsGivenReport,
  giftCardsGivenTotal,
} from "@/lib/reports";
import { WEIGHT_UNIT } from "@/lib/units";
import ReportControls from "./ReportControls";
import ClientFilterControls from "./ClientFilterControls";
import PrintButton from "@/components/PrintButton";
import { ORG_NAME, ORG_TAGLINE, CHARITY_REG_NUMBER } from "@/lib/org";

const REPORT_TITLES: Record<string, string> = {
  visits: "Client Visits",
  "top-items": "Top Items",
  inventory: "Inventory Levels",
  donations: "Donations",
  audit: "Audit / Discrepancy",
  expiry: "Expiry",
  volunteers: "Volunteer Activity",
  points: "Points Usage",
  "value-clients": "Value by Client",
  "donations-by-donor": "Donations by Donor",
  "gift-cards": "Gift Cards Given",
  waste: "Write-Offs",
  "most-needed": "Most Needed",
  "shopping-list": "Shopping List by Store",
  demographics: "Family Demographics",
  explorer: "Custom Client Filter",
  "client-activity": "Client Activity",
  expenses: "Expenses",
};

// Reports that show a current snapshot rather than a date range.
const SNAPSHOT_REPORTS = new Set([
  "inventory",
  "expiry",
  "demographics",
  "shopping-list",
  "most-needed",
  "client-activity",
]);

export const dynamic = "force-dynamic";

interface Column {
  key: string;
  label: string;
  format?: (v: any, row: any) => React.ReactNode;
}

function Table({ columns, rows }: { columns: Column[]; rows: any[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-charcoal/50">
        No data for this report and date range.
      </p>
    );
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-black/5 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-navy/5 text-left text-navy">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-black/5">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  {c.format ? c.format(row[c.key], row) : String(row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtDate(v: any) {
  return v ? new Date(v).toLocaleString() : "—";
}

function number(n: number) {
  return Number(n ?? 0).toLocaleString("en-CA");
}

function fmtMoney(v: any) {
  return Number(v ?? 0).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
  });
}

function fmtWeight(v: any) {
  return `${Number(v ?? 0).toLocaleString("en-CA", {
    maximumFractionDigits: 1,
  })} ${WEIGHT_UNIT}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: {
    report?: string;
    range?: string;
    from?: string;
    to?: string;
    cstatus?: string;
    member?: string;
    children?: string;
    allergy?: string;
    delivery?: string;
    coc?: string;
    tos?: string;
    minfam?: string;
    maxfam?: string;
  };
}) {
  await requirePermission("reports");

  const report = searchParams.report || "visits";
  const rangeKey = (searchParams.range || "week") as RangeKey;
  const range = resolveRange(rangeKey, searchParams.from, searchParams.to);

  let content: React.ReactNode = null;

  switch (report) {
    case "top-items": {
      const rows = await topItemsReport(range);
      content = (
        <Table
          rows={rows}
          columns={[
            { key: "item_name", label: "Item" },
            { key: "category_name", label: "Category" },
            { key: "total", label: "Distributed" },
          ]}
        />
      );
      break;
    }
    case "inventory": {
      const rows = await inventoryLevelsReport();
      content = (
        <Table
          rows={rows}
          columns={[
            { key: "category_name", label: "Category" },
            { key: "item_name", label: "Item" },
            { key: "quantity", label: "Qty" },
            {
              key: "low",
              label: "Status",
              format: (v) =>
                v ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    Low
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                    OK
                  </span>
                ),
            },
          ]}
        />
      );
      break;
    }
    case "donations": {
      const [rows, total, weight] = await Promise.all([
        donationsReport(range),
        donatedValueTotal(range),
        donatedWeightTotal(range),
      ]);
      content = (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                Total value donated ({range.label})
              </p>
              <p className="text-3xl font-bold text-navy">{fmtMoney(total)}</p>
            </div>
            <div className="rounded-xl border border-navy/20 bg-navy/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                Total weight donated ({range.label})
              </p>
              <p className="text-3xl font-bold text-navy">{fmtWeight(weight)}</p>
            </div>
          </div>
          <Table
            rows={rows}
            columns={[
              { key: "item_name", label: "Item" },
              { key: "category_name", label: "Category" },
              { key: "total", label: "Received" },
              { key: "value", label: "Value", format: fmtMoney },
              { key: "weight", label: "Weight", format: fmtWeight },
            ]}
          />
        </>
      );
      break;
    }
    case "value-clients": {
      const [rows, distributed, distWeight] = await Promise.all([
        valueByClientReport(range),
        distributedValueTotal(range),
        distributedWeightTotal(range),
      ]);
      content = (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                Total value given to clients ({range.label})
              </p>
              <p className="text-3xl font-bold text-navy">{fmtMoney(distributed)}</p>
            </div>
            <div className="rounded-xl border border-navy/20 bg-navy/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                Total weight given to clients ({range.label})
              </p>
              <p className="text-3xl font-bold text-navy">{fmtWeight(distWeight)}</p>
            </div>
          </div>
          <Table
            rows={rows}
            columns={[
              { key: "client_name", label: "Client" },
              { key: "client_id", label: "Client ID" },
              { key: "visits", label: "Visits" },
              { key: "items", label: "Items" },
              { key: "value", label: "Value Received", format: fmtMoney },
              { key: "weight", label: "Weight", format: fmtWeight },
            ]}
          />
        </>
      );
      break;
    }
    case "most-needed": {
      const rows = await mostNeededReport();
      content = (
        <>
          <p className="mt-4 text-sm text-charcoal/60">
            Low / out-of-stock items, ranked by recent demand — share this with
            donors when they ask what&apos;s needed.
          </p>
          <Table
            rows={rows}
            columns={[
              { key: "item_name", label: "Item" },
              { key: "category_name", label: "Category" },
              { key: "quantity", label: "In Stock" },
              { key: "given_30d", label: "Given (30d)" },
            ]}
          />
        </>
      );
      break;
    }
    case "shopping-list": {
      const list = await shoppingListReport();
      content = (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-charcoal/60">
              Low / out-of-stock items, each matched to the{" "}
              <span className="font-semibold">cheapest store</span> from your
              recorded prices and grouped into one list per store. Items without
              a recorded price are listed separately.
            </p>
          </div>
          <div className="mt-3 rounded-xl border border-gold/30 bg-gold/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
              Estimated total to restock everything (cheapest stores)
            </p>
            <p className="text-3xl font-bold text-navy">{fmtMoney(list.total)}</p>
          </div>
          {list.groups.length === 0 && list.unpriced.length === 0 ? (
            <p className="mt-6 text-sm text-charcoal/50">
              Nothing is low on stock right now. 👍
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {list.groups.map((g) => (
                <div
                  key={g.store}
                  className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between bg-navy px-4 py-2 text-white">
                    <p className="font-heading text-base font-bold">🛒 {g.store}</p>
                    <p className="text-sm">
                      {g.items.length} item{g.items.length === 1 ? "" : "s"} ·{" "}
                      <span className="font-bold">{fmtMoney(g.subtotal)}</span>
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-navy/5 text-left text-navy">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">In Stock</th>
                        <th className="px-3 py-2">Given (30d)</th>
                        <th className="px-3 py-2">Cheapest Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((it, i) => (
                        <tr key={i} className="border-t border-black/5">
                          <td className="px-3 py-2 font-medium">{it.itemName}</td>
                          <td className="px-3 py-2 text-charcoal/60">{it.categoryName}</td>
                          <td className="px-3 py-2">
                            {it.quantity === 0 ? (
                              <span className="font-bold text-military">Out</span>
                            ) : (
                              it.quantity
                            )}
                          </td>
                          <td className="px-3 py-2">{it.given30d}</td>
                          <td className="px-3 py-2">{fmtMoney(it.cheapestPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {list.unpriced.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
                  <div className="bg-charcoal/80 px-4 py-2 text-white">
                    <p className="font-heading text-base font-bold">
                      No price recorded yet
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-navy/5 text-left text-navy">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">In Stock</th>
                        <th className="px-3 py-2">Given (30d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.unpriced.map((it, i) => (
                        <tr key={i} className="border-t border-black/5">
                          <td className="px-3 py-2 font-medium">{it.itemName}</td>
                          <td className="px-3 py-2 text-charcoal/60">{it.categoryName}</td>
                          <td className="px-3 py-2">
                            {it.quantity === 0 ? (
                              <span className="font-bold text-military">Out</span>
                            ) : (
                              it.quantity
                            )}
                          </td>
                          <td className="px-3 py-2">{it.given30d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="px-4 py-2 text-xs text-charcoal/50">
                    Add prices for these under{" "}
                    <span className="font-semibold">Items &amp; Categories</span>{" "}
                    so they can be sorted to the cheapest store.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      );
      break;
    }
    case "demographics": {
      const d = await familyDemographicsReport();
      const pct = (n: number) =>
        d.totalFamilies > 0 ? Math.round((n / d.totalFamilies) * 100) : 0;
      content = (
        <>
          <div className="mt-4 flex items-center justify-between print:hidden">
            <p className="text-sm text-charcoal/60">
              Snapshot of active families — with vs without children, age groups,
              and member status.
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-navy/20 bg-navy/5 p-4">
              <p className="text-3xl font-bold text-navy">{number(d.totalFamilies)}</p>
              <p className="text-sm text-charcoal/60">Active families</p>
            </div>
            <div className="rounded-xl border border-navy/20 bg-navy/5 p-4">
              <p className="text-3xl font-bold text-navy">{number(d.totalPeople)}</p>
              <p className="text-sm text-charcoal/60">People (incl. family)</p>
            </div>
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4">
              <p className="text-3xl font-bold text-navy">{number(d.withChildren)}</p>
              <p className="text-sm text-charcoal/60">
                Families with children ({pct(d.withChildren)}%)
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-offwhite p-4">
              <p className="text-3xl font-bold text-navy">{number(d.withoutChildren)}</p>
              <p className="text-sm text-charcoal/60">
                Families without children ({pct(d.withoutChildren)}%)
              </p>
            </div>
          </div>

          <h2 className="mt-6 font-heading text-lg font-bold text-navy">
            People by age group
          </h2>
          <Table
            rows={d.ageGroups}
            columns={[
              { key: "label", label: "Age group" },
              { key: "count", label: "People" },
            ]}
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-1 font-heading text-lg font-bold text-navy">
                Member status
              </h2>
              <Table
                rows={[
                  { k: "Serving members", v: d.memberStatus.serving },
                  { k: "Retired members", v: d.memberStatus.retired },
                  { k: "Not specified", v: d.memberStatus.unspecified },
                ]}
                columns={[
                  { key: "k", label: "Status" },
                  { key: "v", label: "Families" },
                ]}
              />
            </div>
            <div>
              <h2 className="mb-1 font-heading text-lg font-bold text-navy">
                Family size
              </h2>
              <Table
                rows={d.familySizes}
                columns={[
                  { key: "size", label: "People in household" },
                  { key: "count", label: "Families" },
                ]}
              />
            </div>
          </div>
        </>
      );
      break;
    }
    case "explorer": {
      const filters = {
        status: searchParams.cstatus,
        memberStatus: searchParams.member,
        children: searchParams.children,
        allergy: searchParams.allergy,
        delivery: searchParams.delivery,
        codeOfConduct: searchParams.coc,
        termsOfService: searchParams.tos,
        minFamily: searchParams.minfam ? Number(searchParams.minfam) : null,
        maxFamily: searchParams.maxfam ? Number(searchParams.maxfam) : null,
      };
      const result = await clientFilterReport(filters);
      content = (
        <>
          <p className="mt-4 text-sm text-charcoal/60">
            Build your own report — combine any filters below to answer questions
            like &ldquo;how many serving families with children?&rdquo;
          </p>
          <ClientFilterControls />
          <div className="mt-4 flex items-center justify-between print:hidden">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-lg bg-navy/5 px-3 py-1.5 text-sm">
                <span className="font-bold text-navy">{number(result.count)}</span>{" "}
                families
              </span>
              <span className="rounded-lg bg-navy/5 px-3 py-1.5 text-sm">
                <span className="font-bold text-navy">{number(result.people)}</span>{" "}
                people
              </span>
              <span className="rounded-lg bg-gold/10 px-3 py-1.5 text-sm">
                <span className="font-bold text-navy">{number(result.withChildren)}</span>{" "}
                with children
              </span>
              <span className="rounded-lg bg-offwhite px-3 py-1.5 text-sm">
                <span className="font-bold text-navy">{number(result.withoutChildren)}</span>{" "}
                without
              </span>
            </div>
          </div>
          <Table
            rows={result.rows}
            columns={[
              { key: "clientId", label: "Client ID" },
              { key: "name", label: "Name" },
              { key: "familySize", label: "Family" },
              {
                key: "hasChildren",
                label: "Children",
                format: (v) => (v ? "Yes" : "No"),
              },
              {
                key: "memberStatus",
                label: "Member",
                format: (v) => (v ? String(v) : "—"),
              },
              {
                key: "headAge",
                label: "Head age",
                format: (v) => (v === null ? "—" : v),
              },
              {
                key: "hasAllergy",
                label: "Allergy",
                format: (v) => (v ? "⚠" : ""),
              },
              {
                key: "deliveryApproved",
                label: "Delivery",
                format: (v) => (v ? "🚚" : ""),
              },
            ]}
          />
        </>
      );
      break;
    }
    case "client-activity": {
      const rows = await clientActivityReport(60);
      content = (
        <>
          <p className="mt-4 text-sm text-charcoal/60">
            Visit frequency per active family. Rows flagged 🔔 haven&apos;t
            visited in 60+ days (or never) — consider a check-in.
          </p>
          <Table
            rows={rows}
            columns={[
              {
                key: "client_name",
                label: "Client",
                format: (v, row) => (row.inactive ? `🔔 ${v}` : v),
              },
              { key: "client_id", label: "Client ID" },
              { key: "family_size", label: "Family" },
              { key: "visits", label: "Visits" },
              { key: "last_visit", label: "Last Visit", format: (v) => (v ? new Date(v).toLocaleDateString() : "never") },
              {
                key: "days_since",
                label: "Days Since",
                format: (v) => (v === null ? "—" : v),
              },
            ]}
          />
        </>
      );
      break;
    }
    case "expenses": {
      const [rows, total] = await Promise.all([
        expensesReport(range),
        expenseTotal(range),
      ]);
      content = (
        <>
          <div className="mt-4 rounded-xl border border-military/30 bg-military/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
              Total expenses ({range.label})
            </p>
            <p className="text-3xl font-bold text-navy">{fmtMoney(total)}</p>
          </div>
          <Table
            rows={rows}
            columns={[
              { key: "expense_date", label: "Date", format: (v) => (v ? new Date(v).toLocaleDateString() : "—") },
              { key: "category", label: "Category" },
              { key: "description", label: "Description" },
              { key: "vendor", label: "Vendor" },
              { key: "amount", label: "Amount", format: fmtMoney },
              { key: "entered_by", label: "By" },
            ]}
          />
        </>
      );
      break;
    }
    case "donations-by-donor": {
      const rows = await donationsByDonorReport(range);
      content = (
        <Table
          rows={rows}
          columns={[
            { key: "donor", label: "Donor" },
            { key: "donations", label: "Drop-offs" },
            { key: "items", label: "Items" },
            { key: "value", label: "Value", format: fmtMoney },
            { key: "weight", label: "Weight", format: fmtWeight },
          ]}
        />
      );
      break;
    }
    case "gift-cards": {
      const [rows, total] = await Promise.all([
        giftCardsGivenReport(range),
        giftCardsGivenTotal(range),
      ]);
      content = (
        <>
          <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
              Total gift cards given ({range.label})
            </p>
            <p className="text-3xl font-bold text-navy">{fmtMoney(total)}</p>
          </div>
          <Table
            rows={rows}
            columns={[
              { key: "created_at", label: "Date", format: fmtDate },
              { key: "client_name", label: "Client" },
              { key: "client_id", label: "Client ID" },
              { key: "store", label: "Store" },
              { key: "amount", label: "Amount", format: fmtMoney },
              { key: "volunteer", label: "By" },
            ]}
          />
        </>
      );
      break;
    }
    case "waste": {
      const rows = await wasteReport(range);
      content = (
        <Table
          rows={rows}
          columns={[
            { key: "created_at", label: "Date", format: fmtDate },
            { key: "category_name", label: "Category" },
            { key: "item_name", label: "Item" },
            { key: "quantity", label: "Qty" },
            { key: "reason", label: "Reason" },
            { key: "value", label: "Value", format: fmtMoney },
            { key: "weight", label: "Weight", format: fmtWeight },
            { key: "volunteer", label: "By" },
          ]}
        />
      );
      break;
    }
    case "audit": {
      const rows = await auditReport(range);
      content = (
        <Table
          rows={rows}
          columns={[
            { key: "created_at", label: "Date", format: fmtDate },
            { key: "category_name", label: "Category" },
            { key: "item_name", label: "Item" },
            { key: "counted_quantity", label: "Counted" },
            { key: "system_quantity", label: "System" },
            {
              key: "discrepancy",
              label: "Discrepancy",
              format: (v) => (
                <span
                  className={
                    v === 0
                      ? "text-charcoal/50"
                      : "font-bold text-military"
                  }
                >
                  {v > 0 ? `+${v}` : v}
                </span>
              ),
            },
            { key: "volunteer", label: "Volunteer" },
          ]}
        />
      );
      break;
    }
    case "expiry": {
      const rows = await expiryReport();
      content = (
        <Table
          rows={rows}
          columns={[
            { key: "category_name", label: "Category" },
            { key: "item_name", label: "Item" },
            { key: "quantity", label: "Qty" },
            { key: "expiry_date", label: "Expiry", format: (v) => String(v) },
            {
              key: "days_left",
              label: "Days Left",
              format: (v) => (
                <span
                  className={
                    v < 0
                      ? "font-bold text-military"
                      : v <= 7
                      ? "font-bold text-amber-600"
                      : "text-charcoal/60"
                  }
                >
                  {v < 0 ? `${v} (expired)` : v}
                </span>
              ),
            },
          ]}
        />
      );
      break;
    }
    case "volunteers": {
      const rows = await volunteerActivityReport(range);
      content = (
        <Table
          rows={rows}
          columns={[
            { key: "volunteer", label: "Volunteer" },
            { key: "visits", label: "Visits" },
            { key: "donations", label: "Donations" },
            { key: "counts", label: "Counts" },
          ]}
        />
      );
      break;
    }
    case "points": {
      const rows = await pointsUsageReport(range);
      content = (
        <Table
          rows={rows}
          columns={[
            { key: "family_size", label: "Family Size" },
            { key: "visits", label: "Visits" },
            { key: "avg_points", label: "Avg Points / Visit" },
          ]}
        />
      );
      break;
    }
    default: {
      const rows = await clientVisitReport(range);
      content = (
        <Table
          rows={rows}
          columns={[
            { key: "created_at", label: "Date", format: fmtDate },
            { key: "client_name", label: "Client" },
            { key: "client_id", label: "Client ID" },
            { key: "items", label: "Items" },
            { key: "points", label: "Points" },
            { key: "value", label: "Value", format: fmtMoney },
            { key: "volunteer", label: "Volunteer" },
          ]}
        />
      );
    }
  }

  const reportTitle = REPORT_TITLES[report] || "Report";
  const periodLabel = SNAPSHOT_REPORTS.has(report)
    ? "Current snapshot"
    : range.label;
  const generatedOn = new Date().toLocaleString("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div>
      {/* Header shown only when printing / saving to PDF */}
      <div className="hidden border-b border-navy/30 pb-3 print:block">
        <p className="font-heading text-lg font-bold uppercase tracking-wide text-navy">
          {ORG_NAME}
        </p>
        <p className="text-xs uppercase tracking-widest text-gold">{ORG_TAGLINE}</p>
        <p className="mt-2 font-heading text-xl font-bold text-navy">
          {reportTitle} — {periodLabel}
        </p>
        <p className="text-xs text-charcoal/60">
          Generated {generatedOn} · Charity No. {CHARITY_REG_NUMBER}
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">Reports</h1>
          <p className="mt-1 text-charcoal/70">
            Showing <span className="font-semibold">{range.label}</span>{" "}
            (inventory &amp; expiry reports show current snapshot).
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-4 print:hidden">
        <ReportControls
          report={report}
          range={rangeKey}
          from={range.from}
          to={range.to}
        />
      </div>
      {content}
    </div>
  );
}
