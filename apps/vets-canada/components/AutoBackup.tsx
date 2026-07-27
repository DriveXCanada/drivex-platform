"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ENABLED_KEY = "vets_backup_enabled";
const LAST_KEY = "vets_backup_last";
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const TICK_MS = 60 * 1000; // re-check every minute

function fmt(ts: number | null) {
  if (!ts) return "never";
  return new Date(ts).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AutoBackup() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [last, setLast] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const busy = useRef(false);

  // Load saved settings on mount.
  useEffect(() => {
    setMounted(true);
    setEnabled(localStorage.getItem(ENABLED_KEY) === "1");
    const l = localStorage.getItem(LAST_KEY);
    setLast(l ? Number(l) : null);
  }, []);

  const runBackup = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus("saving");
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      // Pull the filename the server suggested, else build one.
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const name =
        m?.[1] ||
        `vets-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const now = Date.now();
      localStorage.setItem(LAST_KEY, String(now));
      setLast(now);
      setStatus("idle");
    } catch (err) {
      console.error("Auto-backup failed:", err);
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }, []);

  // Hourly timer. Checks every minute whether an hour has elapsed so it
  // recovers gracefully if the computer was asleep or the tab was inactive.
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const lastTs = Number(localStorage.getItem(LAST_KEY) || 0);
      if (Date.now() - lastTs >= INTERVAL_MS) runBackup();
    };
    check(); // catch up immediately if overdue
    const id = setInterval(check, TICK_MS);
    return () => clearInterval(id);
  }, [enabled, runBackup]);

  const toggle = (on: boolean) => {
    setEnabled(on);
    localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
    if (on) {
      // Kick one off right away so they immediately have a fresh copy.
      runBackup();
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed bottom-3 right-3 z-40 print:hidden">
      {open ? (
        <div className="w-72 rounded-xl border border-black/10 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between">
            <p className="font-heading text-sm font-bold text-navy">
              💾 Hourly Backup
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-charcoal/40 hover:text-charcoal"
            >
              ✕
            </button>
          </div>

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => toggle(e.target.checked)}
              className="h-5 w-5"
            />
            <span className="text-sm font-semibold text-charcoal">
              Auto-save a backup every hour
            </span>
          </label>

          <p className="mt-2 text-xs text-charcoal/60">
            Last saved: <span className="font-semibold">{fmt(last)}</span>
          </p>
          {status === "saving" && (
            <p className="mt-1 text-xs font-semibold text-navy">Saving backup…</p>
          )}
          {status === "error" && (
            <p className="mt-1 text-xs font-semibold text-military">
              Last backup failed — check your connection.
            </p>
          )}

          <button
            onClick={runBackup}
            className="btn-primary mt-3 w-full text-sm"
          >
            Download backup now
          </button>

          <p className="mt-2 text-[11px] leading-snug text-charcoal/50">
            Saves a ZIP of every table to this computer&apos;s Downloads folder.
            Keep the app open here to keep hourly backups running. Your browser
            may ask once to allow automatic downloads — choose allow.
          </p>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-lg transition ${
            enabled
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-white text-charcoal/70 hover:bg-offwhite"
          }`}
          title={
            enabled
              ? `Hourly backup ON — last saved ${fmt(last)}`
              : "Hourly backup is off"
          }
        >
          💾 Backup: {enabled ? "On" : "Off"}
        </button>
      )}
    </div>
  );
}
