import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Same scheme as wordpress/dank-sync/includes/core.php:
// hex(HMAC-SHA256(secret, `${timestamp}.${body}`)), timestamp in Unix seconds.
export const SIGNATURE_WINDOW_SECONDS = 300;

export function sign(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

export function verify(
  secret: string,
  timestamp: string | null,
  signature: string | null,
  body: string,
  now = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp))
    return false;
  if (Math.abs(now - Number(timestamp)) > SIGNATURE_WINDOW_SECONDS)
    return false;
  const expected = Buffer.from(sign(secret, timestamp, body));
  const actual = Buffer.from(signature.trim().toLowerCase());
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
