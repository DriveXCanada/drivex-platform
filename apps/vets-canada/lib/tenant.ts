/**
 * Tenant resolution.
 *
 * DriveX runs one app per tenant/brand in the monorepo. The active tenant for
 * this deployment is fixed by the `TENANT_ID` environment variable (falling
 * back to `vets-canada`, which is the tenant this app was migrated from).
 *
 * Every database call stamps/filters rows by this value: the `sql` client sets
 * the `app.tenant_id` Postgres GUC per request, and Row-Level Security policies
 * (plus a column default) enforce isolation in the database itself.
 */

export const DEFAULT_TENANT_ID = "vets-canada";

/** The tenant id for the current deployment. */
export function getTenantId(): string {
  const t = process.env.TENANT_ID?.trim();
  return t && t.length > 0 ? t : DEFAULT_TENANT_ID;
}

/** Human-readable name for the current tenant (used when seeding the tenants row). */
export function getTenantName(): string {
  const n = process.env.TENANT_NAME?.trim();
  return n && n.length > 0 ? n : "VETS Canada — Dartmouth";
}
