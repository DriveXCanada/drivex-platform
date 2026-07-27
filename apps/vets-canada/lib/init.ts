import "server-only";
import { adminSql as sql, getAdminPool } from "@/lib/db";
import {
  getTenantId,
  getTenantName,
  getTenantTagline,
  getTenantCharityNumber,
} from "@/lib/tenant";
import { hashPin } from "@/lib/auth";
import { SEED_CATEGORIES } from "@/lib/seed-data";
import { matchPrices, average } from "@/lib/pricebook";

/**
 * Multi-tenant schema management for the DriveX platform.
 *
 * All DDL and seeding runs through the ADMIN (superuser) connection. Superusers
 * bypass Row-Level Security, so this code can create/seed rows for the active
 * tenant while the running application (which connects as a dedicated
 * non-superuser role) has RLS enforced against it.
 *
 * Tenant isolation:
 *   - every application table carries a `tenant_id` column that defaults to the
 *     `app.tenant_id` GUC set per-connection by the db client;
 *   - RLS policies restrict every role (except the superuser/owner) to rows for
 *     the current `app.tenant_id`.
 */

/** Every application table that is scoped by tenant (i.e. carries tenant_id). */
const TENANT_TABLES = [
  "users",
  "volunteer_log",
  "categories",
  "items",
  "inventory",
  "item_prices",
  "clients",
  "family_members",
  "donors",
  "transactions",
  "transaction_items",
  "audit_counts",
  "orders",
  "order_items",
  "appointments",
  "visit_gift_cards",
  "cash_donations",
  "shifts",
  "expenses",
  "authorized_pickups",
  "availability",
  "holiday_baskets",
  "login_attempts",
] as const;

const APP_ROLE_DEFAULT = "vets_app";

