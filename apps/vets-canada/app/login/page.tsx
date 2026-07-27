import { redirect } from "next/navigation";
import PinPad from "@/components/PinPad";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-white sm:text-4xl">
          VETS Canada
        </h1>
        <p className="mt-1 font-heading text-xl font-semibold uppercase tracking-widest text-gold">
          Dartmouth
        </p>
        <div className="mx-auto mt-3 h-1 w-16 rounded bg-military" />
        <p className="mt-4 text-sm text-white/80">
          Food Bank Inventory — Volunteer Sign In
        </p>
      </div>

      <PinPad />

      <a
        href="/portal"
        className="mt-8 text-center text-sm font-semibold text-gold underline-offset-2 hover:underline"
      >
        Client delivery portal →
      </a>

      <p className="mt-6 text-center text-xs uppercase tracking-wider text-white/60">
        Proudly Supported by DriveX
      </p>
    </main>
  );
}
