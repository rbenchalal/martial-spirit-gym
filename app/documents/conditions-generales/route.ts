import { NextResponse } from "next/server";

const FALLBACK_PDF_PATH = "/documents/conditions-generales-martial-spirit-gym.pdf";

export function GET(request: Request) {
  const redirectUrl = new URL(FALLBACK_PDF_PATH, request.url);
  const response = NextResponse.redirect(redirectUrl, 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
