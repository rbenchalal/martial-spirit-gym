import { NextResponse } from "next/server";
import {
  readEditableContact,
  writeEditableContact,
  type EditableContact,
} from "@/lib/editable-contact-store";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
}

function isValidContact(value: unknown): value is EditableContact {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditableContact;
  return (
    typeof candidate.phone === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.address === "string"
  );
}

function hasRequiredContent(value: EditableContact) {
  return (
    value.phone.trim().length > 0 &&
    value.email.trim().length > 0 &&
    value.address.trim().length > 0
  );
}

export async function GET() {
  try {
    const contact = await readEditableContact();
    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Failed to read contact", error);
    return jsonError("Impossible de recuperer les donnees Contact.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { contact?: unknown };
    const nextValue = body?.contact;

    if (!isValidContact(nextValue)) {
      return jsonError("Le format des donnees Contact est invalide.", 400);
    }

    if (!hasRequiredContent(nextValue)) {
      return jsonError("Le Contact doit inclure telephone, email et adresse.", 400);
    }

    const contact = await writeEditableContact(nextValue);
    return NextResponse.json({
      contact,
      message: "Contact mis a jour.",
    });
  } catch (error) {
    console.error("Failed to write contact", error);
    return jsonError("Impossible de mettre a jour le Contact.", 500);
  }
}
