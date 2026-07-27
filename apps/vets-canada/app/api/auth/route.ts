import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  createSession,
  destroySession,
  isValidPinFormat,
  verifyPin,
} from "@/lib/auth";
import {
  getClientIp,
  isRateLimited,
  recordLoginAttempt,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth — log in with a 4-digit PIN.
 * Body: { pin: string }
 */
export async function POST(req: NextRequest) {
  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const pin = (body.pin || "").trim();
  if (!isValidPinFormat(pin)) {
    return NextResponse.json(
      { error: "PIN must be 4 digits." },
      { status: 400 }
    );
  }

  const ip = getClientIp();

  try {
    // Throttle brute-force PIN guessing per client IP.
    if (await isRateLimited(ip, "staff")) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    // PINs are hashed, so compare against each active user.
    const { rows } = await sql`
      SELECT id, name, pin, role, must_change_pin
      FROM users
      WHERE is_active = true;
    `;

    for (const user of rows) {
      if (await verifyPin(pin, user.pin)) {
        await recordLoginAttempt(ip, "staff", true);
        await createSession({
          userId: user.id,
          name: user.name,
          role: user.role,
          mustChangePin: user.must_change_pin,
        });
        return NextResponse.json({
          success: true,
          role: user.role,
          mustChangePin: user.must_change_pin,
        });
      }
    }

    await recordLoginAttempt(ip, "staff", false);
    return NextResponse.json(
      { error: "Incorrect PIN. Please try again." },
      { status: 401 }
    );
  } catch (err) {
    const message = (err as Error).message || "Unknown server error.";
    console.error("Login failed:", message);

    // Translate common setup problems into actionable guidance.
    let hint = message;
    if (/relation "?users"? does not exist/i.test(message)) {
      hint =
        "Database not initialized. Visit /api/setup once to create the tables, then try again.";
    } else if (/DATABASE_URL/i.test(message)) {
      hint =
        "Database is not connected. Set DATABASE_URL (the app-role connection string) in Railway → service → Variables.";
    } else if (/SESSION_SECRET/i.test(message)) {
      hint =
        "SESSION_SECRET is missing or too short. Add a 32+ character SESSION_SECRET env var in Railway, then redeploy.";
    }

    return NextResponse.json(
      { error: `Server error: ${hint}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth — log out.
 */
export async function DELETE() {
  await destroySession();
  return NextResponse.json({ success: true });
}
