import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const APP_ROUTES = [
  "/overview",
  "/operations",
  "/withdraw",
  "/settings",
  "/statement",
  "/faq",
];

// Keeps the Supabase session fresh and routes optimistically. Real
// authorization happens in getCurrentUser() and in each Server Action.
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isAppRoute = APP_ROUTES.some((route) => pathname.startsWith(route));

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    // Carry refreshed auth cookies over to the redirect.
    for (const cookie of response.cookies.getAll())
      redirect.cookies.set(cookie);
    return redirect;
  };

  if (isAppRoute && !signedIn) return redirectTo("/login");
  if ((pathname === "/login" || pathname === "/") && signedIn)
    return redirectTo("/overview");
  return response;
}

// API routes are skipped: the WordPress webhook carries no session.
export const config = {
  matcher: [
    "/((?!_next/|api/|brand/|favicon.ico|.*\\.(?:png|jpg|svg|ico|webmanifest)$).*)",
  ],
};
