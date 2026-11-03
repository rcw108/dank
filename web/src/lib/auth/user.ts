import "server-only";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

/**
 * Data Access Layer entry point: the only place that turns the request's
 * Supabase session into a user. Redirects to /login when there is none.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  "use cache: private";
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || !claims.email) redirect("/login");
  return { id: claims.sub, email: claims.email };
}

/** For Server Actions: they are public endpoints and must authorize themselves. */
export async function requireUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return claims?.sub && claims.email
    ? { id: claims.sub, email: claims.email }
    : null;
}
