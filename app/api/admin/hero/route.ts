import { NextResponse } from "next/server";
import {
  readEditableHero,
  writeEditableHero,
  type EditableHero,
} from "@/lib/editable-hero-store";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
}

function isValidHero(value: unknown): value is EditableHero {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditableHero;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string"
  );
}

function hasRequiredContent(value: EditableHero) {
  return value.title.trim().length > 0 && value.description.trim().length > 0;
}

export async function GET() {
  try {
    const hero = await readEditableHero();
    return NextResponse.json({ hero });
  } catch (error) {
    console.error("Failed to read hero", error);
    return jsonError("Impossible de recuperer les donnees Hero.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { hero?: unknown };
    const nextValue = body?.hero;

    if (!isValidHero(nextValue)) {
      return jsonError("Le format des donnees Hero est invalide.", 400);
    }

    if (!hasRequiredContent(nextValue)) {
      return jsonError("Le Hero doit inclure un titre et une description.", 400);
    }

    const hero = await writeEditableHero(nextValue);
    return NextResponse.json({
      hero,
      message: "Hero mis a jour.",
    });
  } catch (error) {
    console.error("Failed to write hero", error);
    return jsonError("Impossible de mettre a jour le Hero.", 500);
  }
}
