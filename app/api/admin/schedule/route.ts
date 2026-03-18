import { NextResponse } from "next/server";
import {
  readEditableSchedule,
  writeEditableSchedule,
  type EditableScheduleSession,
} from "@/lib/editable-schedule-store";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
}

function isValidSession(value: unknown): value is EditableScheduleSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditableScheduleSession;
  return (
    typeof candidate.title === "string" &&
    Array.isArray(candidate.slots) &&
    candidate.slots.every((slot) => typeof slot === "string")
  );
}

function hasRequiredContent(value: EditableScheduleSession) {
  return (
    value.title.trim().length > 0 &&
    value.slots.some((slot) => slot.trim().length > 0)
  );
}

export async function GET() {
  try {
    const schedule = await readEditableSchedule();
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Failed to read schedule", error);
    return jsonError("Impossible de recuperer les donnees Planning.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { schedule?: unknown };
    const nextValue = body?.schedule;

    if (!Array.isArray(nextValue)) {
      return jsonError("Le Planning doit etre un tableau de sessions.", 400);
    }

    if (!nextValue.every(isValidSession)) {
      return jsonError("Le format des sessions Planning est invalide.", 400);
    }

    if (!nextValue.every((session) => hasRequiredContent(session as EditableScheduleSession))) {
      return jsonError("Chaque session doit inclure un titre et au moins un creneau.", 400);
    }

    const schedule = await writeEditableSchedule(nextValue);
    return NextResponse.json({
      schedule,
      message: "Planning mis a jour.",
    });
  } catch (error) {
    console.error("Failed to write schedule", error);
    return jsonError("Impossible de mettre a jour le Planning.", 500);
  }
}
