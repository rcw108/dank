import { NextResponse, type NextRequest } from "next/server";

// Optimistic routing only: real authorization happens in getCurrentUser().
const SESSION_COOKIE = "dank_session";
const APP_ROUTES = [
  "/overview",
  "/operations",
  "/withdraw",
  "/settings",
  "/statement",
  "/faq",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isAppRoute = APP_ROUTES.some((route) => pathname.startsWith(route));

  if (isAppRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if ((pathname === "/login" || pathname === "/") && hasSession) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/|brand/|favicon.ico|.*\\.(?:png|jpg|svg|ico|webmanifest)$).*)",
  ],
};
