import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  handleGetAdminConditioning,
  handleGetPublicConditioning,
  type AdminConditioningGetDependencies,
  type ConditioningPayload,
  type PublicConditioningGetDependencies,
} from "./http.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const SAMPLE_CONDITIONING: ConditioningPayload = {
  title: "Martial Spirit Conditioning",
  description: "Preparation physique orientee performance.",
};

async function readJson(response: Response): Promise<unknown> {
  return JSON.parse(await response.text()) as unknown;
}

function assertNoStore(response: Response) {
  assert.equal(response.headers.get("Cache-Control"), "no-store");
}

function assertJsonContentType(response: Response) {
  assert.match(
    response.headers.get("Content-Type") ?? "",
    /^application\/json/,
  );
}

function createPublicDeps(
  overrides: Partial<PublicConditioningGetDependencies> = {},
): PublicConditioningGetDependencies & { readCalls: number } {
  const counters = { readCalls: 0 };
  const readConditioning =
    overrides.readConditioning ??
    (async () => ({ ...SAMPLE_CONDITIONING }));

  return {
    get readCalls() {
      return counters.readCalls;
    },
    async readConditioning() {
      counters.readCalls += 1;
      return readConditioning();
    },
  };
}

function createAdminDeps(
  overrides: Partial<AdminConditioningGetDependencies> = {},
): AdminConditioningGetDependencies & {
  authCalls: number;
  readCalls: number;
} {
  const counters = { authCalls: 0, readCalls: 0 };
  const requireAdmin = overrides.requireAdmin ?? (async () => true);
  const readConditioning =
    overrides.readConditioning ??
    (async () => ({ ...SAMPLE_CONDITIONING }));

  return {
    get authCalls() {
      return counters.authCalls;
    },
    get readCalls() {
      return counters.readCalls;
    },
    async requireAdmin() {
      counters.authCalls += 1;
      return requireAdmin();
    },
    async readConditioning() {
      counters.readCalls += 1;
      return readConditioning();
    },
  };
}

test("public GET returns conditioning with no-store", async () => {
  const deps = createPublicDeps();
  const response = await handleGetPublicConditioning(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(body, { conditioning: SAMPLE_CONDITIONING });
  assert.equal(deps.readCalls, 1);
});

test("public GET returns null conditioning", async () => {
  const deps = createPublicDeps({
    async readConditioning() {
      return null;
    },
  });
  const response = await handleGetPublicConditioning(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { conditioning: null });
});

test("public GET store error returns generic 500 with no-store", async () => {
  const deps = createPublicDeps({
    async readConditioning() {
      throw new Error("KV_REST_API_TOKEN=super-secret-value");
    },
  });
  const response = await handleGetPublicConditioning(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.equal(body.error, "Impossible de recuperer les donnees Conditioning.");
  assert.equal(text.includes("super-secret-value"), false);
  assert.equal(text.includes("KV_REST_API_TOKEN"), false);
});

test("admin GET without session returns 401 and never reads store", async () => {
  const deps = createAdminDeps({
    async requireAdmin() {
      return false;
    },
  });
  const response = await handleGetAdminConditioning(deps);
  const body = await readJson(response);

  assert.equal(response.status, 401);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(body, { error: "Non autorise." });
  assert.equal(deps.authCalls, 1);
  assert.equal(deps.readCalls, 0);
});

test("admin GET authenticated returns conditioning", async () => {
  const deps = createAdminDeps();
  const response = await handleGetAdminConditioning(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { conditioning: SAMPLE_CONDITIONING });
  assert.equal(deps.authCalls, 1);
  assert.equal(deps.readCalls, 1);
});

test("admin GET authenticated returns null conditioning", async () => {
  const deps = createAdminDeps({
    async readConditioning() {
      return null;
    },
  });
  const response = await handleGetAdminConditioning(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { conditioning: null });
});

test("admin GET store error returns generic 500 with no-store", async () => {
  const deps = createAdminDeps({
    async readConditioning() {
      throw new Error("provider stack trace");
    },
  });
  const response = await handleGetAdminConditioning(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assert.equal(body.error, "Impossible de recuperer les donnees Conditioning.");
  assert.equal(text.includes("provider stack"), false);
});

test("responses do not mutate the store payload", async () => {
  const stored = { ...SAMPLE_CONDITIONING };
  const deps = createPublicDeps({
    async readConditioning() {
      return stored;
    },
  });
  const response = await handleGetPublicConditioning(deps);
  const body = (await readJson(response)) as {
    conditioning: ConditioningPayload;
  };

  body.conditioning.title = "mutated";
  assert.equal(stored.title, SAMPLE_CONDITIONING.title);
});

test("Conditioning.tsx uses /api/public/conditioning only", () => {
  const source = readFileSync(
    path.join(repoRoot, "components/sections/Conditioning.tsx"),
    "utf8",
  );
  assert.equal(source.includes("/api/public/conditioning"), true);
  assert.equal(source.includes("/api/admin/conditioning"), false);
});

test("no public component still uses /api/admin/conditioning", () => {
  const publicSources = [
    "components/sections/Hero.tsx",
    "components/sections/Contact.tsx",
    "components/layout/Footer.tsx",
    "components/sections/Schedule.tsx",
    "components/sections/Gallery.tsx",
    "components/sections/Conditioning.tsx",
  ];

  for (const relative of publicSources) {
    const source = readFileSync(path.join(repoRoot, relative), "utf8");
    assert.equal(
      source.includes("/api/admin/conditioning"),
      false,
      `${relative} still references /api/admin/conditioning`,
    );
  }
});

test("admin page still uses /api/admin/conditioning", () => {
  const source = readFileSync(path.join(repoRoot, "app/admin/page.tsx"), "utf8");
  assert.equal(source.includes("/api/admin/conditioning"), true);
  assert.equal(source.includes("/api/public/conditioning"), false);
});

test("admin conditioning route keeps POST and protects GET", () => {
  const source = readFileSync(
    path.join(repoRoot, "app/api/admin/conditioning/route.ts"),
    "utf8",
  );
  assert.equal(source.includes("handleGetAdminConditioning"), true);
  assert.equal(source.includes("export async function POST"), true);
  assert.equal(source.includes("writeEditableConditioning"), true);
});
