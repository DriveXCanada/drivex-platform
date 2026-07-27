import type { ExpiringItem } from "@/lib/admin-queries";

function badgeFor(daysLeft: number) {
  if (daysLeft < 0)
    return { label: "Expired", cls: "bg-military/15 text-military" };
  if (daysLeft <= 7)
    return { label: `${daysLeft}d left`, cls: "bg-amber-100 text-amber-700" };
  return { label: `${daysLeft}d left`, cls: "bg-navy/10 text-navy" };
}

export default function ExpiryAlert({ items }: { items: ExpiringItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-charcoal/50">
        Nothing expiring soon. 👍
      </p>
    );
  }
  return (
    <ul className="divide-y divide-black/5">
      {items.map((it) => {
        const badge = badgeFor(it.daysLeft);
        return (
          <li
            key={it.itemId}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-charcoal">
                {it.categoryName} — {it.itemName}
              </p>
              <p className="text-xs text-charcoal/50">
                Qty {it.quantity} · expires {it.expiryDate}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge.cls}`}
            >
              {badge.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
