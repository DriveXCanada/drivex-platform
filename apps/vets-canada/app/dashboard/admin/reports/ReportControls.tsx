"use client";

import { useRouter, useSearchParams } from "next/navigation";

const REPORTS = [
  { key: "visits", label: "Client Visits" },
  { key: "top-items", label: "Top Items" },
  { key: "inventory", label: "Inventory Levels" },
  { key: "donations", label: "Donations" },
  { key: "audit", label: "Audit / Discrepancy" },
  { key: "expiry", label: "Expiry" },
  { key: "volunteers", label: "Volunteer Activity" },
  { key: "points", label: "Points Usage" },
  { key: "value-clients", label: "Value by Client" },
  { key: "donations-by-donor", label: "Donations by Donor" },
  { key: "gift-cards", label: "Gift Cards Given" },
  { key: "waste", label: "Write-Offs" },
  { key: "most-needed", label: "Most Needed" },
  { key: "shopping-list", label: "Shopping List by Store" },
  { key: "demographics", label: "Family Demographics" },
  { key: "explorer", label: "Custom Filter" },
  { key: "client-activity", label: "Client Activity" },
  { key: "expenses", label: "Expenses" },
];

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

export default function ReportControls({
  report,
  range,
  from,
  to,
}: {
  report: string;
  range: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`/dashboard/admin/reports?${next.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setParam("report", r.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              report === r.key
                ? "bg-navy text-white"
                : "bg-white text-navy hover:bg-navy/10"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setParam("range", r.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              range === r.key
                ? "bg-gold text-white"
                : "bg-white text-charcoal hover:bg-gold/10"
            }`}
          >
            {r.label}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-end gap-2">
            <div>
              <label className="label">From</label>
              <input
                type="date"
                defaultValue={from}
                onChange={(e) => setParam("from", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                defaultValue={to}
                onChange={(e) => setParam("to", e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
