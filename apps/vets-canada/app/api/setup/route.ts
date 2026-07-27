import { NextRequest, NextResponse } from "next/server";
import { bootstrapDatabase } from "@/lib/init";
import { validateEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // This endpoint runs privileged bootstrap using the superuser connection, so
  // it must be gated. Require a secret SETUP_TOKEN provided via ?token= or the
  // x-setup-token header. If no token is configured, the endpoint is disabled.
  const expected = process.env.SETUP_TOKEN;
  const provided =
    req.nextUrl.searchParams.get("token") || req.headers.get("x-setup-token");
  if (!expected || provided !== expected) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    validateEnv();
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }

  try {
    // Idempotent: creates the tenants registry, schema, RLS policies and the
    // application role, then seeds only if this tenant has no users yet.
    await bootstrapDatabase();

    return NextResponse.json({
      success: true,
      message:
        "Database bootstrapped (schema, RLS, app role) and seeded if empty",
    });
  } catch (err) {
    console.error("Setup failed:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
