import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_COOKIE_VALUE = "authenticated";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = sessionCookie === SESSION_COOKIE_VALUE;
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
