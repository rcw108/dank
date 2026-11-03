"use server";

import { randomInt } from "node:crypto";
import { DEMO_CODE, DEMO_MODE } from "@/lib/auth/demo";
import { readSession } from "@/lib/auth/session";
import { getAccount } from "@/lib/data/account";
import { withdrawalSchema } from "@/lib/withdrawal";

export type WithdrawalResult =
  { ok: true; reference: string } | { ok: false; error: string };

/** Emails a confirmation code (replaces the password field of the site form). */
export async function sendWithdrawalCode(): Promise<{ ok: boolean }> {
  const session = await readSession();
  if (!session) return { ok: false };
  // Step 3: supabase.auth.reauthenticate() emails a one-time code.
  return { ok: true };
}

export async function submitWithdrawal(
  input: unknown,
): Promise<WithdrawalResult> {
  // Server Actions are public endpoints: authorize inside the action itself.
  const session = await readSession();
  if (!session)
    return { ok: false, error: "Your session has ended. Log in again." };

  const parsed = withdrawalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const request = parsed.data;

  if (DEMO_MODE && request.code !== DEMO_CODE) {
    return {
      ok: false,
      error: "That code didn't work. Check the email or send a new code.",
    };
  }

  const { summary, rules } = await getAccount();
  if (summary.currentCapital <= rules.minimumBalance) {
    return {
      ok: false,
      error: "Withdrawals open when your balance is above $50,000.",
    };
  }
  if (request.amount > summary.currentCapital) {
    return {
      ok: false,
      error: "The amount is more than your current capital.",
    };
  }
  if (
    request.details.method === "card" &&
    request.amount > rules.cardDailyLimit
  ) {
    return {
      ok: false,
      error: `Card withdrawals are limited to $${rules.cardDailyLimit} per day.`,
    };
  }

  // Step 4: forward to the dank-sync WP endpoint, which creates the
  // Gravity Forms entry (form 10) so the team handles it as today.
  const reference = `WR-${randomInt(100000, 999999)}`;
  return { ok: true, reference };
}
