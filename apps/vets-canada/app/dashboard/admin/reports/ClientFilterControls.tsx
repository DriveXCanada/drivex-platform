"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SELECTS: { param: string; label: string; options: [string, string][] }[] = [
  {
    param: "cstatus",
    label: "Client status",
    options: [
      ["active", "Active"],
      ["archived", "Archived"],
      ["all", "All"],
    ],
  },
  {
    param: "member",
    label: "Member status",
    options: [
      ["any", "Any"],
      ["serving", "Serving"],
      ["retired", "Retired"],
      ["unspecified", "Not specified"],
    ],
  },
  {
    param: "children",
    label: "Children in home",
    options: [
      ["any", "Any"],
      ["with", "With children (under 18)"],
      ["without", "Without children"],
    ],
  },
  {
    param: "allergy",
    label: "Allergy flag",
    options: [
      ["any", "Any"],
      ["yes", "Has allergy"],
      ["no", "No allergy"],
    ],
  },
  {
    param: "delivery",
    label: "Delivery approved",
    options: [
      ["any", "Any"],
      ["yes", "Yes"],
      ["no", "No"],
    ],
  },
  {
    param: "coc",
    label: "Code of Conduct",
    options: [
      ["any", "Any"],
      ["yes", "Completed"],
      ["no", "Not completed"],
    ],
  },
  {
    param: "tos",
    label: "Terms of Service",
    options: [
      ["any", "Any"],
      ["yes", "Completed"],
      ["no", "Not completed"],
    ],
  },
];

export default function ClientFilterControls() {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "" || value === "any") next.delete(key);
    else next.set(key, value);
    router.push(`/dashboard/admin/reports?${next.toString()}`);
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    next.set("report", "explorer");
    router.push(`/dashboard/admin/reports?${next.toString()}`);
  };

  return (
    <div className="mt-4 rounded-xl border border-navy/15 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-heading text-sm font-bold text-navy">Filters</p>
        <button onClick={clearAll} className="text-xs font-semibold text-military">
          Clear all
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SELECTS.map((s) => (
          <div key={s.param}>
            <label className="label">{s.label}</label>
            <select
              className="input"
              value={params.get(s.param) || s.options[0][0]}
              onChange={(e) => setParam(s.param, e.target.value)}
            >
              {s.options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div>
          <label className="label">Min family size</label>
          <input
            type="number"
            min={1}
            className="input"
            defaultValue={params.get("minfam") || ""}
            onBlur={(e) => setParam("minfam", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Max family size</label>
          <input
            type="number"
            min={1}
            className="input"
            defaultValue={params.get("maxfam") || ""}
            onBlur={(e) => setParam("maxfam", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
