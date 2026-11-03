import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/user";
import { demoAccount } from "./demo";
import type { Account } from "./types";

/**
 * The signed-in investor's account. Today it returns demo data; in step 2 it
 * reads the investor's rows from Supabase (RLS limits them to their own).
 * React.cache: several sections of one screen share a single read per request.
 */
export const getAccount = cache(async (): Promise<Account> => {
  const user = await getCurrentUser();
  return demoAccount(user.email);
});
