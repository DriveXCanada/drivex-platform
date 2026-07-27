import Link from "next/link";
import { requireAnyAdmin, getCurrentPermissions } from "@/lib/auth";
import {
  getOverviewStats,
  getExpiringItems,
  getLifetimeTotals,
  getCreditSnapshot,
  getInactiveClients,
  getMembershipBreakdown,
  DEFAULT_EXPIRY_THRESHOLD_DAYS,
  DEFAULT_INACTIVE_DAYS,
} from "@/lib/admin-queries";
import { WEIGHT_UNIT } from "@/lib/units";
import ExpiryAlert from "@/components/ExpiryAlert";

export const dynamic = "force-dynamic";

const adminLinks = [
  { href: "/dashboard/admin/clients", title: "Clients", desc: "Manage client records & visit history", perm: "clients" },
  { href: "/dashboard/admin/baskets", title: "Holiday Baskets", desc: "Log & track Easter, Christmas, Back to School baskets", perm: "clients" },
  { href: "/dashboard/admin/inventory", title: "Inventory", desc: "Stock levels & expiry tracking", perm: "inventory" },
  { href: "/dashboard/admin/items", title: "Items & Categories", desc: "Manage catalog & point values", perm: "items" },
  { href: "/dashboard/admin/volunteers", title: "Volunteers", desc: "Manage accounts & PINs", perm: "manager" },
  { href: "/dashboard/admin/orders", title: "Delivery Orders", desc: "Client orders to shop & deliver", perm: "orders" },
  { href: "/dashboard/admin/donors", title: "Donors", desc: "Donor registry & printable reports", perm: "donors" },
  { href: "/dashboard/admin/donors/cash", title: "Cash & Gift Cards", desc: "Log cash, e-transfer & gift card donations", perm: "donors" },
  { href: "/dashboard/admin/expenses", title: "Expenses", desc: "Track money spent & where it goes", perm: "expenses" },
  { href: "/dashboard/admin/entries", title: "Entries & Corrections", desc: "Fix entries made in error", perm: "entries" },
  { href: "/dashboard/admin/export", title: "Data Export & Backups", desc: "Download CSVs for Excel / Airtable / backups", perm: "export" },
  { href: "/dashboard/admin/reports", title: "Reports", desc: "Full reporting suite", perm: "reports" },
];

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="card">
      <div className={`mb-2 h-1 w-10 rounded ${accent}`} />
      <p className="text-3xl font-bold text-navy">{value}</p>
      <p className="text-sm text-charcoal/60">{label}</p>
    </div>
  );
}

const money = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
const number = (n: number) => n.toLocaleString("en-CA");

