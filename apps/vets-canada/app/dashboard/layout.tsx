import Link from "next/link";
import { requireAuth, getCurrentPermissions } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import NavLink from "@/components/NavLink";
import { APP_VERSION } from "@/lib/version";
import { ensureInitialized } from "@/lib/init";
import AutoBackup from "@/components/AutoBackup";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Make sure the schema is created/migrated before any page queries run.
  // Cheap after the first call per server instance (in-memory guard).
  await ensureInitialized();

  // Allow access even when a PIN change is pending so the change-pin page works.
  const session = await requireAuth({ allowMustChangePin: true });
  const isManager = session.role === "manager";
  const perms = await getCurrentPermissions();
  const can = (key: string) => perms.includes(key);
  const hasAnyAdmin = perms.length > 0;

  return (
    <div className="min-h-screen bg-offwhite">
      {/* Top brand bar */}
      <header className="bg-navy text-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-1.5 rounded bg-military" />
            <div className="leading-tight">
              <p className="font-heading text-lg font-bold uppercase tracking-wide">
                VETS Canada — Dartmouth
              </p>
              <p className="text-[11px] uppercase tracking-widest text-gold">
                Proudly Supported by DriveX
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-right text-sm sm:block">
              <span className="block font-semibold">{session.name}</span>
              <span className="text-xs uppercase tracking-wide text-white/70">
                {session.role}
              </span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Navigation */}
      {!session.mustChangePin && (
        <nav className="border-b border-black/5 bg-white print:hidden">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2">
            <NavLink href="/dashboard" exact>
              Home
            </NavLink>
            <NavLink href="/dashboard/visit">Client Visit</NavLink>
            <NavLink href="/dashboard/donation">Log Donation</NavLink>
            <NavLink href="/dashboard/count">Stock Count</NavLink>
            <NavLink href="/dashboard/waste">Write-Off</NavLink>
            <NavLink href="/dashboard/schedule">Schedule</NavLink>
            <NavLink href="/dashboard/availability">My Availability</NavLink>
            {hasAnyAdmin && (
              <>
                <span className="mx-1 self-center text-black/20">|</span>
                <NavLink href="/dashboard/admin" exact>
                  Admin
                </NavLink>
                {can("clients") && <NavLink href="/dashboard/admin/clients">Clients</NavLink>}
                {can("clients") && <NavLink href="/dashboard/admin/baskets">Baskets</NavLink>}
                {can("inventory") && <NavLink href="/dashboard/admin/inventory">Inventory</NavLink>}
                {can("items") && <NavLink href="/dashboard/admin/items">Items</NavLink>}
                {isManager && <NavLink href="/dashboard/admin/volunteers">Volunteers</NavLink>}
                {can("orders") && <NavLink href="/dashboard/admin/orders">Orders</NavLink>}
                {can("donors") && <NavLink href="/dashboard/admin/donors">Donors</NavLink>}
                {can("expenses") && <NavLink href="/dashboard/admin/expenses">Expenses</NavLink>}
                {can("entries") && <NavLink href="/dashboard/admin/entries">Corrections</NavLink>}
                {can("export") && <NavLink href="/dashboard/admin/export">Export</NavLink>}
                {can("reports") && <NavLink href="/dashboard/admin/reports">Reports</NavLink>}
              </>
            )}
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      {can("export") && <AutoBackup />}

      <footer className="border-t border-black/5 py-6 text-center text-xs text-charcoal/50 print:hidden">
        VETS Canada — Dartmouth Food Bank · Proudly Supported by DriveX
        <span className="ml-2 text-charcoal/30">{APP_VERSION}</span>
      </footer>
    </div>
  );
}
