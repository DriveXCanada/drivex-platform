import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getSessionSecret } from "./env";

const COOKIE_NAME = "vets_client";
const DURATION = 60 * 60 * 6; // 6 hours

export interface ClientSession {
  clientPk: number; // clients.id
  clientId: string; // human VET-####
  name: string;
}

function key(): Uint8Array {
  return new TextEncoder().encode(getSessionSecret());
}

export async function createClientSession(s: ClientSession): Promise<void> {
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURATION}s`)
    .sign(key());
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURATION,
  });
}

export async function destroyClientSession(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}

export async function getClientSession(): Promise<ClientSession | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return {
      clientPk: payload.clientPk as number,
      clientId: payload.clientId as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}
