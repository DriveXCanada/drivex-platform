import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EXPORTS = [
  { type: "clients", title: "Clients", desc: "All client records, credits, status, archive reasons" },
  { type: "family_members", title: "Family Members", desc: "Household members with details & allergy notes" },
  { type: "authorized_pickups", title: "Authorized Pickups", desc: "People allowed to collect on a client's behalf" },
  { type: "inventory", title: "Inventory", desc: "Current stock with prices, weights, values, expiry" },
  { type: "transactions", title: "Transactions", desc: "Every visit, donation, count & write-off" },
  { type: "donors", title: "Donors", desc: "Donor registry with totals donated" },
  { type: "cash_donations", title: "Cash & Gift Donations", desc: "Cash, e-transfer & gift card donations" },
  { type: "gift_cards", title: "Gift Cards Given", desc: "Gift cards handed to clients on visits" },
  { type: "holiday_baskets", title: "Holiday Baskets", desc: "Holiday baskets given to clients by occasion & year" },
  { type: "expenses", title: "Expenses", desc: "Recorded spending by date and category" },
  { type: "appointments", title: "Appointments", desc: "Booked shopping appointments" },
  { type: "shifts", title: "Staff Shifts", desc: "Scheduled volunteer & manager shifts" },
  { type: "availability", title: "Staff Availability", desc: "When staff marked themselves free / not free" },
  { type: "volunteer_hours", title: "Volunteer Hours", desc: "Logged hours & activity notes" },
];

export default async function ExportPage() {
  await requirePermission("export");

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-navy">
        Data Export &amp; Backups
      </h1>
      <p className="mt-1 text-charcoal/70">
        Download any table as a CSV file. Open these in Excel, Google Sheets, or
        Airtable, or keep them as off-site backups. We recommend a monthly
        backup of each.
      </p>

      {/* Full master backup */}
      <div className="mt-5 rounded-xl border border-navy/20 bg-navy/5 p-5 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-navy">
          Full Master Backup (everything, one file)
        </h2>
        <p className="mt-1 text-sm text-charcoal/70">
          Download <span className="font-semibold">every table at once</span> as a
          single ZIP of CSV files — a complete hard copy you can keep off-site in
          case the live system is ever unavailable.
        </p>
        <a href="/api/backup" download className="btn-primary mt-3 inline-block text-sm">
          ⬇ Download Full Backup (.zip)
        </a>
        <p className="mt-3 text-sm text-charcoal/70">
          <span className="font-semibold">Automatic hourly backups:</span> use the{" "}
          <span className="font-semibold">💾 Backup</span> button in the
          bottom-right corner of the screen to turn on auto-save. While the app
          stays open on this computer, it will save a fresh full backup to your
          Downloads folder once an hour — no clicking needed. Turn it on on the
          one computer you want to keep the master copies on.
        </p>
      </div>

      <h2 className="mt-6 font-heading text-lg font-bold text-navy">
        Individual Tables
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {EXPORTS.map((e) => (
          <div
            key={e.type}
            className="flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-heading text-base font-bold text-navy">{e.title}</p>
              <p className="text-sm text-charcoal/60">{e.desc}</p>
            </div>
            <a
              href={`/api/export?type=${e.type}`}
              className="btn-primary shrink-0 text-sm"
              download
            >
              Download CSV
            </a>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-charcoal/50">
        Tip: in Airtable, create a base and use “Add from CSV file” on each of
        these downloads to mirror your data there for browsing or sharing.
      </p>
    </div>
  );
}
