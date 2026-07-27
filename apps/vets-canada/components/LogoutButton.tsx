"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
    >
      {loading ? "…" : "Sign Out"}
    </button>
  );
}
