import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/client-auth";
import { ensureInitialized } from "@/lib/init";
import { getCatalog, getClientById } from "@/lib/queries";
import { sql } from "@/lib/db";
import ClientShop, { type RecentOrder } from "./ClientShop";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  await ensureInitialized();
  const session = await getClientSession();
  if (!session) redirect("/portal");

  const client = await getClientById(session.clientPk);
  if (!client || !client.isActive) redirect("/portal");

  const catalog = await getCatalog();

  const { rows } = await sql`
    SELECT id, status, points_used, created_at
    FROM orders WHERE client_id = ${session.clientPk}
    ORDER BY created_at DESC LIMIT 5;
  `;
  const recentOrders: RecentOrder[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    points: r.points_used,
    date: new Date(r.created_at).toLocaleString(),
  }));

  return (
    <ClientShop
      clientName={session.name}
      clientId={session.clientId}
      budget={client.pointBudget}
      catalog={catalog}
      recentOrders={recentOrders}
    />
  );
}
