import { kv } from "@vercel/kv";

export type EditableScheduleSession = {
  title: string;
  slots: string[];
};

const EDITABLE_SCHEDULE_KV_KEY = "admin:schedule";

function normalizeSession(session: EditableScheduleSession): EditableScheduleSession {
  return {
    title: session.title.trim(),
    slots: session.slots.map((slot) => slot.trim()).filter(Boolean),
  };
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

export async function readEditableSchedule(): Promise<EditableScheduleSession[] | null> {
  const stored = await kv.get<unknown>(EDITABLE_SCHEDULE_KV_KEY);
  if (!Array.isArray(stored)) {
    return null;
  }

  const validSessions = stored.filter(isValidSession);
  return validSessions.map(normalizeSession);
}

export async function writeEditableSchedule(
  nextValue: EditableScheduleSession[],
): Promise<EditableScheduleSession[]> {
  const normalized = nextValue.map(normalizeSession);
  await kv.set(EDITABLE_SCHEDULE_KV_KEY, normalized);
  return normalized;
}
