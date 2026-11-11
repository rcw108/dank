import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { toInvestorPayload } from "./mapping";
import type { Snapshot } from "./snapshot";

export type ApplyResult =
  | { status: "synced"; userId: string }
  | { status: "revoked" }
  | { status: "ignored" };

// Effectively permanent; lifted again if the investor role comes back.
const BAN_DURATION = "876000h";

/**
 * Writes one WordPress snapshot to Supabase:
 * investor → make sure a Supabase Auth user exists, then store the snapshot;
 * no longer an investor (role removed / user deleted) → remove the account
 * from the app and block sign-in.
 */
export async function applySnapshot(snapshot: Snapshot): Promise<ApplyResult> {
  const admin = createAdminClient();
  try {
    const result =
      snapshot.is_investor && !snapshot.deleted && snapshot.email
        ? await store(admin, snapshot)
        : await revoke(admin, snapshot.wp_user_id);
    // A calculation error on WordPress is stored (profile updated, last
    // figures kept) but logged, so it can be seen in sync_log.
    const calcError = snapshot.account_error
      ? `account calculation: ${snapshot.account_error}`
      : null;
    await log(
      admin,
      snapshot.wp_user_id,
      calcError ? "error" : "ok",
      calcError,
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await log(admin, snapshot.wp_user_id, "error", message);
    throw error;
  }
}

async function store(
  admin: SupabaseClient,
  snapshot: Snapshot,
): Promise<ApplyResult> {
  const userId = await ensureAuthUser(admin, snapshot);
  const { error } = await admin.rpc("sync_investor", {
    p: toInvestorPayload(snapshot, userId),
  });
  if (error) throw new Error(`sync_investor: ${error.message}`);
  return { status: "synced", userId };
}

async function ensureAuthUser(
  admin: SupabaseClient,
  snapshot: Snapshot,
): Promise<string> {
  const email = snapshot.email.toLowerCase();

  // 1. Known investor: keep the same auth user, follow email changes.
  const { data: known, error: knownError } = await admin
    .from("investors")
    .select("user_id, email")
    .eq("wp_user_id", snapshot.wp_user_id)
    .maybeSingle<{ user_id: string; email: string }>();
  if (knownError) throw new Error(`investors lookup: ${knownError.message}`);
  if (known) {
    if (known.email.toLowerCase() !== email) {
      const { error } = await admin.auth.admin.updateUserById(known.user_id, {
        email,
        email_confirm: true,
      });
      if (error) throw new Error(`email change: ${error.message}`);
    }
    return known.user_id;
  }

  // 2. Auth user already exists for this email (earlier login, or a revoked investor).
  const { data: existingId, error: lookupError } = await admin.rpc(
    "auth_user_id_by_email",
    { p_email: email },
  );
  if (lookupError) throw new Error(`auth lookup: ${lookupError.message}`);
  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(
      existingId as string,
      { ban_duration: "none" },
    );
    if (error) throw new Error(`unblock: ${error.message}`);
    return existingId as string;
  }

  // 3. New investor.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { wp_user_id: snapshot.wp_user_id },
  });
  if (error || !data.user)
    throw new Error(`create user: ${error?.message ?? "no user returned"}`);
  return data.user.id;
}

async function revoke(
  admin: SupabaseClient,
  wpUserId: number,
): Promise<ApplyResult> {
  const { data: known, error } = await admin
    .from("investors")
    .select("user_id")
    .eq("wp_user_id", wpUserId)
    .maybeSingle<{ user_id: string }>();
  if (error) throw new Error(`investors lookup: ${error.message}`);
  if (!known) return { status: "ignored" };
  return removeAccess(admin, known.user_id);
}

/** For the login check: WordPress says this email is not an investor. */
export async function revokeByEmail(email: string): Promise<ApplyResult> {
  const admin = createAdminClient();
  const { data: known, error } = await admin
    .from("investors")
    .select("user_id")
    .eq("email", email.toLowerCase())
    .maybeSingle<{ user_id: string }>();
  if (error) throw new Error(`investors lookup: ${error.message}`);
  if (!known) return { status: "ignored" };
  return removeAccess(admin, known.user_id);
}

async function removeAccess(
  admin: SupabaseClient,
  userId: string,
): Promise<ApplyResult> {
  const known = { user_id: userId };
  const { error: deleteError } = await admin
    .from("investors")
    .delete()
    .eq("user_id", known.user_id);
  if (deleteError) throw new Error(`remove investor: ${deleteError.message}`);
  const { error: banError } = await admin.auth.admin.updateUserById(
    known.user_id,
    { ban_duration: BAN_DURATION },
  );
  if (banError) throw new Error(`block sign-in: ${banError.message}`);
  return { status: "revoked" };
}

async function log(
  admin: SupabaseClient,
  wpUserId: number,
  status: "ok" | "error",
  error: string | null,
) {
  // Diagnostics only: a failed log write must not fail the sync.
  await admin.from("sync_log").insert({ wp_user_id: wpUserId, status, error });
}
