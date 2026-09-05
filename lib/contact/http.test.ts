import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  handleGetAdminContact,
  handleGetPublicContact,
  type AdminContactGetDependencies,
  type ContactPayload,
  type PublicContactGetDependencies,
} from "./http.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const SAMPLE_CONTACT: ContactPayload = {
  phone: "078 000 00 00",
  email: "contact@example.com",
  address: "Route de Test 1",
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
  overrides: Partial<PublicContactGetDependencies> = {},
): PublicContactGetDependencies & { readCalls: number } {
  const counters = { readCalls: 0 };
  const readContact =
    overrides.readContact ??
    (async () => {
      return { ...SAMPLE_CONTACT };
    });

  return {
    get readCalls() {
      return counters.readCalls;
    },
    async readContact() {
      counters.readCalls += 1;
      return readContact();
    },
  };
}

function createAdminDeps(
  overrides: Partial<AdminContactGetDependencies> = {},
): AdminContactGetDependencies & { authCalls: number; readCalls: number } {
  const counters = { authCalls: 0, readCalls: 0 };
  const requireAdmin = overrides.requireAdmin ?? (async () => true);
  const readContact =
    overrides.readContact ??
    (async () => {
      return { ...SAMPLE_CONTACT };
    });

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
    async readContact() {
      counters.readCalls += 1;
      return readContact();
    },
  };
}

test("public GET returns contact with no-store", async () => {
  const deps = createPublicDeps();
  const response = await handleGetPublicContact(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(body, { contact: SAMPLE_CONTACT });
  assert.equal(deps.readCalls, 1);
});

test("public GET returns null contact", async () => {
  const deps = createPublicDeps({
    async readContact() {
      return null;
    },
  });
  const response = await handleGetPublicContact(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { contact: null });
});

test("public GET store error returns generic 500 with no-store", async () => {
  const deps = createPublicDeps({
    async readContact() {
      throw new Error("KV_REST_API_TOKEN=super-secret-value");
    },
  });
  const response = await handleGetPublicContact(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.equal(body.error, "Impossible de recuperer les donnees Contact.");
  assert.equal(text.includes("super-secret-value"), false);
  assert.equal(text.includes("KV_REST_API_TOKEN"), false);
});

test("admin GET without session returns 401 and never reads store", async () => {
  const deps = createAdminDeps({
    async requireAdmin() {
      return false;
    },
  });
  const response = await handleGetAdminContact(deps);
  const body = await readJson(response);

  assert.equal(response.status, 401);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(body, { error: "Non autorise." });
  assert.equal(deps.authCalls, 1);
  assert.equal(deps.readCalls, 0);
});

test("admin GET authenticated returns contact", async () => {
  const deps = createAdminDeps();
  const response = await handleGetAdminContact(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { contact: SAMPLE_CONTACT });
  assert.equal(deps.readCalls, 1);
});

test("admin GET authenticated returns null contact", async () => {
  const deps = createAdminDeps({
    async readContact() {
      return null;
    },
  });
  const response = await handleGetAdminContact(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { contact: null });
});

test("admin GET store error returns generic 500 with no-store", async () => {
  const deps = createAdminDeps({
    async readContact() {
      throw new Error("provider stack trace");
    },
  });
  const response = await handleGetAdminContact(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assert.equal(body.error, "Impossible de recuperer les donnees Contact.");
  assert.equal(text.includes("provider stack"), false);
});

test("responses do not mutate the store payload", async () => {
  const stored = { ...SAMPLE_CONTACT };
  const deps = createPublicDeps({
    async readContact() {
      return stored;
    },
  });
  const response = await handleGetPublicContact(deps);
  const body = (await readJson(response)) as {
    contact: ContactPayload;
  };

  body.contact.phone = "mutated";
  assert.equal(stored.phone, SAMPLE_CONTACT.phone);
});

test("public consumers use /api/public/contact only", () => {
  const files = [
    "components/sections/Hero.tsx",
    "components/sections/Contact.tsx",
    "components/layout/Footer.tsx",
  ];

  for (const relative of files) {
    const source = readFileSync(path.join(repoRoot, relative), "utf8");
    assert.equal(
      source.includes("/api/public/contact"),
      true,
      `${relative} must fetch /api/public/contact`,
    );
    assert.equal(
      source.includes("/api/admin/contact"),
      false,
      `${relative} must not fetch /api/admin/contact`,
    );
  }
});

test("no public component still uses /api/admin/contact", () => {
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
      source.includes("/api/admin/contact"),
      false,
      `${relative} still references /api/admin/contact`,
    );
  }
});
