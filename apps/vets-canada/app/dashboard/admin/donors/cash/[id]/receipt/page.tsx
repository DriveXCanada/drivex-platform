import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ORG_NAME, ORG_TAGLINE, CHARITY_REG_NUMBER } from "@/lib/org";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  Number(n || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  await requirePermission("donors");
  const id = Number(params.id);
  if (!id) notFound();

  const { rows } = await sql`
    SELECT cd.id, cd.method, cd.amount, cd.gift_card_store, cd.donation_date,
           cd.receipt_contact, cd.receipt_address,
           COALESCE(d.name, cd.donor_name) AS donor
    FROM cash_donations cd
    LEFT JOIN donors d ON d.id = cd.donor_id
    WHERE cd.id = ${id};
  `;
  if (rows.length === 0) notFound();
  const c = rows[0];
  const receiptNo = `VC-${String(c.id).padStart(5, "0")}`;

  return (
    <div className="mx-auto max-w-2xl bg-white p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/dashboard/admin/donors/cash" className="btn-outline text-sm">← Back</Link>
        <PrintButton />
      </div>

      <div className="border-2 border-navy p-6">
        <div className="border-b-2 border-navy pb-3 text-center">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-navy">
            {ORG_NAME}
          </h1>
          <p className="text-xs uppercase tracking-widest text-gold">{ORG_TAGLINE}</p>
          <p className="mt-2 text-sm font-bold text-charcoal">Official Donation Receipt</p>
        </div>

        <div className="mt-4 flex justify-between text-sm">
          <div>
            <p><span className="font-semibold">Receipt #:</span> {receiptNo}</p>
            <p><span className="font-semibold">Date of donation:</span> {new Date(c.donation_date).toLocaleDateString()}</p>
            <p><span className="font-semibold">Date issued:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Charity Registration No.</p>
            <p>{CHARITY_REG_NUMBER}</p>
          </div>
        </div>

        <div className="mt-4 rounded border border-black/10 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-charcoal/50">Donor</p>
          <p className="text-base font-semibold">{c.donor || "Anonymous"}</p>
          {c.receipt_contact && <p>{c.receipt_contact}</p>}
          {c.receipt_address && <p className="whitespace-pre-line">{c.receipt_address}</p>}
        </div>

        <div className="mt-4 rounded bg-offwhite p-4 text-center">
          <p className="text-xs font-semibold uppercase text-charcoal/50">Amount received</p>
          <p className="text-3xl font-bold text-navy">{money(Number(c.amount))}</p>
          <p className="text-sm text-charcoal/60">
            {c.method}{c.method === "Gift Card" && c.gift_card_store ? ` — ${c.gift_card_store}` : ""}
          </p>
          <p className="mt-1 text-xs text-charcoal/50">Eligible amount of gift for tax purposes: {money(Number(c.amount))}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="mb-1 h-8 border-b border-black/40" />
            <p className="text-xs text-charcoal/60">Authorized signature</p>
          </div>
          <div>
            <div className="mb-1 h-8 border-b border-black/40" />
            <p className="text-xs text-charcoal/60">Location issued</p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-charcoal/50">
          Thank you for supporting our veterans. Please retain this receipt for
          your records. Canada Revenue Agency: www.canada.ca/charities-giving
        </p>
      </div>
    </div>
  );
}