/** Validated application-role name (identifiers cannot be parameterized in DDL). */
function appRoleName(): string {
  const name = (process.env.APP_DB_USER || APP_ROLE_DEFAULT).trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Invalid APP_DB_USER "${name}": must be a valid Postgres identifier.`
    );
  }
  return name;
}

/**
 * Create the tenants registry table. This is the one table not scoped by a
 * `tenant_id` column — its primary key *is* the tenant id.
 */
export async function createTenantsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT,
      charity_reg_number TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  // Branding columns for databases created before per-tenant branding existed.
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tagline TEXT;`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS charity_reg_number TEXT;`;
}

/**
 * Ensure a row exists for the current deployment's tenant, seeding its
 * branding (name / tagline / charity registration number) from the TENANT_*
 * environment variables. These drive receipts and reports, so each tenant
 * shows its OWN organization details.
 */
export async function ensureTenant(): Promise<void> {
  await sql`
    INSERT INTO tenants (id, name, tagline, charity_reg_number)
    VALUES (
      ${getTenantId()},
      ${getTenantName()},
      ${getTenantTagline()},
      ${getTenantCharityNumber()}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      charity_reg_number = EXCLUDED.charity_reg_number;
  `;
}

/**
 * Create all application tables (idempotent — safe to call repeatedly).
 * Every table carries a tenant_id that defaults to the current app.tenant_id.
 */
export async function createTables(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('manager', 'volunteer')),
      must_change_pin BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      emergency_contact TEXT,
      availability TEXT,
      strengths TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS volunteer_log (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      volunteer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      log_date DATE NOT NULL DEFAULT CURRENT_DATE,
      hours NUMERIC(5,2) NOT NULL DEFAULT 0,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      point_value INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      unit_weight NUMERIC(10,3) NOT NULL DEFAULT 0,
      shop_limit INTEGER,
      point_value INTEGER,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 0,
      expiry_date DATE,
      last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS item_prices (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      store TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      family_size INTEGER NOT NULL DEFAULT 1,
      point_budget INTEGER NOT NULL,
      date_of_birth DATE,
      gender TEXT,
      member_status TEXT,
      address TEXT,
      contact TEXT,
      email TEXT,
      service_number TEXT,
      notes TEXT,
      has_allergy BOOLEAN NOT NULL DEFAULT false,
      allergy_info TEXT,
      code_of_conduct BOOLEAN NOT NULL DEFAULT false,
      terms_of_service BOOLEAN NOT NULL DEFAULT false,
      delivery_approved BOOLEAN NOT NULL DEFAULT false,
      portal_pin TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      archive_reason TEXT,
      archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, client_id)
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS family_members (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT,
      date_of_birth DATE,
      gender TEXT,
      relation TEXT,
      address TEXT,
      contact TEXT,
      email TEXT,
      service_number TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS donors (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out', 'audit', 'waste')),
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      donor_id INTEGER REFERENCES donors(id) ON DELETE SET NULL,
      volunteer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      point_value_at_time INTEGER NOT NULL DEFAULT 0
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_counts (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      counted_quantity INTEGER NOT NULL,
      system_quantity INTEGER NOT NULL,
      discrepancy INTEGER NOT NULL,
      volunteer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
      points_used INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      gift_card_requested BOOLEAN NOT NULL DEFAULT false,
      gift_card_details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      fulfilled_at TIMESTAMPTZ,
      fulfilled_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      point_value_at_time INTEGER NOT NULL DEFAULT 0
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      client_name TEXT,
      appt_date DATE NOT NULL,
      appt_time TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS visit_gift_cards (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      store TEXT,
      amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS cash_donations (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      donor_id INTEGER REFERENCES donors(id) ON DELETE SET NULL,
      donor_name TEXT,
      method TEXT NOT NULL DEFAULT 'Cash',
      amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      gift_card_store TEXT,
      donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      tax_receipt_needed BOOLEAN NOT NULL DEFAULT false,
      receipt_contact TEXT,
      receipt_address TEXT,
      recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS shifts (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      shift_date DATE NOT NULL,
      start_time TEXT,
      end_time TEXT,
      role TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      category TEXT NOT NULL,
      description TEXT,
      vendor TEXT,
      amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS authorized_pickups (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relationship TEXT,
      contact TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS availability (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      avail_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'unavailable')),
      start_time TEXT,
      end_time TEXT,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS holiday_baskets (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      holiday TEXT NOT NULL,
      year INTEGER NOT NULL,
      notes TEXT,
      given_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      given_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true) REFERENCES tenants(id) ON DELETE CASCADE,
      ip TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'staff',
      success BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory(item_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_txn_items_txn ON transaction_items(transaction_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_item ON audit_counts(item_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_item_prices_item ON item_prices(item_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appt_date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cash_donations_date ON cash_donations(donation_date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cash_donations_donor ON cash_donations(donor_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_visit_gift_cards_txn ON visit_gift_cards(transaction_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_holiday_baskets_client ON holiday_baskets(client_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_holiday_baskets_holiday ON holiday_baskets(holiday, year);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(avail_date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_availability_user ON availability(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_authorized_pickups_client ON authorized_pickups(client_id);`;
  // Per-tenant lookups.
  await sql`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at);`;
}

/**
 * Enable Row-Level Security and (re)create the tenant-isolation policy on every
 * tenant-scoped table, plus the tenants registry itself. Idempotent.
 */
export async function enableRls(): Promise<void> {
  // tenants: a role may only see its own tenant row.
  await sql`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON tenants;`;
  await sql`
    CREATE POLICY tenant_isolation ON tenants
      USING (id = current_setting('app.tenant_id', true));
  `;

  for (const table of TENANT_TABLES) {
    // Identifier is from a fixed allow-list, so interpolation is safe here.
    await sql.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    await sql.query(`DROP POLICY IF EXISTS tenant_isolation ON ${table};`);
    await sql.query(
      `CREATE POLICY tenant_isolation ON ${table}
         USING (tenant_id = current_setting('app.tenant_id', true))
         WITH CHECK (tenant_id = current_setting('app.tenant_id', true));`
    );
  }
}

/**
 * Create (or sync the password of) the non-superuser application role and grant
 * it DML on the current + future tables/sequences. Runs on a single admin
 * connection so the role name/password can be passed safely via GUCs and read
 * back inside a DO block with format(%I/%L) — no string interpolation of
 * secrets into SQL.
 */
export async function bootstrapAppRole(): Promise<void> {
  const role = appRoleName();
  const password = process.env.APP_DB_PASSWORD;
  if (!password || password.trim() === "") {
    throw new Error(
      "Missing required environment variable: APP_DB_PASSWORD (password for the " +
        `application role "${role}"). Set it before bootstrapping the database.`
    );
  }

  const pool = getAdminPool();
  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.bootstrap_role', $1, false)", [
      role,
    ]);
    await client.query("SELECT set_config('app.bootstrap_pass', $1, false)", [
      password,
    ]);

    // Create or update the login role.
    await client.query(`
      DO $$
      DECLARE
        v_user text := current_setting('app.bootstrap_role');
        v_pass text := current_setting('app.bootstrap_pass');
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_user) THEN
          EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_user, v_pass);
        ELSE
          EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', v_user, v_pass);
        END IF;
      END
      $$;
    `);

    // Grant privileges (current + future objects). The role must NOT be a
    // superuser and must NOT have BYPASSRLS, so RLS is enforced against it.
    await client.query(`
      DO $$
      DECLARE v_user text := current_setting('app.bootstrap_role');
      BEGIN
        EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_user);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', v_user);
        EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', v_user);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', v_user);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', v_user);
      END
      $$;
    `);
  } finally {
    client.release();
  }
}

