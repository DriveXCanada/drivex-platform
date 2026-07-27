"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientLoginAction } from "./actions";

export default function PortalLogin() {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await clientLoginAction(clientId, pin);
    if (!res.success) {
      setError(res.error || "Sign in failed.");
      setLoading(false);
      return;
    }
    router.push("/portal/shop");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy px-6 py-10">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-white">
          VETS Canada — Dartmouth
        </h1>
        <p className="mt-1 text-sm text-gold">Delivery Ordering Portal</p>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <label className="label" htmlFor="cid">
          Enter your Client ID
        </label>
        <input
          id="cid"
          autoFocus
          className="input text-center text-lg tracking-wide"
          placeholder="VET-0001"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />
        <label className="label mt-3" htmlFor="pin">
          PIN
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          autoComplete="off"
          className="input text-center text-lg tracking-[0.4em]"
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        {error && (
          <p className="mt-3 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary mt-4 w-full">
          {loading ? "Checking…" : "Sign In"}
        </button>
        <p className="mt-3 text-center text-xs text-charcoal/50">
          Only clients approved for delivery can sign in here. Contact the food
          bank if you need access.
        </p>
      </form>

      <p className="mt-8 text-center text-xs uppercase tracking-widest text-white/60">
        Proudly Supported by DriveX
      </p>
    </main>
  );
}
