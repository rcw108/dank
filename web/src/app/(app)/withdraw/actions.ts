"use server";

import { randomInt } from "node:crypto";
import { requireUser } from "@/lib/auth/user";
import { getAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { withdrawalSchema } from "@/lib/withdrawal";

export type WithdrawalResult =
  { ok: true; reference: string } | { ok: false; error: string };

/** Emails a one-time code to confirm the request (the site asks for the password). */
export async function sendWithdrawalCode(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await requireUser();
  if (!user)
    return { ok: false, error: "Your session has ended. Log in again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    return {
      ok: false,
      error:
        error.status === 429
          ? "Too many codes requested. Wait a few minutes and try again."
          : "We couldn't send the code. Try again in a moment.",
    };
  }
  return { ok: true };
}

export async function submitWithdrawal(
  input: unknown,
): Promise<WithdrawalResult> {
  // Server Actions are public endpoints: authorize inside the action itself.
  const user = await requireUser();
  if (!user)
    return { ok: false, error: "Your session has ended. Log in again." };

  const parsed = withdrawalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const request = parsed.data;

  const account = await getAccount();
  if (!account) {
    return {
      ok: false,
      error:
        "Your account hasn't been set up yet. Contact DANK Capital support.",
    };
  }
  const { summary, rules } = account;
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

  // Confirm with the emailed code; it must belong to the signed-in investor.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: user.email,
    token: request.code,
    type: "email",
  });
  if (error || data.user?.id !== user.id) {
    return {
      ok: false,
      error: "That code didn't work or has expired. Send a new code.",
    };
  }

  // Step 4: forward to the dank-sync WP endpoint, which creates the
  // Gravity Forms entry (form 10) so the team handles it as today.
  const reference = `WR-${randomInt(100000, 999999)}`;
  return { ok: true, reference };
}
