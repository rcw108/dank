import "server-only";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { readSession } from "./session";

export type CurrentUser = { email: string };

/**
 * Data Access Layer entry point: the only place that turns the request's
 * session into a user. Redirects to /login when there is none.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  "use cache: private";
  cacheLife({ stale: 60 });

  const session = await readSession();
  if (!session) redirect("/login");
  return { email: session.email };
}