/**
 * Seed the default manager account. Assumes an empty users table.
 */
export async function seedManager(): Promise<void> {
  // Default manager (PIN 0000, must change on first login)
  const managerPin = await hashPin("0000");
  await sql`
    INSERT INTO users (name, pin, role, must_change_pin, is_active)
    VALUES ('Manager', ${managerPin}, 'manager', true, true);
  `;
}

/**
 * Seed the catalog (categories + items + zero-quantity inventory rows).
 * Assumes the catalog tables are empty.
 */
export async function seedCatalog(): Promise<void> {
  let catOrder = 0;
  for (const cat of SEED_CATEGORIES) {
    const { rows } = await sql`
      INSERT INTO categories (name, point_value, display_order)
      VALUES (${cat.name}, ${cat.pointValue}, ${catOrder})
      RETURNING id;
    `;
    const categoryId = rows[0].id as number;
    catOrder += 1;

    let itemOrder = 0;
    for (const itemName of cat.items) {
      // Pre-fill store prices from the price book where we can match.
      const storePrices = matchPrices(cat.name, itemName) ?? [];
      const unitPrice = average(storePrices);

      const itemResult = await sql`
        INSERT INTO items (category_id, name, unit_price, unit_weight, display_order, is_active)
        VALUES (${categoryId}, ${itemName}, ${unitPrice}, ${cat.weight}, ${itemOrder}, true)
        RETURNING id;
      `;
      const itemId = itemResult.rows[0].id as number;
      itemOrder += 1;
      await sql`
        INSERT INTO inventory (item_id, quantity, expiry_date)
        VALUES (${itemId}, 0, NULL);
      `;
      for (const sp of storePrices) {
        await sql`
          INSERT INTO item_prices (item_id, store, price)
          VALUES (${itemId}, ${sp.store}, ${sp.price});
        `;
      }
    }
  }
}

/**
 * Recompute an item's unit_price as the average of its store prices.
 * If it has no store prices, the existing unit_price is left untouched.
 */
export async function recomputeItemPrice(itemId: number): Promise<void> {
  const { rows } = await sql`
    SELECT COALESCE(ROUND(AVG(price), 2), 0) AS avg, COUNT(*)::int AS n
    FROM item_prices WHERE item_id = ${itemId};
  `;
  if ((rows[0]?.n ?? 0) > 0) {
    await sql`UPDATE items SET unit_price = ${rows[0].avg} WHERE id = ${itemId};`;
  }
}

/**
 * Seed the default manager and the full catalog. Assumes empty tables.
 */
export async function seedData(): Promise<void> {
  await seedManager();
  await seedCatalog();
}

/**
 * Wipe the catalog and all stock/transaction history, then reload the
 * default catalog. Manager-triggered. Does NOT touch user or client accounts.
 */
export async function resetCatalog(): Promise<void> {
  // Deleting transactions cascades to transaction_items; deleting categories
  // cascades to items -> inventory / transaction_items / audit_counts.
  await sql`DELETE FROM transactions;`;
  await sql`DELETE FROM audit_counts;`;
  await sql`DELETE FROM categories;`;
  await seedCatalog();
}

/**
 * Lightweight, idempotent schema migrations for existing databases.
 * (CREATE TABLE IF NOT EXISTS does not add new columns to existing tables.)
 */
