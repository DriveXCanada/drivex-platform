import { NextRequest, NextResponse } from "next/server";
import { getSession, getCurrentPermissions } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { buildExport } from "@/lib/exports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const perms = await getCurrentPermissions();
  if (!session || !perms.includes("export")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const type = req.nextUrl.searchParams.get("type") || "";
  try {
    const data = await buildExport(type);
    if (!data) {
      return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
    }
    const csv = toCsv(data.headers, data.rows);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vets-${type}-${date}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export failed:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
