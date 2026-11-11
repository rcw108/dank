"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { applySnapshot, revokeByEmail } from "@/lib/sync/apply";
import { checkInvestor } from "@/lib/wordpress/client";

export type LoginState =
  | { step: "email"; error?: string; email?: string }
  | { step: "code"; email: string; error?: string; sentAt: number };

const emailSchema = z.email("Enter a valid email address.");
const codeSchema = z
  .string()
  .regex(/^\d{6,10}$/, "Enter the code from the email.");

// Every answer takes at least this long, so response time doesn't reveal
// whether an email belongs to an investor.
const MIN_RESPONSE_MS = 1200;

/**
 * Sends a login code only to users with the investor role on dank.capital.
 * The answer looks the same for investors and non-investors, so the form
 * can't be used to find out who invests with DANK Capital.
 */
export async function requestCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const startedAt = Date.now();
  const raw = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { step: "email", email: raw, error: parsed.error.issues[0].message };
  }
  const email = parsed.data;

  const allowed = await isInvestor(email);
  if (allowed === "unavailable") {
    await settle(startedAt);
    return {
      step: "email",
      email,
      error:
        "We can't check your account right now. Try again in a few minutes.",
    };
  }

  if (allowed) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      console.error(
        "[login] signInWithOtp failed",
        error.status,
        error.message,
      );
      await settle(startedAt);
      return {
        step: "email",
        email,
        error: friendlyError(error.message, error.status),
      };
    }
  } else {
    console.info("[login] code not sent: not an investor");
  }

  await settle(startedAt);
  return { step: "code", email, sentAt: Date.now() };
}

/**
 * Source of truth is WordPress (role "investor"). Its answer also refreshes
 * the investor's data and creates their Supabase user on first login.
 * If WordPress can't be reached, investors already synced may still log in.
 */
async function isInvestor(email: string): Promise<boolean | "unavailable"> {
  const check = await checkInvestor(email);

  if (check.status === "investor") {
    try {
      await applySnapshot(check.snapshot);
      return true;
    } catch (error) {
      console.error("[login] sync on login failed", error);
      return "unavailable";
    }
  }

  if (check.status === "not_investor") {
    // Role removed in WordPress: make sure the app forgets the account too
    // (normally the plugin already reported it).
    await revokeByEmail(email).catch((error) =>
      console.error("[login] revoke failed", error),
    );
    return false;
  }

  console.warn("[login] WordPress check unavailable:", check.reason);
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("investors")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } catch (error) {
    console.error("[login] fallback check failed", error);
    return "unavailable";
  }
}

export async function verifyCode(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = prev.step === "code" ? prev.email : "";
  const sentAt = prev.step === "code" ? prev.sentAt : Date.now();
  const parsed = codeSchema.safeParse(
    String(formData.get("code") ?? "").trim(),
  );
  if (!parsed.success) {
    return {
      step: "code",
      email,
      sentAt,
      error: parsed.error.issues[0].message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data,
    type: "email",
  });
  if (error) {
    return {
      step: "code",
      email,
      sentAt,
      error:
        "That code didn't work or has expired. Check the email or send a new code.",
    };
  }

  redirect("/overview");
}

async function settle(startedAt: number) {
  const wait = MIN_RESPONSE_MS - (Date.now() - startedAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

function friendlyError(message: string, status?: number): string {
  if (status === 429 || /rate limit/i.test(message)) {
    return "Too many codes requested. Wait a few minutes and try again.";
  }
  return "We couldn't send the code. Try again in a moment.";
}
