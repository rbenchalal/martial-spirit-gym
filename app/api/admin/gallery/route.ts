import { NextResponse } from "next/server";
import {
  readEditableGallery,
  writeEditableGallery,
} from "@/lib/editable-gallery-store";
import type { EditableGalleryItem } from "@/lib/editable-gallery";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
}

function isValidGalleryItem(item: unknown): item is EditableGalleryItem {
  if (!item || typeof item !== "object") {
    return false;
  }

  const candidate = item as EditableGalleryItem;
  return (
    typeof candidate.url === "string" &&
    (candidate.type === "image" || candidate.type === "video") &&
    typeof candidate.title === "string" &&
    typeof candidate.alt === "string"
  );
}

export async function GET() {
  try {
    const gallery = readEditableGallery();
    return NextResponse.json({ gallery });
  } catch (error) {
    console.error("Failed to read editable gallery", error);
    return jsonError("Impossible de recuperer la galerie dynamique.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { gallery?: unknown };
    const nextGallery = body?.gallery;

    if (!Array.isArray(nextGallery)) {
      return jsonError("Le champ gallery doit etre un tableau.", 400);
    }

    if (!nextGallery.every(isValidGalleryItem)) {
      return jsonError("Le format des elements de galerie est invalide.", 400);
    }

    const gallery = writeEditableGallery(nextGallery);
    return NextResponse.json({
      gallery,
      message: "Galerie dynamique mise a jour.",
    });
  } catch (error) {
    console.error("Failed to write editable gallery", error);
    return jsonError("Impossible de mettre a jour la galerie dynamique.", 500);
  }
}
