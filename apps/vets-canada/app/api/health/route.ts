import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

// Public health/version endpoint for uptime monitoring and confirming which
// build is actually deployed. Returns no data — safe to expose.
export async function GET() {
  return NextResponse.json({
    ok: true,
    version: APP_VERSION,
    time: new Date().toISOString(),
  });
}
