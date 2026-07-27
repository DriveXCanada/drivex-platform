import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getAllBasketsAction } from "./actions";
import BasketsManager from "./BasketsManager";

export const dynamic = "force-dynamic";

export default async function BasketsPage() {
  await requirePermission("clients");

  const [{ rows: clientRows }, baskets] = await Promise.all([
    sql`
      SELECT id, client_id, name FROM clients
      WHERE is_active = true ORDER BY name;
    `,
    getAllBasketsAction(),
  ]);

  const clients = clientRows.map((r) => ({
    id: r.id as number,
    clientId: r.client_id as string,
    name: r.name as string,
  }));

  return <BasketsManager clients={clients} baskets={baskets} />;
}