export default async function AdminHome() {
  const session = await requireAnyAdmin();
  const perms = await getCurrentPermissions();
  const isManager = session.role === "manager";
  const visibleLinks = adminLinks.filter((l) =>
    l.perm === "manager" ? isManager : perms.includes(l.perm)
  );
  const [stats, expiring, lifetime, credits, inactive, membership] = await Promise.all([
    getOverviewStats(),
    getExpiringItems(DEFAULT_EXPIRY_THRESHOLD_DAYS),
    getLifetimeTotals(),
    getCreditSnapshot(),
    getInactiveClients(DEFAULT_INACTIVE_DAYS),
    getMembershipBreakdown(),
  ]);

  const coverage =
    credits.monthlyCreditsExpected > 0
      ? Math.round((credits.creditsOnHand / credits.monthlyCreditsExpected) * 100)
      : 0;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-navy">
        Manager Dashboard
      </h1>
      <p className="mt-1 text-charcoal/70">This week at a glance.</p>

      {/* Lifetime impact */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-navy text-white">
          <p className="text-3xl font-bold">{number(lifetime.veteransHelped)}</p>
          <p className="text-sm text-white/80">Veterans served (all-time)</p>
        </div>
        <div className="card bg-navy/80 text-white">
          <p className="text-3xl font-bold">{number(lifetime.peopleServed)}</p>
          <p className="text-sm text-white/80">People served, incl. family</p>
        </div>
        <div className="card bg-gold text-white">
          <p className="text-3xl font-bold">{money(lifetime.valueDistributed)}</p>
          <p className="text-sm text-white/80">Value distributed (all-time)</p>
        </div>
        <div className="card bg-military text-white">
          <p className="text-3xl font-bold">
            {number(lifetime.weightDistributed)} {WEIGHT_UNIT}
          </p>
          <p className="text-sm text-white/80">Food distributed (all-time)</p>
        </div>
      </div>

      {/* Monthly credit snapshot */}
      <div className="mt-4 rounded-xl border border-navy/20 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-navy">
          Monthly Credits
        </h2>
        <p className="text-sm text-charcoal/60">
          Each family shops once a month (credits don&apos;t roll over). Updates
          automatically as inventory and the client list change.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-bold text-navy">
              {number(credits.monthlyCreditsExpected)}
            </p>
            <p className="text-sm text-charcoal/60">
              Credits expected to be shopped / month
              <span className="block text-xs text-charcoal/40">
                ({credits.activeClients} active families)
              </span>
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-navy">
              {number(credits.creditsOnHand)}
            </p>
            <p className="text-sm text-charcoal/60">
              Credits on hand (current food inventory)
            </p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                coverage >= 100 ? "text-green-700" : "text-military"
              }`}
            >
              {coverage}%
            </p>
            <p className="text-sm text-charcoal/60">
              Inventory coverage of monthly demand
            </p>
          </div>
        </div>
      </div>

      {/* Membership breakdown */}
      <div className="mt-4 rounded-xl border border-navy/20 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-navy">
          Membership (active clients)
        </h2>
        <p className="text-sm text-charcoal/60">
          Who&apos;s who across your {number(membership.total)} active clients.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-navy/10 bg-navy/5 p-4">
            <p className="text-2xl font-bold text-navy">{number(membership.serving)}</p>
            <p className="text-sm text-charcoal/60">Serving members</p>
          </div>
          <div className="rounded-lg border border-gold/20 bg-gold/10 p-4">
            <p className="text-2xl font-bold text-navy">{number(membership.retired)}</p>
            <p className="text-sm text-charcoal/60">Retired members</p>
          </div>
          <div className="rounded-lg border border-black/5 bg-offwhite p-4">
            <p className="text-2xl font-bold text-charcoal/70">{number(membership.unspecified)}</p>
            <p className="text-sm text-charcoal/60">Not specified yet</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Clients served this week"
          value={stats.clientsServedThisWeek}
          accent="bg-navy"
        />
        <StatCard
          label="Items distributed this week"
          value={stats.itemsDistributedThisWeek}
          accent="bg-gold"
        />
        <StatCard
          label="Low stock items"
          value={stats.lowStockCount}
          accent="bg-amber-500"
        />
        <StatCard
          label="Expiring soon"
          value={stats.expiringSoonCount}
          accent="bg-military"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-heading text-lg font-bold text-navy">
            Quick Links
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl border border-black/5 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <p className="font-heading text-base font-bold text-navy">
                  {l.title}
                </p>
                <p className="mt-1 text-sm text-charcoal/60">{l.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="mb-3 font-heading text-lg font-bold text-navy">
              Expiring Soon
            </h2>
            <div className="card">
              <ExpiryAlert items={expiring} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-heading text-lg font-bold text-navy">
              Check-In Needed
            </h2>
            <div className="card">
              {inactive.length === 0 ? (
                <p className="text-sm text-charcoal/50">
                  Everyone&apos;s been in recently. 👍
                </p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-charcoal/50">
                    Active families not seen in {DEFAULT_INACTIVE_DAYS}+ days —
                    consider checking in.
                  </p>
                  <ul className="divide-y divide-black/5">
                    {inactive.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span>
                          <span className="font-medium text-charcoal">
                            {c.name}
                          </span>
                          <span className="block text-xs text-charcoal/50">
                            {c.clientId}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                          {c.daysSince === null
                            ? "never visited"
                            : `${c.daysSince}d ago`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
