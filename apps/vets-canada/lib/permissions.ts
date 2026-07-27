/**
 * Granular permissions a manager can grant to individual volunteers.
 * Managers always have all of these implicitly. Pure module (safe on the
 * client) so the volunteer form and server guards can share it.
 */

export interface PermissionDef {
  key: string;
  label: string;
  desc: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "clients", label: "Clients", desc: "View & manage client records" },
  { key: "inventory", label: "Inventory", desc: "View & edit stock levels" },
  { key: "items", label: "Items & Categories", desc: "Manage catalog, prices, weights" },
  { key: "reports", label: "Reports", desc: "View all reports" },
  { key: "expenses", label: "Expenses", desc: "Record & view expenses" },
  { key: "entries", label: "Corrections", desc: "Edit / correct entries" },
  { key: "donors", label: "Donors", desc: "Manage donor registry & reports" },
  { key: "orders", label: "Delivery Orders", desc: "View & fulfill client delivery orders" },
  { key: "export", label: "Data Export", desc: "Download CSV backups" },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((x) => typeof x === "string" && PERMISSION_KEYS.includes(x))
      : [];
  } catch {
    return [];
  }
}
