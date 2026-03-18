import { del, list, put } from "@vercel/blob";
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

function sanitizeFilename(name: string) {
  return name.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Aucun fichier valide n'a ete fourni.", 400);
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      return jsonError("Seuls les fichiers image et video sont autorises.", 400);
    }

    const pathname = `admin-media/${Date.now()}-${sanitizeFilename(file.name)}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    return NextResponse.json({
      media: blob,
      message: "Upload termine avec succes.",
    });
  } catch (error) {
    console.error("Failed to upload blob", error);
    return jsonError(`Erreur pendant l'upload du media. ${getErrorMessage(error)}`, 500);
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
