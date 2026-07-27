import { requireAuth } from "@/lib/auth";
import { getCatalog } from "@/lib/queries";
import { sql } from "@/lib/db";
import DonationForm, { type DonorOption } from "./DonationForm";

export const dynamic = "force-dynamic";

export default async function DonationPage() {
  await requireAuth();
  const catalog = await getCatalog();
  const { rows } = await sql`
    SELECT id, name FROM donors WHERE is_active = true ORDER BY name;
  `;
  const donors: DonorOption[] = rows.map((r) => ({ id: r.id, name: r.name }));
  return <DonationForm catalog={catalog} donors={donors} />;
}
