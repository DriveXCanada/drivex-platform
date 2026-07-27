import "server-only";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { getTenantId } from "./tenant";

/**
 * Database client for the DriveX platform.
 *
 * This is a drop-in replacement for the `sql` tagged-template that the app
 * previously imported from `@vercel/postgres`. It is backed by `pg`
 * (node-postgres) so it can talk to a standard Postgres instance (Railway),
 * and it preserves the exact call surface the rest of the app relies on:
 *
 *   const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
 *   const { rows } = await sql.query("SELECT ... WHERE x = $1", [x]);
 *
 * Multi-tenancy: every query runs on a pooled connection that first sets the
 * `app.tenant_id` GUC. Postgres Row-Level Security policies filter reads and
 * a `tenant_id` column default stamps writes, so tenant isolation is enforced
 * by the database, not by individual query call-sites.
 */

// ---------------------------------------------------------------------------
// Connection pools
// ---------------------------------------------------------------------------
// - App pool: connects as the non-superuser application role so RLS is
//   actually enforced (superusers and table owners bypass RLS).
// - Admin pool: superuser connection used only for one-time bootstrap / DDL
//   (creating the schema, the app role, and the RLS policies) and seeding.

let appPool: Pool | null = null;
let adminPool: Pool | null = null;

function makePool(connectionString: string): Pool {
  // Railway's public proxy (…proxy.rlwy.net) requires SSL; the internal host
  // (postgres.railway.internal) speaks plaintext inside the private network.
  const isInternal = connectionString.includes(".railway.internal");
  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: isInternal ? undefined : { rejectUnauthorized: false },
  });
}

function getAppPool(): Pool {
  if (!appPool) {
    const url = process.env.DATABASE_URL;
    if (!url || url.trim() === "") {
      throw new Error(
        "Missing required environment variable: DATABASE_URL (the application " +
          "role connection string). Set it in .env.local locally or in Railway → " +
          "service → Variables."
      );
    }
    appPool = makePool(url);
  }
  return appPool;
}

/**
 * Superuser pool for bootstrap/DDL. Falls back to DATABASE_URL if no dedicated
 * admin URL is configured (useful for the very first bootstrap run before the
 * app role exists).
 */
export function getAdminPool(): Pool {
  if (!adminPool) {
    const url = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
    if (!url || url.trim() === "") {
      throw new Error(
        "Missing required environment variable: ADMIN_DATABASE_URL (superuser " +
          "connection string used for one-time database bootstrap)."
      );
    }
    adminPool = makePool(url);
  }
  return adminPool;
}

// ---------------------------------------------------------------------------
// Tenant-scoped query runner
// ---------------------------------------------------------------------------

async function runScoped(
  pool: Pool,
  text: string,
  values: unknown[]
): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    // Bind the tenant for this connection before the real query runs. Every
    // scoped call sets it first, so a reused pooled connection never leaks a
    // previous tenant's value.
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [
      getTenantId(),
    ]);
    return await client.query(text, values as unknown[]);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// `sql` tagged-template client (drop-in for @vercel/postgres)
// ---------------------------------------------------------------------------

export interface SqlClient {
  <T extends QueryResultRow = QueryResultRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResult<T>>;
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResult<T>>;
}

/** Turn a tagged template into a `$1,$2,…` parameterized statement. */
function buildText(strings: TemplateStringsArray, values: unknown[]): string {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}${strings[i + 1]}`;
  }
  return text;
}

function makeSqlClient(getPool: () => Pool): SqlClient {
  const tag = ((strings: TemplateStringsArray, ...values: unknown[]) =>
    runScoped(getPool(), buildText(strings, values), values)) as SqlClient;
  tag.query = (text: string, values: unknown[] = []) =>
    runScoped(getPool(), text, values);
  return tag;
}

/**
 * The application SQL client. Runs as the app role with RLS enforced.
 * All request-time application queries go through this.
 */
export const sql: SqlClient = makeSqlClient(getAppPool);

/**
 * The admin SQL client. Runs as the superuser and is used exclusively by the
 * bootstrap / migration code in `lib/init.ts` for DDL and seeding.
 */
export const adminSql: SqlClient = makeSqlClient(getAdminPool);

/**
 * Returns true if the core application tables already exist.
 * Uses the admin connection so it works before the app role is created.
 */
export async function tablesExist(): Promise<boolean> {
  const { rows } = await adminSql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users'
    ) AS exists;
  `;
  return rows[0]?.exists === true;
}
