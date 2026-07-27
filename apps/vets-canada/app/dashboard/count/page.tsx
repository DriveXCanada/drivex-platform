import { requireAuth } from "@/lib/auth";
import { getCatalog } from "@/lib/queries";
import CountForm from "./CountForm";

export const dynamic = "force-dynamic";

export default async function CountPage() {
  await requireAuth();
  const catalog = await getCatalog();
  return <CountForm catalog={catalog} />;
}
