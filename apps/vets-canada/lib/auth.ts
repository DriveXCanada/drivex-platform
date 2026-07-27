import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getSessionSecret } from "./env";
import { sql } from "./db";
import { parsePermissions, PERMISSION_KEYS } from "./permissions";

const COOKIE_NAME = "vets_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 hours

export type Role = "manager" | "volunteer";

export interface SessionPayload {
  userId: number;
  name: string;
  role: Role;
  mustChangePin: boolean;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getSessionSecret());
}

// ---------------------------------------------------------------------------
// PIN hashing
// ---------------------------------------------------------------------------

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

// ---------------------------------------------------------------------------
// Session cookie management (signed JWT)
// ---------------------------------------------------------------------------

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: payload.userId as number,
      name: payload.name as string,
      role: payload.role as Role,
      mustChangePin: payload.mustChangePin as boolean,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Guards (for use in Server Components / Server Actions)
// ---------------------------------------------------------------------------

/**
 * Require any authenticated user. Redirects to /login if not signed in.
 * If the user must change their PIN, redirect them to the change-PIN screen
 * (unless they're already heading there).
 */
interface ActiveUser {
  id: number;
  name: string;
  role: Role;
  mustChangePin: boolean;
}

/**
 * Look up the CURRENT state of a user from the database. Returns null if the
 * account no longer exists or has been deactivated. This is what makes access
 * revocation immediate: guards re-check this on every request instead of
 * trusting the (up to 12h) JWT. Cached per request to avoid duplicate lookups.
 */
const getActiveUser = cache(
  async (userId: number): Promise<ActiveUser | null> => {
    const { rows } = await sql`
      SELECT id, name, role, must_change_pin, is_active
      FROM users WHERE id = ${userId};
    `;
    const u = rows[0];
    if (!u || u.is_active !== true) return null;
    return {
      id: u.id as number,
      name: u.name as string,
      role: u.role as Role,
      mustChangePin: u.must_change_pin as boolean,
    };
  }
);

export async function requireAuth(opts?: {
  allowMustChangePin?: boolean;
}): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  // Re-validate against the live DB so deactivations and role changes take
  // effect immediately, and use the fresh values (not the stale JWT) for
  // every downstream authorization decision.
  const live = await getActiveUser(session.userId);
  if (!live) redirect("/login");
  if (live.mustChangePin && !opts?.allowMustChangePin) {
    redirect("/dashboard/change-pin");
  }
  return {
    userId: live.id,
    name: live.name,
    role: live.role,
    mustChangePin: live.mustChangePin,
  };
}

/**
 * Require a manager. Redirects volunteers back to their dashboard.
 * Use for truly manager-only things (e.g. managing accounts/permissions).
 */
export async function requireManager(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "manager") redirect("/dashboard");
  return session;
}

/**
 * Effective permission keys for the current user. Managers get all of them.
 * Cached per request to avoid repeat lookups.
 */
export const getCurrentPermissions = cache(async (): Promise<string[]> => {
  const session = await getSession();
  if (!session) return [];
  // Use the LIVE role/permissions/active flag, not the JWT, so changes apply
  // immediately (a demoted manager loses manager powers on the next request;
  // a deactivated account loses all permissions).
  const { rows } = await sql`
    SELECT role, permissions, is_active FROM users WHERE id = ${session.userId};
  `;
  const u = rows[0];
  if (!u || u.is_active !== true) return [];
  if (u.role === "manager") return PERMISSION_KEYS;
  return parsePermissions(u.permissions);
});

/** Require a specific granted permission (managers always pass). */
export async function requirePermission(key: string): Promise<SessionPayload> {
  const session = await requireAuth();
  const perms = await getCurrentPermissions();
  if (!perms.includes(key)) redirect("/dashboard");
  return session;
}

/** Require manager OR any granted permission (for the admin landing). */
export async function requireAnyAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  const perms = await getCurrentPermissions();
  if (perms.length === 0) redirect("/dashboard");
  return session;
}
