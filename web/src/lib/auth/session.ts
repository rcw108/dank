import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Demo session: a signed cookie holding the investor's email. Step 3 replaces
// this module with Supabase Auth (@supabase/ssr); callers keep the same API.

export const SESSION_COOKIE = "dank_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// Demo only. Supabase Auth replaces this before real investor data is shown.
const secret = process.env.SESSION_SECRET ?? "dank-demo-session-secret";

export type Session = { email: string; exp: number };

function sign(payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encode(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(value: string): Session | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Session;
    return session.exp > Date.now() / 1000 ? session : null;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? decode(value) : null;
}

export async function startSession(email: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  (await cookies()).set(SESSION_COOKIE, encode({ email, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
