import type { ManagedPublicTariffsDocument } from "./managed-types.ts";
import {
  validateManagedPublicTariffsDocument,
  type ManagedPublicTariffsValidationIssue,
} from "./managed-validation.ts";

export const MANAGED_PUBLIC_TARIFFS_KV_KEY = "admin:public-tariffs";

export type ManagedPublicTariffsKvClient = {
  get(key: string): Promise<unknown | null>;
  eval(
    script: string,
    keys: string[],
    args: unknown[],
  ): Promise<unknown>;
};

export type ManagedPublicTariffsStoreErrorCode =
  | "not_found"
  | "invalid_stored_document"
  | "invalid_input"
  | "revision_conflict"
  | "storage_unavailable";

export type ManagedPublicTariffsStoreResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      code: ManagedPublicTariffsStoreErrorCode;
      message: string;
      issues?: ManagedPublicTariffsValidationIssue[];
    };

const LUA_OK = "ok";
const LUA_CONFLICT = "conflict";
const LUA_INVALID_STORED = "invalid_stored";
const EXPECT_ABSENT = "absent";

const MANAGED_PUBLIC_TARIFFS_CAS_SCRIPT = `
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

let defaultClientPromise: Promise<ManagedPublicTariffsKvClient> | null = null;

async function createDefaultClient(): Promise<ManagedPublicTariffsKvClient> {
  const { kv } = await import("@vercel/kv");
  return {
    get(key: string) {
      return kv.get(key);
    },
    eval(script: string, keys: string[], args: unknown[]) {
      return kv.eval(script, keys, args);
    },
  };
}

async function resolveClient(
  client?: ManagedPublicTariffsKvClient,
): Promise<ManagedPublicTariffsKvClient> {
  if (client) {
    return client;
  }

  if (!defaultClientPromise) {
    defaultClientPromise = createDefaultClient();
  }

  return defaultClientPromise;
}

function failure<T>(
  code: ManagedPublicTariffsStoreErrorCode,
  message: string,
  issues?: ManagedPublicTariffsValidationIssue[],
): ManagedPublicTariffsStoreResult<T> {
  return issues === undefined
    ? { ok: false, code, message }
    : { ok: false, code, message, issues };
}

function success<T>(value: T): ManagedPublicTariffsStoreResult<T> {
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
  | {
      status: "error";
      result: ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>;
    };

function interpretLuaResult(result: unknown): LuaInterpretation {
  if (result === LUA_OK) {
    return { status: "ok" };
  }

  if (result === LUA_CONFLICT) {
    return {
      status: "error",
      result: failure(
        "revision_conflict",
        "The managed public tariffs document could not be saved because the expected revision did not match.",
      ),
    };
  }

  if (result === LUA_INVALID_STORED) {
    return {
      status: "error",
      result: failure(
        "invalid_stored_document",
        "The stored managed public tariffs document is not usable.",
      ),
    };
  }

  return {
    status: "error",
    result: failure(
      "storage_unavailable",
      "The managed public tariffs storage is temporarily unavailable.",
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

export async function readManagedPublicTariffsDocument(
  client?: ManagedPublicTariffsKvClient,
): Promise<ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>> {
  const kvClient = await resolveClient(client);

  let stored: unknown | null;
  try {
    stored = await kvClient.get(MANAGED_PUBLIC_TARIFFS_KV_KEY);
  } catch {
    return failure(
      "storage_unavailable",
      "The managed public tariffs storage is temporarily unavailable.",
    );
  }

  if (stored === null || stored === undefined) {
    return failure(
      "not_found",
      "No managed public tariffs document is stored.",
    );
  }

  const normalized = normalizeStoredValue(stored);
  const validation = validateManagedPublicTariffsDocument(normalized);
  if (!validation.ok) {
    return failure(
      "invalid_stored_document",
      "The stored managed public tariffs document failed validation.",
      validation.issues,
    );
  }

  return success(structuredClone(validation.value));
}

export async function writeManagedPublicTariffsDocument(
  input: unknown,
  options: {
    expectedRevision: number;
  },
  client?: ManagedPublicTariffsKvClient,
): Promise<ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>> {
  const kvClient = await resolveClient(client);

  if (!isValidExpectedRevision(options.expectedRevision)) {
    return failure(
      "invalid_input",
      "expectedRevision must be a non-negative safe integer.",
    );
  }

  const inputValidation = validateManagedPublicTariffsDocument(input);
  if (!inputValidation.ok) {
    return failure(
      "invalid_input",
      "The managed public tariffs document input failed validation.",
      inputValidation.issues,
    );
  }

  if (inputValidation.value.revision !== options.expectedRevision) {
    return failure(
      "invalid_input",
      "document.revision must equal expectedRevision.",
    );
  }

  const nextDocument: ManagedPublicTariffsDocument = structuredClone(
    inputValidation.value,
  );
  nextDocument.revision = options.expectedRevision + 1;

  const finalValidation = validateManagedPublicTariffsDocument(nextDocument);
  if (!finalValidation.ok) {
    return failure(
      "invalid_input",
      "The managed public tariffs document input failed validation.",
      finalValidation.issues,
    );
  }

  if (options.expectedRevision === 0) {
    const existing = await readManagedPublicTariffsDocument(kvClient);
    if (existing.ok) {
      return failure(
        "revision_conflict",
        "The managed public tariffs document could not be saved because the expected revision did not match.",
      );
    }

    if (!existing.ok && existing.code !== "not_found") {
      return existing;
    }
  } else {
    const existing = await readManagedPublicTariffsDocument(kvClient);
    if (!existing.ok) {
      if (existing.code === "not_found") {
        return failure(
          "revision_conflict",
          "The managed public tariffs document could not be saved because the expected revision did not match.",
        );
      }
      return existing;
    }

    if (existing.value.revision !== options.expectedRevision) {
      return failure(
        "revision_conflict",
        "The managed public tariffs document could not be saved because the expected revision did not match.",
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
      MANAGED_PUBLIC_TARIFFS_CAS_SCRIPT,
      [MANAGED_PUBLIC_TARIFFS_KV_KEY],
      [expectedArg, payload],
    );
  } catch {
    return failure(
      "storage_unavailable",
      "The managed public tariffs storage is temporarily unavailable.",
    );
  }

  const interpreted = interpretLuaResult(luaResult);
  if (interpreted.status === "ok") {
    return success(structuredClone(finalValidation.value));
  }

  return interpreted.result;
}
