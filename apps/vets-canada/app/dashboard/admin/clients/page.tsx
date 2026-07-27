import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import ClientsManager, { type ClientRow } from "./ClientsManager";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  await requirePermission("clients");
  const { rows } = await sql`
    SELECT c.id, c.client_id, c.name, c.first_name, c.last_name, c.family_size, c.point_budget, c.is_active,
           c.archive_reason, c.date_of_birth, c.gender, c.member_status, c.address, c.contact,
           c.email, c.service_number, c.notes, c.has_allergy, c.allergy_info,
           c.code_of_conduct, c.terms_of_service, c.delivery_approved,
           (c.portal_pin IS NOT NULL) AS has_portal_pin,
           (SELECT COUNT(*)::int FROM family_members fm WHERE fm.client_id = c.id) AS member_count,
           (SELECT COUNT(*)::int FROM authorized_pickups ap WHERE ap.client_id = c.id) AS pickup_count
    FROM clients c
    ORDER BY c.is_active DESC, c.name;
  `;
  const clients: ClientRow[] = rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    firstName: r.first_name || "",
    lastName: r.last_name || "",
    familySize: r.family_size,
    pointBudget: r.point_budget,
    isActive: r.is_active,
    archiveReason: r.archive_reason,
    memberCount: r.member_count,
    dateOfBirth: r.date_of_birth ? String(r.date_of_birth) : null,
    gender: r.gender,
    memberStatus: r.member_status,
    address: r.address,
    contact: r.contact,
    email: r.email,
    serviceNumber: r.service_number,
    notes: r.notes,
    hasAllergy: r.has_allergy,
    allergyInfo: r.allergy_info,
    codeOfConduct: r.code_of_conduct,
    termsOfService: r.terms_of_service,
    pickupCount: r.pickup_count,
    deliveryApproved: r.delivery_approved,
    hasPortalPin: r.has_portal_pin,
  }));

  // Suggest the next Client ID (VET-#### based on the highest existing number).
  let maxNum = 0;
  for (const r of rows) {
    const m = String(r.client_id || "").match(/(\d+)\s*$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  const nextClientId = `VET-${String(maxNum + 1).padStart(4, "0")}`;

  return <ClientsManager clients={clients} nextClientId={nextClientId} />;
}
