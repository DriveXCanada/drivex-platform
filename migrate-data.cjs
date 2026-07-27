// One-off data migration: copy all rows from the old Neon DB into the new
// Railway DB, stamping tenant_id = 'vets-canada'. Atomic (single transaction).
// Reads connection strings from env so no secrets are embedded in the file:
//   OLD_DATABASE_URL   – source (old Vercel/Neon Postgres)
//   NEW_ADMIN_URL      – destination (Railway superuser)
const { Pool } = require("pg");

const OLD = process.env.OLD_DATABASE_URL;
const NEW_ADMIN = process.env.NEW_ADMIN_URL;
const TENANT = process.env.TENANT_ID || "vets-canada";
const ssl = { rejectUnauthorized: false };

if (!OLD || !NEW_ADMIN) {
  console.error("Set OLD_DATABASE_URL and NEW_ADMIN_URL in the environment.");
  process.exit(1);
}

// FK-safe insertion order (parents before children).
const ORDER = [
  "users", "categories", "donors", "clients", "items", "inventory", "item_prices",
  "family_members", "authorized_pickups", "holiday_baskets", "availability", "shifts",
  "expenses", "volunteer_log", "cash_donations", "appointments", "transactions",
  "transaction_items", "audit_counts", "visit_gift_cards", "orders", "order_items",
];

async function colsOf(pool, table) {
  const r = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",
    [table]
  );
  return new Set(r.rows.map((x) => x.column_name));
}

(async () => {
  const oldPool = new Pool({ connectionString: OLD, ssl, connectionTimeoutMillis: 20000 });
  const newPool = new Pool({ connectionString: NEW_ADMIN, ssl, connectionTimeoutMillis: 20000 });
  const client = await newPool.connect();
  try {
    // Shared columns per table (old ∩ new, minus tenant_id which is auto-stamped).
    const shared = {};
    for (const t of ORDER) {
      const o = await colsOf(oldPool, t);
      const n = await colsOf(newPool, t);
      shared[t] = [...o].filter((c) => n.has(c) && c !== "tenant_id");
    }

    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id',$1,false)", [TENANT]);

    // Wipe the placeholder seed data (atomic — rolls back on any error below).
    const list = ORDER.map((t) => `"${t}"`).join(",");
    await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);

    let grand = 0;
    for (const t of ORDER) {
      const cols = shared[t];
      const { rows } = await oldPool.query(`SELECT to_jsonb(x) AS row FROM "${t}" x ORDER BY 1`);
      const records = rows.map((r) => r.row);
      const CHUNK = 200;
      for (let i = 0; i < records.length; i += CHUNK) {
        const chunk = records.slice(i, i + CHUNK);
        const params = [];
        const vsql = chunk
          .map((rec) => {
            const ph = cols.map((c) => {
              params.push(rec[c] === undefined ? null : rec[c]);
              return "$" + params.length;
            });
            return "(" + ph.join(",") + ")";
          })
          .join(",");
        const csql = cols.map((c) => `"${c}"`).join(",");
        await client.query(`INSERT INTO "${t}" (${csql}) VALUES ${vsql}`, params);
      }
      if (records.length > 0) {
        await client.query(
          "SELECT setval(pg_get_serial_sequence($1,'id'), (SELECT MAX(id) FROM \"" + t + "\"))",
          [t]
        );
      }
      grand += records.length;
      console.log(`  ${t.padEnd(22)} ${records.length} rows`);
    }

    await client.query("COMMIT");
    console.log(`\nCOMMITTED. Total copied: ${grand} rows.`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.log("MIGRATION FAILED (rolled back, new DB unchanged):", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await oldPool.end();
    await newPool.end();
  }
})();
