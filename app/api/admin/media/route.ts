import { del, list } from "@vercel/blob";
import { NextResponse } from "next/server";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Erreur inconnue.";
}

export async function GET() {
  try {
    const { blobs } = await list();

    return NextResponse.json({
      media: blobs,
    });
  } catch (error) {
    console.error("Failed to list blobs", error);
    return jsonError(`Impossible de recuperer les medias. ${getErrorMessage(error)}`, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body?.url;

    if (!url) {
      return jsonError("URL du media manquante.", 400);
    }

    await del(url);

    return NextResponse.json({
      message: "Media supprime avec succes.",
    });
  } catch (error) {
    console.error("Failed to delete blob", error);
    return jsonError(`Erreur pendant la suppression du media. ${getErrorMessage(error)}`, 500);
  }
}
