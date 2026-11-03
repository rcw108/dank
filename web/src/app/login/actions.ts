"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_CODE, DEMO_MODE } from "@/lib/auth/demo";
import { startSession } from "@/lib/auth/session";

export type LoginState =
  | { step: "email"; error?: string; email?: string }
  | { step: "code"; email: string; error?: string; sentAt: number };

const emailSchema = z.email("Enter a valid email address.");
const codeSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter the 6-digit code from the email.");

export async function requestCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = emailSchema.safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) {
    return {
      step: "email",
      error: parsed.error.issues[0].message,
      email: String(formData.get("email") ?? ""),
    };
  }

  // Step 3: supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
  if (!DEMO_MODE) {
    return {
      step: "email",
      email: parsed.data,
      error: "Sign-in is not connected yet.",
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

  // Step 3: supabase.auth.verifyOtp({ email, token, type: "email" })
  if (!DEMO_MODE || parsed.data !== DEMO_CODE) {
    return {
      step: "code",
      email,
      sentAt,
      error: "That code didn't work. Check the email or send a new code.",
    };
  }

  await startSession(email);
  redirect("/overview");
}
