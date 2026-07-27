import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import InfoHint from "@/components/InfoHint";

export const dynamic = "force-dynamic";

const actions = [
  {
    href: "/dashboard/visit",
    title: "New Client Visit",
    desc: "Look up a client and build their visit by points.",
    accent: "bg-navy",
  },
  {
    href: "/dashboard/donation",
    title: "Log Donation",
    desc: "Record incoming stock and set expiry dates.",
    accent: "bg-military",
  },
  {
    href: "/dashboard/count",
    title: "Stock Count",
    desc: "Do a physical count and flag discrepancies.",
    accent: "bg-gold",
  },
  {
    href: "/dashboard/waste",
    title: "Write-Off",
    desc: "Remove damaged or expired stock.",
    accent: "bg-military",
  },
  {
    href: "/dashboard/schedule",
    title: "Schedule",
    desc: "Book shopping appointments.",
    accent: "bg-navy",
  },
];

export default async function VolunteerHome() {
  const session = await requireAuth();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-navy">
        Welcome, {session.name}
      </h1>
      <p className="mt-1 text-charcoal/70">What would you like to do?</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-navy/10 bg-navy/5 px-4 py-3 text-sm text-charcoal/80">
        <span aria-hidden>🎓</span>
        <span>
          New to the app? Read the{" "}
          <Link
            href="/dashboard/training"
            className="font-semibold text-navy underline"
          >
            Training guide
          </Link>
          .
        </span>
        <InfoHint
          label="What are credits?"
          text="Clients shop using monthly 'credits' — 60 for one person plus 5 per extra household member. Items cost credits, and shopping subtracts from their budget."
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <span
              className={`mb-4 inline-block h-2 w-12 rounded ${a.accent}`}
            />
            <span className="font-heading text-xl font-bold text-navy">
              {a.title}
            </span>
            <span className="mt-2 text-sm text-charcoal/70">{a.desc}</span>
            <span className="mt-4 text-sm font-semibold text-navy group-hover:underline">
              Start →
            </span>
          </Link>
        ))}
      </div>

      {session.role === "manager" && (
        <div className="mt-8">
          <Link href="/dashboard/admin" className="btn-outline">
            Go to Manager Dashboard →
          </Link>
        </div>
      )}
    </div>
  );
}
