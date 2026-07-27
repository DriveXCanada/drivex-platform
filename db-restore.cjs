// Restore a DriveX database from a db-backup.cjs snapshot file.
//
// DANGER: this REPLACES all data in the target database with the backup's
// contents (atomic — it all succeeds or nothing changes). It is a disaster-
// recovery tool, not something to run casually. It refuses to run unless you
// explicitly set CONFIRM=RESTORE.
//
// Environment:
//   RESTORE_DATABASE_URL (or ADMIN_DATABASE_URL) — target DB (needs superuser)
//   BACKUP_FILE — path to a snapshot; defaults to the newest in BACKUP_DIR
//   BACKUP_DIR  — defaults to <home>/drivex-backups
//   CONFIRM=RESTORE — required to actually run

const { Pool } = require("pg");
const fs = require("fs");
const os = require("os");
const path = require("path");

const URL = process.env.RESTORE_DATABASE_URL || process.env.ADMIN_DATABASE_URL;
if (!URL) {
  console.error("Set RESTORE_DATABASE_URL (or ADMIN_DATABASE_URL) — must be a superuser connection.");
  process.exit(1);
}

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(os.homedir(), "drivex-backups");
let file = process.env.BACKUP_FILE;
if (!file) {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) { console.error("No backup files found in " + BACKUP_DIR); process.exit(1); }
  file = path.join(BACKUP_DIR, files[files.length - 1]);
}

// FK-safe load order (parents first). tenants first, login_attempts last.
const ORDER = [
  "tenants", "users", "categories", "donors", "clients", "items", "inventory",
  "item_prices", "family_members", "authorized_pickups", "holiday_baskets",
  "availability", "shifts", "expenses", "volunteer_log", "cash_donations",
  "appointments", "transactions", "transaction_items", "audit_counts",
  "visit_gift_cards", "orders", "order_items", "login_attempts",
];

(async () => {
  const snap = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Restoring from: ${file}`);
  console.log(`Snapshot taken: ${snap.meta.createdAt} | ${snap.meta.totalRows} rows`);

  if (process.env.CONFIRM !== "RESTORE") {
    console.log("\nDRY RUN — no changes made. To actually restore, re-run with CONFIRM=RESTORE.");
    return;
  }

  const pool = new Pool({
    connectionString: URL,
    ssl: URL.includes(".railway.internal") ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  const client = await pool.connect();
  try {
    const present = ORDER.filter((t) => snap.data[t]);
    const extras = Object.keys(snap.data).filter((t) => !ORDER.includes(t));
    const loadOrder = [...present, ...extras];

    await client.query("BEGIN");
    // Truncate all target tables (reverse order not needed with CASCADE).
    const list = loadOrder.map((t) => `"${t}"`).join(",");
    await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);

    let total = 0;
    for (const t of loadOrder) {
      const rows = snap.data[t];
      if (!rows.length) continue;
      const cols = Object.keys(rows[0]);
      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const params = [];
        const vsql = chunk
          .map((rec) => "(" + cols.map((c) => { params.push(rec[c]); return "$" + params.length; }).join(",") + ")")
          .join(",");
        const csql = cols.map((c) => `"${c}"`).join(",");
        await client.query(`INSERT INTO "${t}" (${csql}) VALUES ${vsql}`, params);
      }
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1,'id'), (SELECT MAX(id) FROM "${t}"))`,
        [t]
      ).catch(() => {}); // tables without an id sequence are fine
      total += rows.length;
      console.log(`  ${t.padEnd(22)} ${rows.length} rows`);
    }

    await client.query("COMMIT");
    console.log(`\nRESTORE COMPLETE. ${total} rows loaded.`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("RESTORE FAILED (rolled back, target unchanged):", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
