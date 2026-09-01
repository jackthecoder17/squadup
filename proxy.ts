import { NextResponse } from "next/server";

import { auth } from "@/server/auth";

// Next.js 16 renamed `middleware` to `proxy`; it now always runs on the
// Node runtime (no edge option), which is what lets this call straight
// into the same `auth()` used by Server Components and Server Actions.
export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/app");

  if (isProtectedRoute && !isLoggedIn) {
    const signInUrl = new URL("/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/app/:path*"],
};
