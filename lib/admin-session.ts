import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_VERSION = 1;
const MIN_SECRET_LENGTH = 32;

type SessionPayload = {
  v: number;
  iat: number;
  exp: number;
  nonce: string;
};

function getSessionSecret(): string | null {
  const raw = process.env.ADMIN_SESSION_SECRET;
  if (!raw) {
    return null;
  }

  const secret = raw.trim();
  if (secret.length < MIN_SECRET_LENGTH) {
    return null;
  }

  return secret;
}

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecodeToString(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function safeEqualStrings(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

export function getAdminCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function createAdminSessionToken(): string | null {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString("hex"),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) {
    return false;
  }

  // Reject legacy falsifiable cookie value.
  if (token === "authenticated") {
    return false;
  }

  const secret = getSessionSecret();
  if (!secret) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  if (!safeEqualStrings(signature, expectedSignature)) {
    return false;
  }

  const payloadJson = base64UrlDecodeToString(encodedPayload);
  if (!payloadJson) {
    return false;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return false;
  }

  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<SessionPayload>;
  if (
    candidate.v !== SESSION_VERSION ||
    !isFiniteInteger(candidate.iat) ||
    !isFiniteInteger(candidate.exp) ||
    typeof candidate.nonce !== "string" ||
    !/^[0-9a-f]{32}$/.test(candidate.nonce)
  ) {
    return false;
  }

  if (candidate.iat <= 0) {
    return false;
  }

  if (candidate.exp <= candidate.iat) {
    return false;
  }

  if (candidate.exp - candidate.iat !== SESSION_TTL_SECONDS) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (candidate.exp <= now || candidate.iat > now + 60) {
    return false;
  }

  return true;
}

export function isAdminAuthenticated(request: NextRequest | Request): boolean {
  const cookieHeader =
    "cookies" in request && typeof request.cookies?.get === "function"
      ? request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value
      : undefined;

  if (cookieHeader) {
    return verifyAdminSessionToken(cookieHeader);
  }

  const rawCookie = request.headers.get("cookie") ?? "";
  const match = rawCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`));

  if (!match) {
    return false;
  }

  let value: string;
  try {
    value = decodeURIComponent(match.slice(ADMIN_SESSION_COOKIE_NAME.length + 1));
  } catch {
    return false;
  }

  return verifyAdminSessionToken(value);
}

export function unauthorizedAdminResponse() {
  return NextResponse.json({ error: "Non autorise." }, { status: 401 });
}

export function requireAdminSession(request: NextRequest | Request) {
  if (!isAdminAuthenticated(request)) {
    return unauthorizedAdminResponse();
  }
  return null;
}

export function applyAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(
    ADMIN_SESSION_COOKIE_NAME,
    token,
    getAdminCookieOptions(SESSION_TTL_SECONDS),
  );
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    ...getAdminCookieOptions(0),
    expires: new Date(0),
  });
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const providedDigest = createHash("sha256").update(provided, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}
