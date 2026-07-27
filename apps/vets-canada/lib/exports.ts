import "server-only";
import { sql } from "@/lib/db";

export type Export = { headers: string[]; rows: unknown[][] };

// Every table we can export / back up. Used by the CSV export route and the
// full-backup (ZIP) route.
export const EXPORT_TYPES = [
  "clients",
  "family_members",
  "authorized_pickups",
  "inventory",
  "transactions",
  "donors",
  "cash_donations",
  "gift_cards",
  "holiday_baskets",
  "expenses",
  "appointments",
  "shifts",
  "availability",
  "volunteer_hours",
] as const;

export async function buildExport(type: string): Promise<Export | null> {
  switch (type) {
    case "clients": {
      const { rows } = await sql`
        SELECT c.client_id, c.name, c.first_name, c.last_name, c.family_size, c.point_budget,
               c.date_of_birth, c.gender, c.member_status, c.contact, c.email, c.address,
               c.service_number, c.notes, c.has_allergy, c.allergy_info,
               c.code_of_conduct, c.terms_of_service, c.delivery_approved,
               CASE WHEN c.is_active THEN 'active' ELSE 'archived' END AS status,
               c.archive_reason, c.created_at,
               (SELECT COUNT(*) FROM family_members fm WHERE fm.client_id = c.id) AS members
        FROM clients c ORDER BY c.last_name, c.first_name, c.name;
      `;
      return {
        headers: ["Client ID", "First Name", "Last Name", "Name", "Family Size", "Credits", "Date of Birth", "Gender", "Member Status", "Contact", "Email", "Address", "Service Number", "Notes", "Has Allergy", "Allergy Info", "Code of Conduct", "Terms of Service", "Delivery Approved", "Status", "Archive Reason", "Created", "Members On File"],
        rows: rows.map((r) => [r.client_id, r.first_name, r.last_name, r.name, r.family_size, r.point_budget, r.date_of_birth ? String(r.date_of_birth) : "", r.gender, r.member_status, r.contact, r.email, r.address, r.service_number, r.notes, r.has_allergy ? "yes" : "no", r.allergy_info, r.code_of_conduct ? "yes" : "no", r.terms_of_service ? "yes" : "no", r.delivery_approved ? "yes" : "no", r.status, r.archive_reason, new Date(r.created_at).toISOString().slice(0, 10), r.members]),
      };
    }
    case "authorized_pickups": {
      const { rows } = await sql`
        SELECT cl.client_id, cl.name AS household, ap.name, ap.relationship,
               ap.contact, ap.notes
        FROM authorized_pickups ap
        JOIN clients cl ON cl.id = ap.client_id
        ORDER BY cl.name, ap.id;
      `;
      return {
        headers: ["Client ID", "Household", "Authorized Person", "Relationship", "Contact", "Notes"],
        rows: rows.map((r) => [r.client_id, r.household, r.name, r.relationship, r.contact, r.notes]),
      };
    }
    case "family_members": {
      const { rows } = await sql`
        SELECT cl.client_id, cl.name AS household, fm.name, fm.relation,
               fm.date_of_birth, fm.gender
        FROM family_members fm
        JOIN clients cl ON cl.id = fm.client_id
        ORDER BY cl.name, fm.id;
      `;
      return {
        headers: ["Client ID", "Household", "Member Name", "Relation", "Date of Birth", "Gender"],
        rows: rows.map((r) => [r.client_id, r.household, r.name, r.relation, r.date_of_birth ? String(r.date_of_birth) : "", r.gender]),
      };
    }
    case "inventory": {
      const { rows } = await sql`
        SELECT c.name AS category, i.name AS item, COALESCE(inv.quantity, 0) AS qty,
               i.unit_price, i.unit_weight, i.shop_limit, inv.expiry_date
        FROM items i
        JOIN categories c ON c.id = i.category_id
        LEFT JOIN inventory inv ON inv.item_id = i.id
        WHERE i.is_active = true
        ORDER BY c.name, i.name;
      `;
      return {
        headers: ["Category", "Item", "Quantity", "Unit Price", "Unit Weight", "Total Value", "Total Weight", "Shop Limit", "Expiry"],
        rows: rows.map((r) => [r.category, r.item, r.qty, Number(r.unit_price).toFixed(2), Number(r.unit_weight), (r.qty * Number(r.unit_price)).toFixed(2), (r.qty * Number(r.unit_weight)).toFixed(2), r.shop_limit ?? "", r.expiry_date ? String(r.expiry_date) : ""]),
      };
    }
    case "transactions": {
      const { rows } = await sql`
        SELECT t.id, t.type, t.created_at, cl.name AS client, cl.client_id, u.name AS volunteer,
               COALESCE(SUM(ti.quantity),0)::int AS items,
               COALESCE(SUM(ti.quantity*ti.point_value_at_time),0)::int AS credits,
               COALESCE(ROUND(SUM(ti.quantity*i.unit_price),2),0) AS value,
               COALESCE(ROUND(SUM(ti.quantity*i.unit_weight),2),0) AS weight,
               t.notes
        FROM transactions t
        LEFT JOIN clients cl ON cl.id = t.client_id
        LEFT JOIN users u ON u.id = t.volunteer_id
        LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
        LEFT JOIN items i ON i.id = ti.item_id
        GROUP BY t.id, t.type, t.created_at, cl.name, cl.client_id, u.name, t.notes
        ORDER BY t.created_at DESC;
      `;
      return {
        headers: ["ID", "Type", "Date", "Client", "Client ID", "Volunteer", "Items", "Credits", "Value", "Weight", "Notes"],
        rows: rows.map((r) => [r.id, r.type, new Date(r.created_at).toISOString(), r.client, r.client_id, r.volunteer, r.items, r.credits, r.value, r.weight, r.notes]),
      };
    }
    case "donors": {
      const { rows } = await sql`
        SELECT d.name, d.contact, d.email, d.address, d.notes,
               CASE WHEN d.is_active THEN 'active' ELSE 'inactive' END AS status,
               COALESCE(SUM(ti.quantity), 0)::int AS items,
               COALESCE(ROUND(SUM(ti.quantity * i.unit_price), 2), 0) AS value,
               COALESCE(ROUND(SUM(ti.quantity * i.unit_weight), 2), 0) AS weight
        FROM donors d
        LEFT JOIN transactions t ON t.donor_id = d.id AND t.type = 'stock_in'
        LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
        LEFT JOIN items i ON i.id = ti.item_id
        GROUP BY d.id ORDER BY d.name;
      `;
      return {
        headers: ["Donor", "Contact", "Email", "Address", "Notes", "Status", "Items Donated", "Total Value", "Total Weight"],
        rows: rows.map((r) => [r.name, r.contact, r.email, r.address, r.notes, r.status, r.items, Number(r.value).toFixed(2), Number(r.weight)]),
      };
    }
    case "cash_donations": {
      const { rows } = await sql`
        SELECT cd.donation_date, cd.method, cd.amount, cd.gift_card_store,
               COALESCE(d.name, cd.donor_name) AS donor, cd.notes, u.name AS recorded_by
        FROM cash_donations cd
        LEFT JOIN donors d ON d.id = cd.donor_id
        LEFT JOIN users u ON u.id = cd.recorded_by
        ORDER BY cd.donation_date DESC;
      `;
      return {
        headers: ["Date", "Type", "Amount", "Gift Card Store", "Donor", "Notes", "Recorded By"],
        rows: rows.map((r) => [String(r.donation_date), r.method, Number(r.amount).toFixed(2), r.gift_card_store, r.donor || "Anonymous", r.notes, r.recorded_by]),
      };
    }
    case "gift_cards": {
      const { rows } = await sql`
        SELECT t.created_at, cl.name AS client, cl.client_id, g.store, g.amount, u.name AS volunteer
        FROM visit_gift_cards g
        JOIN transactions t ON t.id = g.transaction_id
        LEFT JOIN clients cl ON cl.id = t.client_id
        LEFT JOIN users u ON u.id = t.volunteer_id
        ORDER BY t.created_at DESC;
      `;
      return {
        headers: ["Date", "Client", "Client ID", "Store", "Amount", "Given By"],
        rows: rows.map((r) => [new Date(r.created_at).toISOString(), r.client, r.client_id, r.store, Number(r.amount).toFixed(2), r.volunteer]),
      };
    }
    case "holiday_baskets": {
      const { rows } = await sql`
        SELECT cl.client_id, cl.name AS client, hb.holiday, hb.year, hb.notes,
               u.name AS given_by, hb.given_at
        FROM holiday_baskets hb
        JOIN clients cl ON cl.id = hb.client_id
        LEFT JOIN users u ON u.id = hb.given_by
        ORDER BY hb.year DESC, hb.given_at DESC;
      `;
      return {
        headers: ["Client ID", "Client", "Holiday", "Year", "Notes", "Given By", "Given At"],
        rows: rows.map((r) => [r.client_id, r.client, r.holiday, r.year, r.notes, r.given_by, new Date(r.given_at).toISOString().slice(0, 10)]),
      };
    }
    case "expenses": {
      const { rows } = await sql`
        SELECT e.expense_date, e.category, e.description, e.vendor, e.amount, u.name AS entered_by
        FROM expenses e LEFT JOIN users u ON u.id = e.created_by
        ORDER BY e.expense_date DESC;
      `;
      return {
        headers: ["Date", "Category", "Description", "Vendor", "Amount", "Entered By"],
        rows: rows.map((r) => [String(r.expense_date), r.category, r.description, r.vendor, Number(r.amount).toFixed(2), r.entered_by]),
      };
    }
    case "appointments": {
      const { rows } = await sql`
        SELECT a.appt_date, a.appt_time, COALESCE(cl.name, a.client_name) AS who, a.status, a.notes
        FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
        ORDER BY a.appt_date DESC, a.appt_time;
      `;
      return {
        headers: ["Date", "Time", "Client", "Status", "Notes"],
        rows: rows.map((r) => [String(r.appt_date), r.appt_time, r.who, r.status, r.notes]),
      };
    }
    case "shifts": {
      const { rows } = await sql`
        SELECT s.shift_date, s.start_time, s.end_time, s.role, u.name AS staff
        FROM shifts s LEFT JOIN users u ON u.id = s.user_id
        ORDER BY s.shift_date DESC, s.start_time;
      `;
      return {
        headers: ["Date", "Start", "End", "Role / Task", "Staff"],
        rows: rows.map((r) => [String(r.shift_date), r.start_time, r.end_time, r.role, r.staff]),
      };
    }
    case "availability": {
      const { rows } = await sql`
        SELECT av.avail_date, av.status, av.start_time, av.end_time, av.note, u.name AS staff
        FROM availability av LEFT JOIN users u ON u.id = av.user_id
        ORDER BY av.avail_date DESC, av.start_time;
      `;
      return {
        headers: ["Date", "Status", "Start", "End", "Note", "Staff"],
        rows: rows.map((r) => [String(r.avail_date), r.status, r.start_time, r.end_time, r.note, r.staff]),
      };
    }
    case "volunteer_hours": {
      const { rows } = await sql`
        SELECT u.name AS volunteer, vl.log_date, vl.hours, vl.note
        FROM volunteer_log vl JOIN users u ON u.id = vl.volunteer_id
        ORDER BY u.name, vl.log_date DESC;
      `;
      return {
        headers: ["Volunteer", "Date", "Hours", "Note"],
        rows: rows.map((r) => [r.volunteer, String(r.log_date), Number(r.hours), r.note]),
      };
    }
    default:
      return null;
  }
}
