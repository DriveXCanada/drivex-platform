"use server";

import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import type { HolidayBasket } from "../clients/actions";

export async function getAllBasketsAction(): Promise<HolidayBasket[]> {
  await requirePermission("clients");
  const { rows } = await sql`
    SELECT hb.id, hb.client_id, cl.client_id AS client_code, cl.name AS client_name,
           hb.holiday, hb.year, hb.notes, u.name AS given_by, hb.given_at
    FROM holiday_baskets hb
    JOIN clients cl ON cl.id = hb.client_id
    LEFT JOIN users u ON u.id = hb.given_by
    ORDER BY hb.year DESC, hb.given_at DESC;
  `;
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientCode: r.client_code,
    clientName: r.client_name,
    holiday: r.holiday,
    year: r.year,
    notes: r.notes,
    givenBy: r.given_by,
    givenAt: new Date(r.given_at).toLocaleDateString(),
  }));
}
