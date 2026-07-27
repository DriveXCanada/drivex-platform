import { requireAuth } from "@/lib/auth";
import { getCatalog, getClientById } from "@/lib/queries";
import VisitFlow from "./VisitFlow";

export const dynamic = "force-dynamic";

export default async function VisitPage({
  searchParams,
}: {
  searchParams: { client?: string };
}) {
  await requireAuth();
  const catalog = await getCatalog();

  // Optionally start the visit with a client already chosen (e.g. launched
  // straight from their appointment on the schedule).
  let preselect = null;
  const clientId = Number(searchParams.client);
  if (searchParams.client && !Number.isNaN(clientId)) {
    const c = await getClientById(clientId);
    if (c && c.isActive) preselect = c;
  }

  return <VisitFlow catalog={catalog} preselect={preselect} />;
}
