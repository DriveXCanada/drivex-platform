import { NextResponse } from "next/server";
import { getSession, getCurrentPermissions } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { buildExport, EXPORT_TYPES } from "@/lib/exports";
import { buildZip, type ZipFile } from "@/lib/zip";
import { ensureInitialized } from "@/lib/init";

export const dynamic = "force-dynamic";

// Full master backup: every table as a CSV, bundled into a single ZIP.
export async function GET() {
  const session = await getSession();
  const perms = await getCurrentPermissions();
  if (!session || !perms.includes("export")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureInitialized();
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

    const files: ZipFile[] = [];
    for (const type of EXPORT_TYPES) {
      const data = await buildExport(type);
      if (!data) continue;
      files.push({ name: `${type}.csv`, content: toCsv(data.headers, data.rows) });
    }

    // A small manifest so the backup is self-describing.
    files.push({
      name: "README.txt",
      content: [
        "VETS Canada — Dartmouth Food Bank — Full Data Backup",
        `Generated: ${new Date().toString()}`,
        `Backed up by: ${session.name}`,
        "",
        "Each .csv file is one table from the live system. Open them in",
        "Excel, Google Sheets, or Numbers. This is a point-in-time copy —",
        "keep it somewhere safe in case the live system is unavailable.",
        "",
        "Tables included:",
        ...files.map((f) => `  - ${f.name}`),
      ].join("\n"),
    });

    const zip = buildZip(files);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="vets-backup-${stamp}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Backup failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
