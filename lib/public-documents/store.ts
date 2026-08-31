import { kv } from "@vercel/kv";
import type { PublicDocumentsState } from "./types.ts";
import {
  validatePublicDocumentsState,
  type PublicDocumentsValidationIssue,
} from "./validation.ts";

export const PUBLIC_DOCUMENTS_KV_KEY = "admin:public-documents";

export type PublicDocumentsKvClient = {
  get(key: string): Promise<unknown | null>;
  eval(
    script: string,
    keys: string[],
    args: unknown[],
  ): Promise<unknown>;
};

export type PublicDocumentsStoreErrorCode =
  | "not_found"
  | "invalid_stored_document"
  | "invalid_input"
  | "revision_conflict"
  | "storage_unavailable";

export type PublicDocumentsStoreResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      code: PublicDocumentsStoreErrorCode;
      message: string;
      issues?: PublicDocumentsValidationIssue[];
    };

const LUA_OK = "ok";
const LUA_CONFLICT = "conflict";
const LUA_INVALID_STORED = "invalid_stored";
const EXPECT_ABSENT = "absent";

const PUBLIC_DOCUMENTS_CAS_SCRIPT = `
local key = KEYS[1]
local expected = ARGV[1]
local payload = ARGV[2]
local current = redis.call("GET", key)

if expected == "absent" then
  if current ~= false and current ~= nil then
    return "conflict"
  end
  redis.call("SET", key, payload)
  return "ok"
end

if current == false or current == nil then
  return "conflict"
end

local decodeOk, decoded = pcall(cjson.decode, current)
if not decodeOk or type(decoded) ~= "table" then
  return "invalid_stored"
end

local revision = decoded["revision"]
if type(revision) ~= "number" then
  return "invalid_stored"
end

if tonumber(revision) ~= tonumber(expected) then
  return "conflict"
end

redis.call("SET", key, payload)
return "ok"
`;

function createDefaultClient(): PublicDocumentsKvClient {
  return {
    get(key: string) {
      return kv.get(key);
    },
    eval(script: string, keys: string[], args: unknown[]) {
      return kv.eval(script, keys, args);
    },
  };
}

function resolveClient(client?: PublicDocumentsKvClient): PublicDocumentsKvClient {
  return client ?? createDefaultClient();
}

function failure<T>(
  code: PublicDocumentsStoreErrorCode,
  message: string,
  issues?: PublicDocumentsValidationIssue[],
): PublicDocumentsStoreResult<T> {
  return issues === undefined
    ? { ok: false, code, message }
    : { ok: false, code, message, issues };
}

function success<T>(value: T): PublicDocumentsStoreResult<T> {
  return { ok: true, value };
}

function normalizeStoredValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

type LuaInterpretation =
  | { status: "ok" }
  | { status: "error"; result: PublicDocumentsStoreResult<PublicDocumentsState> };

function interpretLuaResult(result: unknown): LuaInterpretation {
  if (result === LUA_OK) {
    return { status: "ok" };
  }

  if (result === LUA_CONFLICT) {
    return {
      status: "error",
      result: failure(
        "revision_conflict",
        "The public documents state could not be saved because the expected revision did not match.",
      ),
    };
  }

  if (result === LUA_INVALID_STORED) {
    return {
      status: "error",
      result: failure(
        "invalid_stored_document",
        "The stored public documents state is not usable.",
      ),
    };
  }

  return {
    status: "error",
    result: failure(
      "storage_unavailable",
      "The public documents storage is temporarily unavailable.",
    ),
  };
}

function isValidExpectedRevision(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    !Number.isNaN(value) &&
    value >= 0
  );
}

export async function readPublicDocumentsState(
  client?: PublicDocumentsKvClient,
): Promise<PublicDocumentsStoreResult<PublicDocumentsState>> {
  const kvClient = resolveClient(client);

  let stored: unknown | null;
  try {
    stored = await kvClient.get(PUBLIC_DOCUMENTS_KV_KEY);
  } catch {
    return failure(
      "storage_unavailable",
      "The public documents storage is temporarily unavailable.",
    );
  }

  if (stored === null || stored === undefined) {
    return failure("not_found", "No public documents state is stored.");
  }

  const normalized = normalizeStoredValue(stored);
  const validation = validatePublicDocumentsState(normalized);
  if (!validation.ok) {
    return failure(
      "invalid_stored_document",
      "The stored public documents state failed validation.",
      validation.issues,
    );
  }

  return success(validation.value);
}

export async function writePublicDocumentsState(
  input: unknown,
  options: {
    expectedRevision: number;
  },
  client?: PublicDocumentsKvClient,
): Promise<PublicDocumentsStoreResult<PublicDocumentsState>> {
  const kvClient = resolveClient(client);

  if (!isValidExpectedRevision(options.expectedRevision)) {
    return failure(
      "invalid_input",
      "expectedRevision must be a non-negative safe integer.",
    );
  }

  const inputValidation = validatePublicDocumentsState(input);
  if (!inputValidation.ok) {
    return failure(
      "invalid_input",
      "The public documents state input failed validation.",
      inputValidation.issues,
    );
  }

  const nextDocument: PublicDocumentsState = {
    ...inputValidation.value,
    revision: options.expectedRevision + 1,
  };

  const finalValidation = validatePublicDocumentsState(nextDocument);
  if (!finalValidation.ok) {
    return failure(
      "invalid_input",
      "The public documents state input failed validation.",
      finalValidation.issues,
    );
  }

  if (options.expectedRevision === 0) {
    const existing = await readPublicDocumentsState(kvClient);
    if (existing.ok) {
      return failure(
        "revision_conflict",
        "The public documents state could not be saved because the expected revision did not match.",
      );
    }

    if (!existing.ok && existing.code !== "not_found") {
      return existing;
    }
  } else {
    const existing = await readPublicDocumentsState(kvClient);
    if (!existing.ok) {
      if (existing.code === "not_found") {
        return failure(
          "revision_conflict",
          "The public documents state could not be saved because the expected revision did not match.",
        );
      }
      return existing;
    }

    if (existing.value.revision !== options.expectedRevision) {
      return failure(
        "revision_conflict",
        "The public documents state could not be saved because the expected revision did not match.",
      );
    }
  }

  const expectedArg =
    options.expectedRevision === 0
      ? EXPECT_ABSENT
      : String(options.expectedRevision);
  const payload = JSON.stringify(finalValidation.value);

  let luaResult: unknown;
  try {
    luaResult = await kvClient.eval(
      PUBLIC_DOCUMENTS_CAS_SCRIPT,
      [PUBLIC_DOCUMENTS_KV_KEY],
      [expectedArg, payload],
    );
  } catch {
    return failure(
      "storage_unavailable",
      "The public documents storage is temporarily unavailable.",
    );
  }

  const interpreted = interpretLuaResult(luaResult);
  if (interpreted.status === "ok") {
    return success(finalValidation.value);
  }

  return interpreted.result;
}
