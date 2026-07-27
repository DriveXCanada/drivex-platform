import { requireAuth } from "@/lib/auth";
import { getOrg } from "@/lib/org";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Small building blocks kept local to this page.
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-24">
      <h2 className="font-heading text-xl font-bold text-navy">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-charcoal/80">
        {children}
      </div>
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="ml-5 list-decimal space-y-1.5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  );
}

function Term({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-semibold text-navy">{term}:</span> {children}
    </p>
  );
}

export default async function TrainingPage() {
  await requireAuth({ allowMustChangePin: true });
  const org = await getOrg();

  const toc: { id: string; label: string }[] = [
    { id: "start", label: "Getting Started" },
    { id: "terms", label: "Key Terms" },
    { id: "everyday", label: "Everyday Tasks" },
    { id: "managers", label: "For Managers" },
    { id: "portal", label: "Client Delivery Portal" },
    { id: "tips", label: "Tips & Good Practices" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">
          Training &amp; Help
        </h1>
        <p className="mt-1 text-sm text-charcoal/70">
          A quick guide to running {org.name} in this app. New here? Start with{" "}
          <a href="#start" className="text-navy underline">
            Getting Started
          </a>{" "}
          and{" "}
          <a href="#everyday" className="text-navy underline">
            Everyday Tasks
          </a>
          . Look for the small <span className="font-semibold">ⓘ</span> markers
          around the app for quick tips in the moment.
        </p>
      </div>

      {/* Table of contents */}
      <nav className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          On this page
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {toc.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="rounded-full bg-offwhite px-3 py-1 text-sm text-navy hover:bg-navy hover:text-white"
            >
              {t.label}
            </a>
          ))}
        </div>
      </nav>

      <Section id="start" title="Getting Started">
        <Term term="Signing in">
          Staff sign in with a name/account and a 4-digit PIN. The first time you
          log in you may be asked to set a new PIN.
        </Term>
        <Term term="Logging out">
          Always log out on shared computers or tablets (top-right button).
        </Term>
        <Term term="The menu">
          The bar across the top has everyday tasks (Client Visit, Log Donation,
          Stock Count, Write-Off, Schedule, My Availability). Managers and
          volunteers with permission also see an <strong>Admin</strong> section.
        </Term>
        <Term term="Live everywhere">
          The app saves to one shared database — enter something on one device and
          it&apos;s there on every other device (refresh the page to see the
          latest).
        </Term>
      </Section>

      <Section id="terms" title="Key Terms">
        <Term term="Credits (points)">
          A monthly budget for each client family. Items &quot;cost&quot; credits;
          shopping subtracts from the budget. This keeps distribution fair.
        </Term>
        <Term term="Credit budget">
          60 credits for one person, plus 5 for each additional household member
          (a family of 3 = 70). Calculated automatically; a manager can override
          it.
        </Term>
        <Term term="One visit per month">
          Families are expected to shop once per calendar month; credits don&apos;t
          roll over. The app warns you if a client has already shopped this month.
        </Term>
        <Term term="Shop limit">
          A cap on how many of a single item one client can take per visit (e.g.
          Peanut Butter limited to 2).
        </Term>
        <Term term="Stock count (audit)">
          A physical count of the shelves. Submitting a count <em>sets</em>{" "}
          inventory to the counted number — the physical count is treated as the
          truth.
        </Term>
        <Term term="Write-off">
          Recording items removed from stock because they&apos;re spoiled,
          expired, or unusable.
        </Term>
        <Term term="Delivery order">
          An order placed by an approved client in the delivery portal, which
          staff then fulfill.
        </Term>
      </Section>

      <Section id="everyday" title="Everyday Tasks (everyone can do these)">
        <h3 className="font-heading font-bold text-navy">Helping a client shop</h3>
        <Steps
          items={[
            "Open Client Visit and search for the client by name or Client ID (or start from their appointment on the Schedule).",
            "The app shows their credit budget. If they've already shopped this month, a warning appears — only continue if a manager approves.",
            "Browse the catalog (tap a category to open it, or search). Use + / – to add items. Each item shows its point cost and stock.",
            "Watch the bar at the bottom: Used / Budget / Remaining credits.",
            "If a gift card was given, add it in the Gift Cards section.",
            "Add notes if needed, then Confirm Visit. This is permanent and reduces stock.",
          ]}
        />

        <h3 className="mt-2 font-heading font-bold text-navy">Logging a donation</h3>
        <Steps
          items={[
            "Open Log Donation and optionally choose the donor.",
            "Enter quantities donated; set an expiry date if relevant.",
            "Submit — this adds the items to inventory.",
          ]}
        />

        <h3 className="mt-2 font-heading font-bold text-navy">Doing a stock count</h3>
        <Steps
          items={[
            "Open Stock Count (optionally filter to one category).",
            "Enter the actual counted quantity for each item you counted — you only need to enter the ones you checked.",
            "Submit. The counted number becomes the new inventory level.",
          ]}
        />

        <h3 className="mt-2 font-heading font-bold text-navy">Recording a write-off</h3>
        <Steps
          items={[
            "Open Write-Off.",
            "Enter the quantity removed and a reason (expired, damaged, etc.).",
            "Submit — this reduces inventory and keeps a record.",
          ]}
        />

        <h3 className="mt-2 font-heading font-bold text-navy">
          Schedule &amp; availability
        </h3>
        <p>
          The Schedule shows client appointments, staff shifts, and team
          availability. Appointments flag a ⚠ allergy if the client has one, and
          have a 🛒 Start Visit button. Use <strong>My Availability</strong> to
          mark when you can work.
        </p>
      </Section>

      <Section id="managers" title="For Managers (and permitted volunteers)">
        <Term term="Clients">
          Add and manage client records, household members, authorized pickups,
          holiday baskets, and visit history. Credits auto-calculate from
          household size. Mark a client &quot;delivery approved&quot; and give a
          portal PIN to let them order online.
        </Term>
        <Term term="Inventory">
          Edit quantities, expiry dates, and shop limits. See total value and
          weight of current stock, with low-stock and expiring-soon flags.
        </Term>
        <Term term="Items &amp; Categories">
          Manage the catalog — categories (with default point values) and items
          (price, weight, optional per-item points). Disable an item to hide it
          from shopping while keeping its history.
        </Term>
        <Term term="Volunteers">
          Create accounts, set/reset PINs, and grant each volunteer specific
          permissions. Deactivating an account removes access immediately.
        </Term>
        <Term term="Orders, Donors, Expenses">
          Fulfill delivery orders, keep a donor registry, log cash/e-transfer/gift
          card donations (with printable tax receipts
          {org.charityRegNumber ? ` showing charity No. ${org.charityRegNumber}` : ""}
          ), and record expenses.
        </Term>
        <Term term="Reports &amp; Export">
          A large suite of reports (visits, top items, shopping list by store,
          demographics, and a custom filter builder). Export any table as a CSV,
          or download a full backup.
        </Term>
      </Section>

      <Section id="portal" title="Client Delivery Portal">
        <p>
          Approved clients use a separate, simpler portal to order for delivery.
          They sign in with their Client ID and portal PIN, shop within their
          credit budget, optionally request a gift card (not guaranteed), and
          submit an order — which appears on the staff <strong>Orders</strong>{" "}
          screen. They never see staff screens.
        </p>
      </Section>

      <Section id="tips" title="Tips &amp; Good Practices">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Stock counts overwrite the system quantity — count carefully.</li>
          <li>
            Confirming a visit, donation, or write-off is permanent and changes
            stock. Fix mistakes through <strong>Corrections</strong>.
          </li>
          <li>
            Keep client birthdates and family details up to date — several reports
            depend on them.
          </li>
          <li>Log out on shared devices.</li>
        </ul>
        <p className="pt-2 text-charcoal/60">
          Still stuck? Ask a manager, or head back to the{" "}
          <Link href="/dashboard" className="text-navy underline">
            Home dashboard
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
