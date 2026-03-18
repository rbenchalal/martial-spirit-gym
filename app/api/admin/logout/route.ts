import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";

export async function POST() {
  const response = NextResponse.json({ message: "Deconnexion reussie." });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
