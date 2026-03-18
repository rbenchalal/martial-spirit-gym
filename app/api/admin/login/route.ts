import { NextResponse } from "next/server";

type ErrorBody = { error: string };

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_COOKIE_VALUE = "authenticated";

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body?.password;

    if (!password) {
      return jsonError("Mot de passe manquant.", 400);
    }

    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword) {
      return jsonError("Variable d'environnement ADMIN_PASSWORD manquante.", 500);
    }

    if (password !== expectedPassword) {
      return jsonError("Mot de passe incorrect.", 401);
    }

    const response = NextResponse.json({ message: "Connexion reussie." });
    response.cookies.set(SESSION_COOKIE_NAME, SESSION_COOKIE_VALUE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Failed to login admin", error);
    return jsonError("Impossible de se connecter.", 500);
  }
}
