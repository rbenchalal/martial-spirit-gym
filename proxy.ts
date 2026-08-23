import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = verifyAdminSessionToken(sessionCookie);
  const isLoginPage = pathname === "/admin/login";

  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isLoginPage) {
    const adminUrl = new URL("/admin", request.url);
    return NextResponse.redirect(adminUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
