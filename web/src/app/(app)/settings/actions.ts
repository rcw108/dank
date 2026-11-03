"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export type RequestState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

const profileSchema = z.object({
  appeal: z.enum(["Mr.", "Ms.", "Mrs."], "Choose how we should address you."),
  firstName: z.string().trim().min(1, "Enter your first name."),
  lastName: z.string().trim().min(1, "Enter your last name."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a phone number with country code."),
});

const emailSchema = z.object({
  email: z.email("Enter a valid email address."),
});

// Each action authorizes itself: Server Actions are reachable by direct POST.
async function requireSession() {
  const user = await requireUser();
  if (!user) redirect("/login");
  return user;
}

export async function requestProfileChange(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  await requireSession();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  // Step 4: forward to WP → Gravity Forms form 4 ("Profile Information").
  return {
    status: "sent",
    message: "Request sent. We'll update your details after review.",
  };
}

export async function requestEmailChange(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const session = await requireSession();
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  if (parsed.data.email.toLowerCase() === session.email) {
    return { status: "error", message: "That's already your email." };
  }
  // Step 4: forward to WP → Gravity Forms form 3 ("Security Information").
  return {
    status: "sent",
    message: "Request sent. We'll confirm the change by email.",
  };
}

export async function requestAccountDeletion(): Promise<RequestState> {
  await requireSession();
  // Required by the App Store: the request reaches the team, who close the account.
  return {
    status: "sent",
    message: "Request sent. Our team will contact you to close your account.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
