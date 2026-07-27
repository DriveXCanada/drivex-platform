import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/client-auth";
import PortalLogin from "./PortalLogin";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await getClientSession();
  if (session) redirect("/portal/shop");
  return <PortalLogin />;
}
