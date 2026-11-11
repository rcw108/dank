import "server-only";
import { snapshotSchema, type Snapshot } from "@/lib/sync/snapshot";
import { WORDPRESS_URL, WP_SYNC_SECRET } from "./config";
import { sign } from "./signature";

export type InvestorCheck =
  | { status: "investor"; snapshot: Snapshot }
  | { status: "not_investor" }
  | { status: "unavailable"; reason: string };

/**
 * Asks dank.capital whether this email belongs to a user with the investor
 * role. The answer includes the investor's current data, so login also
 * refreshes the account.
 */
export async function checkInvestor(email: string): Promise<InvestorCheck> {
  if (!WP_SYNC_SECRET)
    return { status: "unavailable", reason: "WP_SYNC_SECRET is not set" };

  const body = JSON.stringify({ email });
  const timestamp = String(Math.floor(Date.now() / 1000));

  try {
    const response = await fetch(
      `${WORDPRESS_URL}/wp-json/dank-sync/v1/check`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Dank-Timestamp": timestamp,
          "X-Dank-Signature": sign(WP_SYNC_SECRET, timestamp, body),
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) {
      return {
        status: "unavailable",
        reason: `WordPress answered ${response.status}`,
      };
    }
    const data = (await response.json()) as {
      investor?: boolean;
      snapshot?: unknown;
    };
    if (!data.investor) return { status: "not_investor" };

    const parsed = snapshotSchema.safeParse(data.snapshot);
    if (!parsed.success) {
      return {
        status: "unavailable",
        reason: `Unexpected snapshot: ${parsed.error.issues[0].message}`,
      };
    }
    return { status: "investor", snapshot: parsed.data };
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
