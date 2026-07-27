import { requireAuth } from "@/lib/auth";
import { getMyAvailabilityAction } from "./actions";
import AvailabilityManager from "./AvailabilityManager";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const session = await requireAuth();
  const entries = await getMyAvailabilityAction();
  return <AvailabilityManager name={session.name} entries={entries} />;
}
