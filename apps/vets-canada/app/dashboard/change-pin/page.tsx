import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChangePinForm from "./ChangePinForm";

export const dynamic = "force-dynamic";

export default async function ChangePinPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="font-heading text-2xl font-bold text-navy">
          {session.mustChangePin ? "Set Your PIN" : "Change Your PIN"}
        </h1>
        <p className="mt-1 text-sm text-charcoal/70">
          {session.mustChangePin
            ? "For security, please choose a new 4-digit PIN before continuing."
            : "Choose a new 4-digit PIN."}
        </p>
        <div className="mt-5">
          <ChangePinForm />
        </div>
      </div>
    </div>
  );
}
