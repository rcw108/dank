import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * Refreshes the Supabase session cookie on every request and reports whether
 * a user is signed in. Used by src/proxy.ts (Next 16's name for middleware).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() validates the JWT (and refreshes it when expired). Nothing may
  // run between createServerClient and this call, or sessions can drop.
  const { data } = await supabase.auth.getClaims();

  return { response, signedIn: Boolean(data?.claims) };
}
