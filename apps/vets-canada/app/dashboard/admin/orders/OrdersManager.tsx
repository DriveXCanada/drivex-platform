"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getOrderItemsAction,
  fulfillOrderAction,
  cancelOrderAction,
  type OrderItem,
} from "./actions";

export interface OrderRow {
  id: number;
  status: "pending" | "fulfilled" | "cancelled";
  points: number;
  notes: string | null;
  date: string;
  clientName: string;
  clientId: string;
  address: string | null;
  contact: string | null;
  items: number;
  fulfilledBy: string | null;
  giftCardRequested: boolean;
  giftCardDetails: string | null;
}

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  fulfilled: "bg-green-100 text-green-700",
  cancelled: "bg-charcoal/10 text-charcoal/50",
};

export default function OrdersManager({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [openId, setOpenId] = useState<number | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [error, setError] = useState("");

  const shown = orders.filter((o) => (filter === "pending" ? o.status === "pending" : true));

  const open = async (id: number) => {
    if (openId === id) return setOpenId(null);
    setItems(await getOrderItemsAction(id));
    setOpenId(id);
  };

  const fulfill = (o: OrderRow) => {
    if (!confirm(`Fulfill ${o.clientName}'s order? This records a client visit and deducts the items from inventory.`)) return;
    setError("");
    startTransition(async () => {
      const res = await fulfillOrderAction(o.id);
      if (!res.success) setError(res.error || "Failed.");
      setOpenId(null);
      router.refresh();
    });
  };

  const cancel = (o: OrderRow) => {
    if (!confirm("Cancel this order?")) return;
    startTransition(async () => {
      await cancelOrderAction(o.id);
      router.refresh();
    });
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-navy">Delivery Orders</h1>
        <div className="flex gap-2">
          {(["pending", "all"] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${filter === t ? "bg-navy text-white" : "bg-white text-navy hover:bg-navy/10"}`}>
              {t === "pending" ? `Pending (${pendingCount})` : "All"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-charcoal/70">
        Orders submitted by delivery-approved clients. Fulfilling one records it
        as a client visit and deducts inventory so a volunteer can shop & deliver.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">{error}</p>
      )}

      <div className="mt-4 space-y-2">
        {shown.length === 0 && <p className="text-sm text-charcoal/50">No {filter === "pending" ? "pending " : ""}orders.</p>}
        {shown.map((o) => (
          <Fragment key={o.id}>
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy">
                    {o.clientName}{" "}
                    <span className="text-sm font-normal text-charcoal/60">({o.clientId})</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[o.status]}`}>
                      {o.status}
                    </span>
                  </p>
                  <p className="text-sm text-charcoal/60">
                    {o.date} · {o.items} items · {o.points} credits
                    {o.fulfilledBy && ` · fulfilled by ${o.fulfilledBy}`}
                  </p>
                  {(o.address || o.contact) && (
                    <p className="text-xs text-charcoal/50">
                      {[o.contact, o.address].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {o.giftCardRequested && (
                    <p className="mt-1 rounded-md bg-gold/15 px-2 py-1 text-xs font-semibold text-charcoal">
                      🎁 Gift card requested
                      {o.giftCardDetails ? `: ${o.giftCardDetails}` : ""}
                      <span className="block text-[11px] font-normal text-charcoal/50">
                        Not guaranteed — fill only if available.
                      </span>
                    </p>
                  )}
                  {o.notes && <p className="mt-0.5 text-xs italic text-charcoal/60">“{o.notes}”</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => open(o.id)} className="btn-outline text-sm">
                    {openId === o.id ? "Hide Items" : "View Items"}
                  </button>
                  {o.status === "pending" && (
                    <>
                      <button onClick={() => fulfill(o)} className="btn-primary text-sm">Fulfill</button>
                      <button onClick={() => cancel(o)} className="btn-danger text-sm">Cancel</button>
                    </>
                  )}
                </div>
              </div>

              {openId === o.id && (
                <div className="mt-3 border-t border-black/5 pt-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-charcoal/50">No items.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-charcoal/50">
                          <th className="py-1">Item</th>
                          <th className="py-1">Category</th>
                          <th className="py-1">Qty</th>
                          <th className="py-1">In stock</th>
                          <th className="py-1">Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.id} className="border-t border-black/5">
                            <td className="py-1.5">{it.itemName}</td>
                            <td className="py-1.5 text-charcoal/60">{it.category}</td>
                            <td className="py-1.5">{it.quantity}</td>
                            <td className={`py-1.5 ${it.inStock < it.quantity ? "font-bold text-military" : "text-charcoal/60"}`}>
                              {it.inStock}{it.inStock < it.quantity ? " ⚠" : ""}
                            </td>
                            <td className="py-1.5">{it.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