export async function runMigrations(): Promise<void> {
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) NOT NULL DEFAULT 0;`;
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_weight NUMERIC(10,3) NOT NULL DEFAULT 0;`;
  // Per-item shop limit (max quantity per visit; NULL = no limit).
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS shop_limit INTEGER;`;
  // Per-item point/credit override (NULL = inherit the category's point value).
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS point_value INTEGER;`;
  // Gift card request on delivery orders.
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_requested BOOLEAN NOT NULL DEFAULT false;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_details TEXT;`;
  // Allow the 'waste' transaction type (write-offs) on existing databases.
  await sql`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;`;
  await sql`
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('stock_in', 'stock_out', 'audit', 'waste'));
  `;
  // Client archive fields.
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS archive_reason TEXT;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;`;
  // Primary client (head of household) detail fields.
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender TEXT;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact TEXT;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS service_number TEXT;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS delivery_approved BOOLEAN NOT NULL DEFAULT false;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_pin TEXT;`;
  // Allergy / food sensitivity flag (surfaces on the schedule).
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS has_allergy BOOLEAN NOT NULL DEFAULT false;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS allergy_info TEXT;`;
  // Compliance sign-offs.
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS code_of_conduct BOOLEAN NOT NULL DEFAULT false;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS terms_of_service BOOLEAN NOT NULL DEFAULT false;`;
  // Serving / retired member status (for who's-who reporting).
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS member_status TEXT;`;
  // Split first / last name (keep combined `name` for everything that reads it).
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_name TEXT;`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_name TEXT;`;
  // Best-effort backfill of existing single-field names (first word = first
  // name, remainder = last name). Only touches rows not yet split.
  await sql`
    UPDATE clients
    SET first_name = split_part(name, ' ', 1),
        last_name = CASE
          WHEN position(' ' in name) > 0
          THEN substring(name from position(' ' in name) + 1)
          ELSE ''
        END
    WHERE first_name IS NULL;
  `;
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS donor_id INTEGER REFERENCES donors(id) ON DELETE SET NULL;`;
  // Index after the column exists (must follow the ADD COLUMN above).
  await sql`CREATE INDEX IF NOT EXISTS idx_transactions_donor ON transactions(donor_id);`;
  // Cash donation tax-receipt fields.
  await sql`ALTER TABLE cash_donations ADD COLUMN IF NOT EXISTS tax_receipt_needed BOOLEAN NOT NULL DEFAULT false;`;
  await sql`ALTER TABLE cash_donations ADD COLUMN IF NOT EXISTS receipt_contact TEXT;`;
  await sql`ALTER TABLE cash_donations ADD COLUMN IF NOT EXISTS receipt_address TEXT;`;
  // Family member extra fields.
  await sql`ALTER TABLE family_members ADD COLUMN IF NOT EXISTS email TEXT;`;
  await sql`ALTER TABLE family_members ADD COLUMN IF NOT EXISTS notes TEXT;`;
  await sql`ALTER TABLE family_members ADD COLUMN IF NOT EXISTS relation TEXT;`;
  // Volunteer profile fields.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS availability TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS strengths TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT NOT NULL DEFAULT '[]';`;

  // --- Multi-tenant migration (idempotent) --------------------------------
  // Add tenant_id to every application table on databases created before the
  // DriveX multi-tenant migration, backfill existing rows to the current
  // tenant, then lock the column down with a default + NOT NULL + FK.
  const tenant = getTenantId();
  for (const table of TENANT_TABLES) {
    await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);
    await sql.query(`UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL;`, [
      tenant,
    ]);
    await sql.query(
      `ALTER TABLE ${table} ALTER COLUMN tenant_id SET DEFAULT current_setting('app.tenant_id', true);`
    );
    await sql.query(`ALTER TABLE ${table} ALTER COLUMN tenant_id SET NOT NULL;`);
    await sql.query(
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
           WHERE table_name = '${table}' AND constraint_name = '${table}_tenant_id_fkey'
         ) THEN
           EXECUTE 'ALTER TABLE ${table} ADD CONSTRAINT ${table}_tenant_id_fkey
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE';
         END IF;
       END $$;`
    );
  }
  // Replace the old global-unique constraint on clients.client_id with a
  // per-tenant one (safe/idempotent).
  await sql`ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_id_key;`;
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clients_tenant_id_client_id_key'
      ) THEN
        ALTER TABLE clients ADD CONSTRAINT clients_tenant_id_client_id_key
          UNIQUE (tenant_id, client_id);
      END IF;
    END $$;
  `;
}

/**
 * Full database bootstrap: tenants registry, schema, migrations, RLS, the app
 * role, and (if empty) seed data. Runs as the admin/superuser connection.
 */
export async function bootstrapDatabase(): Promise<void> {
  await createTenantsTable();
  await ensureTenant();
  await createTables(); // idempotent (CREATE TABLE IF NOT EXISTS)
  await runMigrations(); // idempotent (ADD COLUMN IF NOT EXISTS, tenant backfill)
  await enableRls(); // idempotent (re)creation of RLS policies
  await bootstrapAppRole(); // create/sync the non-superuser app role + grants
  // Only seed if there are no users for this tenant yet.
  const { rows } = await sql`
    SELECT COUNT(*)::int AS count FROM users
    WHERE tenant_id = current_setting('app.tenant_id', true);
  `;
  if (rows[0].count === 0) {
    await seedData();
  }
}

/**
 * No-op retained for backwards compatibility with existing call-sites.
 *
 * Bootstrapping (schema, RLS, the app role, seeding) is intentionally NOT run
 * during normal request handling any more, because it requires the superuser
 * (admin) connection. Running the app must not depend on holding superuser
 * credentials. Bootstrap now runs only via the token-protected `/api/setup`
 * endpoint, invoked explicitly during provisioning or after a schema change.
 */
export async function ensureInitialized(): Promise<void> {
  return;
}
