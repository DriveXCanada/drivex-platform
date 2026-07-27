// Full logical backup of the DriveX database to a single timestamped JSON file.
// Reads EVERY table and writes a self-describing snapshot that db-restore.cjs
// can load back. Contains personal data, so backups are written OUTSIDE the
// git repo (see BACKUP_DIR) and must never be committed or shared casually.
//
// Connection string comes from the environment (no secrets in this file):
//   BACKUP_DATABASE_URL  (preferred)  or  ADMIN_DATABASE_URL  or  DATABASE_URL
// Optional: BACKUP_DIR (defaults to <home>/drivex-backups)

const { Pool } = require("pg");
const fs = require("fs");
const os = require("os");
const path = require("path");

const URL =
  process.env.BACKUP_DATABASE_URL ||
  process.env.ADMIN_DATABASE_URL ||
  process.env.DATABASE_URL;
if (!URL) {
  console.error(
    "Set BACKUP_DATABASE_URL (or ADMIN_DATABASE_URL / DATABASE_URL) in the environment."
  );
  process.exit(1);
}

const BACKUP_DIR =
  process.env.BACKUP_DIR || path.join(os.homedir(), "drivex-backups");

function stamp() {
  // YYYY-MM-DD_HH-MM-SS in local time.
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  );
}

(async () => {
  const pool = new Pool({
    connectionString: URL,
    ssl: URL.includes(".railway.internal") ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const t = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`
    );
    const tables = t.rows.map((r) => r.table_name);

    const data = {};
    const counts = {};
    let total = 0;
    for (const tb of tables) {
      const { rows } = await pool.query(`SELECT to_jsonb(x) AS row FROM "${tb}" x`);
      data[tb] = rows.map((r) => r.row);
      counts[tb] = rows.length;
      total += rows.length;
    }

    const snapshot = {
      meta: {
        app: "drivex-platform",
        createdAt: new Date().toISOString(),
        source: URL.replace(/:\/\/[^@]*@/, "://***@"), // redact credentials
        tables: counts,
        totalRows: total,
        format: 1,
      },
      data,
    };

    const file = path.join(BACKUP_DIR, `drivex-backup-${stamp()}.json`);
    fs.writeFileSync(file, JSON.stringify(snapshot));
    const sizeMB = (fs.statSync(file).size / 1024 / 1024).toFixed(2);

    console.log(`Backup written: ${file}`);
    console.log(`Tables: ${tables.length} | Rows: ${total} | Size: ${sizeMB} MB`);
  } catch (e) {
    console.error("BACKUP FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
