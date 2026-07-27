import { requireAuth } from "@/lib/auth";
import { getCatalog } from "@/lib/queries";
import WasteForm from "./WasteForm";

export const dynamic = "force-dynamic";

export default async function WastePage() {
  await requireAuth();
  const catalog = await getCatalog();
  return <WasteForm catalog={catalog} />;
}
