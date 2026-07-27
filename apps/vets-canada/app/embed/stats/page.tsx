"use client";

import { useEffect, useState } from "react";

interface Stats {
  veteransHelped: number;
  peopleServed: number;
  itemsDistributed: number;
  valueDistributed: number;
  poundsDistributed: number;
  weightUnit: string;
  visitsThisMonth: number;
}

const money = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const num = (n: number) => n.toLocaleString("en-CA");

export default function StatsEmbed() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/public/stats", { cache: "no-store" });
        const data = await res.json();
        if (active && !data.error) setS(data);
      } catch {
        /* ignore transient errors */
      }
    };
    load();
    const id = setInterval(load, 30000); // refresh every 30s
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const cards = s
    ? [
        { label: "Veterans Helped", value: num(s.veteransHelped) },
        { label: "People Served", value: num(s.peopleServed) },
        { label: "Food Distributed", value: `${num(Math.round(s.poundsDistributed))} ${s.weightUnit}` },
        { label: "Value Distributed", value: money(s.valueDistributed) },
      ]
    : [];

  return (
    <main
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      className="min-h-screen bg-transparent p-3"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(s ? cards : Array.from({ length: 4 })).map((c: any, i) => (
          <div
            key={i}
            className="rounded-2xl bg-navy p-5 text-center text-white shadow-sm"
          >
            <p className="text-3xl font-bold text-gold">{c ? c.value : "…"}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/80">
              {c ? c.label : "Loading"}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-charcoal/40">
        VETS Canada — Dartmouth · Proudly Supported by DriveX
      </p>
    </main>
  );
}
