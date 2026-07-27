"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PinPad() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const press = (digit: string) => {
    if (loading) return;
    setError("");
    setPin((prev) => (prev.length < 4 ? prev + digit : prev));
  };

  const backspace = () => {
    setError("");
    setPin((prev) => prev.slice(0, -1));
  };

  const clear = () => {
    setError("");
    setPin("");
  };

  const submit = async (value: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setPin("");
        setLoading(false);
        return;
      }
      if (data.mustChangePin) {
        router.push("/dashboard/change-pin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setPin("");
      setLoading(false);
    }
  };

  // Auto-submit when 4 digits entered.
  const handlePress = (digit: string) => {
    if (loading || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError("");
    if (next.length === 4) {
      submit(next);
    }
  };

  const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="w-full max-w-xs">
      {/* PIN dots */}
      <div className="mb-6 flex justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-5 w-5 rounded-full border-2 transition ${
              i < pin.length
                ? "border-gold bg-gold"
                : "border-white/40 bg-transparent"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="mb-4 text-center text-sm font-semibold text-military bg-white/90 rounded-md py-2 px-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {buttons.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => handlePress(b)}
            disabled={loading}
            className="aspect-square rounded-2xl bg-white/95 text-3xl font-semibold text-navy shadow-md transition active:scale-95 hover:bg-white disabled:opacity-60"
          >
            {b}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          disabled={loading}
          className="aspect-square rounded-2xl bg-white/20 text-lg font-semibold text-white transition active:scale-95 hover:bg-white/30 disabled:opacity-60"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => handlePress("0")}
          disabled={loading}
          className="aspect-square rounded-2xl bg-white/95 text-3xl font-semibold text-navy shadow-md transition active:scale-95 hover:bg-white disabled:opacity-60"
        >
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          disabled={loading}
          className="aspect-square rounded-2xl bg-white/20 text-2xl font-semibold text-white transition active:scale-95 hover:bg-white/30 disabled:opacity-60"
        >
          ⌫
        </button>
      </div>

      {loading && (
        <p className="mt-5 text-center text-sm font-medium text-white/90">
          Checking PIN…
        </p>
      )}
    </div>
  );
}
