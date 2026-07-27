"use server";

import { sql } from "@/lib/db";
import {
  createSession,
  getSession,
  hashPin,
  isValidPinFormat,
  verifyPin,
} from "@/lib/auth";
import { redirect } from "next/navigation";

export interface ChangePinState {
  error?: string;
}

export async function changePinAction(
  _prev: ChangePinState,
  formData: FormData
): Promise<ChangePinState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const newPin = String(formData.get("newPin") || "").trim();
  const confirmPin = String(formData.get("confirmPin") || "").trim();

  if (!isValidPinFormat(newPin)) {
    return { error: "New PIN must be exactly 4 digits." };
  }
  if (newPin !== confirmPin) {
    return { error: "PINs do not match." };
  }
  if (newPin === "0000") {
    return { error: "Please choose a PIN other than the default 0000." };
  }

  // Ensure the new PIN isn't already used by another active user.
  const { rows } = await sql`
    SELECT id, pin FROM users WHERE is_active = true AND id <> ${session.userId};
  `;
  for (const u of rows) {
    if (await verifyPin(newPin, u.pin)) {
      return { error: "That PIN is already in use. Choose another." };
    }
  }

  const hashed = await hashPin(newPin);
  await sql`
    UPDATE users
    SET pin = ${hashed}, must_change_pin = false
    WHERE id = ${session.userId};
  `;

  // Refresh the session so mustChangePin is cleared.
  await createSession({
    userId: session.userId,
    name: session.name,
    role: session.role,
    mustChangePin: false,
  });

  redirect("/dashboard");
}
