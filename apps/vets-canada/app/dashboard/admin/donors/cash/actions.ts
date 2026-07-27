"use server";

import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

const PATH = "/dashboard/admin/donors/cash";

export async function addCashDonationAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("donors");
  const date = String(formData.get("date") || "").trim();
  const method = String(formData.get("method") || "Cash").trim();
  const amount = Math.max(0, Number(formData.get("amount")) || 0);
  const giftCardStore = String(formData.get("giftCardStore") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const taxReceipt =
    formData.get("taxReceipt") === "on" || formData.get("taxReceipt") === "true";
  const receiptContact = String(formData.get("receiptContact") || "").trim();
  const receiptAddress = String(formData.get("receiptAddress") || "").trim();

  // Donor: pick existing, type a new one, or anonymous.
  const donorChoice = String(formData.get("donorChoice") || "").trim();
  const newDonorName = String(formData.get("newDonorName") || "").trim();
  let donorId: number | null = null;
  let donorName: string | null = null;

  if (donorChoice === "new" && newDonorName) {
    const existing = await sql`SELECT id FROM donors WHERE lower(name) = lower(${newDonorName});`;
    donorId = existing.rows.length
      ? (existing.rows[0].id as number)
      : ((await sql`INSERT INTO donors (name) VALUES (${newDonorName}) RETURNING id;`).rows[0].id as number);
  } else if (donorChoice && donorChoice !== "new") {
    donorId = Number(donorChoice);
  }

  if (amount <= 0) return { success: false, error: "Amount must be greater than 0." };

  await sql`
    INSERT INTO cash_donations
      (donor_id, donor_name, method, amount, gift_card_store, donation_date, notes,
       tax_receipt_needed, receipt_contact, receipt_address, recorded_by)
    VALUES (
      ${donorId}, ${donorName}, ${method}, ${amount},
      ${giftCardStore || null}, ${date || null}::date, ${notes || null},
      ${taxReceipt}, ${receiptContact || null}, ${receiptAddress || null}, ${session.userId}
    );
  `;
  revalidatePath(PATH);
  revalidatePath("/dashboard/admin/donors");
  return { success: true };
}

export async function deleteCashDonationAction(id: number): Promise<ActionResult> {
  await requirePermission("donors");
  await sql`DELETE FROM cash_donations WHERE id = ${id};`;
  revalidatePath(PATH);
  return { success: true };
}
