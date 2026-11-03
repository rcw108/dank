"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState =
  | { step: "email"; error?: string; email?: string }
  | { step: "code"; email: string; error?: string; sentAt: number };

const emailSchema = z.email("Enter a valid email address.");
const codeSchema = z
  .string()
  .regex(/^\d{6,10}$/, "Enter the code from the email.");

// Investors are created by the WordPress sync (step 4). Until then, new emails
// may sign up so the app can be tested; flip to false when the sync is live.
const ALLOW_NEW_USERS = process.env.AUTH_ALLOW_NEW_USERS !== "false";

export async function requestCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { step: "email", email: raw, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: ALLOW_NEW_USERS },
  });
  if (error) {
    return {
      step: "email",
      email: parsed.data,
      error: friendlyError(error.message, error.status),
    };
  }
  return { step: "code", email: parsed.data, sentAt: Date.now() };
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

function friendlyError(message: string, status?: number): string {
  if (status === 429 || /rate limit/i.test(message)) {
    return "Too many codes requested. Wait a few minutes and try again.";
  }
  if (/not authorized/i.test(message)) {
    // Supabase's built-in mailer only delivers to the project's team members
    // until custom SMTP is configured (TASKS 3.4).
    return "Codes can't be sent to this email yet. Contact DANK Capital support.";
  }
  if (/signups? not allowed|user not found/i.test(message)) {
    return "We couldn't find an account with this email. Use the email of your dank.capital account.";
  }
  return "We couldn't send the code. Try again in a moment.";
}
