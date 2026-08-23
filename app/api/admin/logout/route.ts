import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.json({ message: "Deconnexion reussie." });
  clearAdminSessionCookie(response);
  return response;
}
