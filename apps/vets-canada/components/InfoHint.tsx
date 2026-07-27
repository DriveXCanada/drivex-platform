"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A small, unobtrusive "ⓘ" info marker. Hover (desktop) or tap (tablet/phone)
 * to reveal a short explanation; tapping elsewhere or pressing Escape closes it.
 * Meant to sit inline next to a label or heading without cluttering the UI.
 */
export default function InfoHint({
  text,
  label = "More information",
}: {
  text: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1 inline-flex h-4 w-4 select-none items-center justify-center rounded-full border border-current text-[10px] font-bold leading-none text-charcoal/40 transition-colors hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/40"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-50 w-56 -translate-x-1/2 rounded-lg bg-navy px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-white shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
