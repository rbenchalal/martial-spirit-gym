import { kv } from "@vercel/kv";
import type { CatalogDocument } from "./types.ts";
import {
  validateCatalogDocument,
  type CatalogValidationError,
} from "./validation.ts";

export const CATALOG_KV_KEY = "admin:catalog";

export type CatalogKvClient = {
  get(key: string): Promise<unknown | null>;
  eval(
    script: string,
    keys: string[],
    args: unknown[],
  ): Promise<unknown>;
};

export type CatalogStoreErrorCode =
  | "not_found"
  | "invalid_stored_document"
  | "invalid_input"
  | "revision_conflict"
  | "storage_unavailable";

export type CatalogStoreResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      code: CatalogStoreErrorCode;
      message: string;
      errors?: CatalogValidationError[];
    };

const LUA_OK = "ok";
const LUA_CONFLICT = "conflict";
const LUA_INVALID_STORED = "invalid_stored";
const EXPECT_ABSENT = "absent";

/**
 * Atomic compare-and-set for admin:catalog.
 * ARGV[1] = "absent" for create, or expected revision as a decimal string.
 * ARGV[2] = JSON document to store on success.
 * Returns: "ok" | "conflict" | "invalid_stored"
 */
const CATALOG_CAS_SCRIPT = `
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

function createDefaultClient(): CatalogKvClient {
  return {
    get(key: string) {
      return kv.get(key);
    },
    eval(script: string, keys: string[], args: unknown[]) {
      return kv.eval(script, keys, args);
    },
  };
}

function resolveClient(client?: CatalogKvClient): CatalogKvClient {
  return client ?? createDefaultClient();
}

function failure<T>(
  code: CatalogStoreErrorCode,
  message: string,
  errors?: CatalogValidationError[],
): CatalogStoreResult<T> {
  return errors === undefined
    ? { ok: false, code, message }
    : { ok: false, code, message, errors };
}

function success<T>(value: T): CatalogStoreResult<T> {
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
  | { status: "error"; result: CatalogStoreResult<CatalogDocument> };

function interpretLuaResult(result: unknown): LuaInterpretation {
  if (result === LUA_OK) {
    return { status: "ok" };
  }

  if (result === LUA_CONFLICT) {
    return {
      status: "error",
      result: failure(
        "revision_conflict",
        "The catalog could not be saved because the expected revision did not match.",
      ),
    };
  }

  if (result === LUA_INVALID_STORED) {
    return {
      status: "error",
      result: failure(
        "invalid_stored_document",
        "The stored catalog document is not usable.",
      ),
    };
  }

  return {
    status: "error",
    result: failure(
      "storage_unavailable",
      "The catalog storage is temporarily unavailable.",
    ),
  };
}

export async function readCatalogDocument(
  client?: CatalogKvClient,
): Promise<CatalogStoreResult<CatalogDocument>> {
  const kvClient = resolveClient(client);

  let stored: unknown | null;
  try {
    stored = await kvClient.get(CATALOG_KV_KEY);
  } catch {
    return failure(
      "storage_unavailable",
      "The catalog storage is temporarily unavailable.",
    );
  }

  if (stored === null || stored === undefined) {
    return failure("not_found", "No catalog document is stored.");
  }

  const normalized = normalizeStoredValue(stored);
  const validation = validateCatalogDocument(normalized);
  if (!validation.ok) {
    return failure(
      "invalid_stored_document",
      "The stored catalog document failed validation.",
      validation.errors,
    );
  }

  return success(validation.value);
}

export async function writeCatalogDocument(
  input: unknown,
  options: {
    expectedRevision: number | null;
    now?: () => Date;
  },
  client?: CatalogKvClient,
): Promise<CatalogStoreResult<CatalogDocument>> {
  const kvClient = resolveClient(client);
  const now = options.now ?? (() => new Date());

  const inputValidation = validateCatalogDocument(input);
  if (!inputValidation.ok) {
    return failure(
      "invalid_input",
      "The catalog document input failed validation.",
      inputValidation.errors,
    );
  }

  const nextRevision =
    options.expectedRevision === null ? 0 : options.expectedRevision + 1;

  const nextDocument: CatalogDocument = {
    ...inputValidation.value,
    revision: nextRevision,
    updatedAt: now().toISOString(),
  };

  const finalValidation = validateCatalogDocument(nextDocument);
  if (!finalValidation.ok) {
    return failure(
      "invalid_input",
      "The catalog document input failed validation.",
      finalValidation.errors,
    );
  }

  if (options.expectedRevision !== null) {
    const existing = await readCatalogDocument(kvClient);
    if (!existing.ok) {
      if (existing.code === "not_found") {
        return failure(
          "revision_conflict",
          "The catalog could not be saved because the expected revision did not match.",
        );
      }
      return existing;
    }

    if (existing.value.revision !== options.expectedRevision) {
      return failure(
        "revision_conflict",
        "The catalog could not be saved because the expected revision did not match.",
      );
    }
  }

  const expectedArg =
    options.expectedRevision === null
      ? EXPECT_ABSENT
      : String(options.expectedRevision);
  const payload = JSON.stringify(finalValidation.value);

  let luaResult: unknown;
  try {
    luaResult = await kvClient.eval(CATALOG_CAS_SCRIPT, [CATALOG_KV_KEY], [
      expectedArg,
      payload,
    ]);
  } catch {
    return failure(
      "storage_unavailable",
      "The catalog storage is temporarily unavailable.",
    );
  }

  const interpreted = interpretLuaResult(luaResult);
  if (interpreted.status === "ok") {
    return success(finalValidation.value);
  }

  return interpreted.result;
}
