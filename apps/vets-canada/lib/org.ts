import "server-only";
import { cache } from "react";
import { sql } from "./db";
import { getTenantName } from "./tenant";

/**
 * Organization / charity details used on receipts and reports.
 *
 * These are PER-TENANT: they live in the `tenants` table and are read for the
 * currently-active tenant. This ensures each organization's receipts and tax
 * documents show ITS OWN name and charity registration number — never another
 * tenant's. Values are seeded from the TENANT_* env vars at setup time.
 */

export interface OrgInfo {
  name: string;
  tagline: string;
  /** CRA charity registration number, printed on tax receipts. May be blank. */
  charityRegNumber: string;
}

/**
 * Load the active tenant's org details (cached per request). Falls back to the
 * tenant name from env and blank branding if the row/columns are unavailable —
 * importantly, it never falls back to a hard-coded charity number.
 */
export const getOrg = cache(async (): Promise<OrgInfo> => {
  try {
    const { rows } = await sql`
      SELECT name, tagline, charity_reg_number
      FROM tenants
      WHERE id = current_setting('app.tenant_id', true)
      LIMIT 1;
    `;
    const r = rows[0];
    return {
      name: (r?.name as string) || getTenantName(),
      tagline: (r?.tagline as string) || "",
      charityRegNumber: (r?.charity_reg_number as string) || "",
    };
  } catch {
    return { name: getTenantName(), tagline: "", charityRegNumber: "" };
  }
});
