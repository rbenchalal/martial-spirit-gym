import { NextResponse } from "next/server";
import {
  applyAdminSessionCookie,
  createAdminSessionToken,
  passwordsMatch,
} from "@/lib/admin-session";

type ErrorBody = { error: string };

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

    if (!passwordsMatch(password, expectedPassword)) {
      return jsonError("Mot de passe incorrect.", 401);
    }

    const token = createAdminSessionToken();
    if (!token) {
      return jsonError("Configuration de session administrateur invalide.", 500);
    }

    const response = NextResponse.json({ message: "Connexion reussie." });
    applyAdminSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Failed to login admin", error);
    return jsonError("Impossible de se connecter.", 500);
  }
}
