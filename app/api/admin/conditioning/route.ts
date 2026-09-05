import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  readEditableConditioning,
  writeEditableConditioning,
  type EditableConditioning,
} from "@/lib/editable-conditioning-store";
import { handleGetAdminConditioning } from "@/lib/conditioning/http";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
}

function isValidConditioning(value: unknown): value is EditableConditioning {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditableConditioning;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string"
  );
}

function hasRequiredContent(value: EditableConditioning) {
  return value.title.trim().length > 0 && value.description.trim().length > 0;
}

export async function GET(request: Request): Promise<Response> {
  return handleGetAdminConditioning({
    requireAdmin: async () => requireAdminSession(request) === null,
    readConditioning: () => readEditableConditioning(),
  });
}

export async function POST(request: Request) {
  const unauthorized = requireAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await request.json()) as { conditioning?: unknown };
    const nextValue = body?.conditioning;

    if (!isValidConditioning(nextValue)) {
      return jsonError("Le format des donnees Conditioning est invalide.", 400);
    }

    if (!hasRequiredContent(nextValue)) {
      return jsonError("Le Conditioning doit inclure un titre et une description.", 400);
    }

    const conditioning = await writeEditableConditioning(nextValue);
    return NextResponse.json({
      conditioning,
      message: "Conditioning mis a jour.",
    });
  } catch (error) {
    console.error("Failed to write conditioning", error);
    return jsonError("Impossible de mettre a jour le Conditioning.", 500);
  }
}
