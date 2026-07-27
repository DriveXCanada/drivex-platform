import "server-only";
import { headers } from "next/headers";
import { sql } from "./db";

/**
 * Simple database-backed login throttling to slow brute-force PIN guessing.
 *
 * Attempts are recorded per client IP (and per login "kind" — staff vs client
 * portal) in the tenant-scoped `login_attempts` table. If an IP accumulates
 * too many failures within the window, further attempts are refused until the
 * window passes. A successful login clears that IP's failure counter.
 *
 * All operations fail OPEN (on any DB error we allow the attempt): a database
 * hiccup should never lock legitimate volunteers out of the food bank. The
 * table is small and indexed on (ip, created_at).
 */

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 8;

export type LoginKind = "staff" | "portal";

/** Best-effort client IP from the proxy headers Railway/Vercel set. */
export function getClientIp(): string {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

/** True if this IP has exceeded the failed-attempt limit for the window. */
export async function isRateLimited(
  ip: string,
  kind: LoginKind
): Promise<boolean> {
  try {
    const { rows } = await sql`
      SELECT count(*)::int AS n
      FROM login_attempts
      WHERE ip = ${ip}
        AND kind = ${kind}
        AND success = false
        AND created_at > now() - interval '15 minutes'
    `;
    return (rows[0]?.n ?? 0) >= MAX_FAILURES;
  } catch {
    return false; // fail open — never lock people out on a DB error
  }
}

/** Record the outcome of a login attempt; clears failures on success. */
export async function recordLoginAttempt(
  ip: string,
  kind: LoginKind,
  success: boolean
): Promise<void> {
  try {
    await sql`
      INSERT INTO login_attempts (ip, kind, success)
      VALUES (${ip}, ${kind}, ${success})
    `;
    if (success) {
      // Reset this IP's counter on a good login.
      await sql`
        DELETE FROM login_attempts
        WHERE ip = ${ip} AND kind = ${kind} AND success = false
      `;
    } else {
      // Opportunistic cleanup so the table doesn't grow unbounded.
      await sql`
        DELETE FROM login_attempts
        WHERE created_at < now() - interval '1 day'
      `;
    }
  } catch {
    /* ignore — recording is best-effort */
  }
}

export const RATE_LIMIT_MESSAGE = `Too many attempts. For security, please wait ${WINDOW_MINUTES} minutes and try again.`;
