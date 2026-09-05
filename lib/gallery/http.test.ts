import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  handleGetAdminGallery,
  handleGetPublicGallery,
  type AdminGalleryGetDependencies,
  type GalleryItemPayload,
  type PublicGalleryGetDependencies,
} from "./http.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const SAMPLE_GALLERY: GalleryItemPayload[] = [
  {
    url: "https://example.com/photo.jpg",
    type: "image",
    title: "Photo",
    alt: "Photo club",
  },
];

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
  overrides: Partial<PublicGalleryGetDependencies> = {},
): PublicGalleryGetDependencies & { readCalls: number } {
  const counters = { readCalls: 0 };
  const readGallery =
    overrides.readGallery ??
    (async () => SAMPLE_GALLERY.map((item) => ({ ...item })));

  return {
    get readCalls() {
      return counters.readCalls;
    },
    async readGallery() {
      counters.readCalls += 1;
      return readGallery();
    },
  };
}

function createAdminDeps(
  overrides: Partial<AdminGalleryGetDependencies> = {},
): AdminGalleryGetDependencies & { authCalls: number; readCalls: number } {
  const counters = { authCalls: 0, readCalls: 0 };
  const requireAdmin = overrides.requireAdmin ?? (async () => true);
  const readGallery =
    overrides.readGallery ??
    (async () => SAMPLE_GALLERY.map((item) => ({ ...item })));

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
    async readGallery() {
      counters.readCalls += 1;
      return readGallery();
    },
  };
}

test("public GET returns gallery with no-store", async () => {
  const deps = createPublicDeps();
  const response = await handleGetPublicGallery(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(body, { gallery: SAMPLE_GALLERY });
  assert.equal(deps.readCalls, 1);
});

test("public GET returns empty gallery array", async () => {
  const deps = createPublicDeps({
    async readGallery() {
      return [];
    },
  });
  const response = await handleGetPublicGallery(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { gallery: [] });
});

test("public GET store error returns generic 500 with no-store", async () => {
  const deps = createPublicDeps({
    async readGallery() {
      throw new Error("KV_REST_API_TOKEN=super-secret-value");
    },
  });
  const response = await handleGetPublicGallery(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.equal(body.error, "Impossible de recuperer la galerie dynamique.");
  assert.equal(text.includes("super-secret-value"), false);
});

test("admin GET without session returns 401 and never reads store", async () => {
  const deps = createAdminDeps({
    async requireAdmin() {
      return false;
    },
  });
  const response = await handleGetAdminGallery(deps);
  const body = await readJson(response);

  assert.equal(response.status, 401);
  assertNoStore(response);
  assert.deepEqual(body, { error: "Non autorise." });
  assert.equal(deps.authCalls, 1);
  assert.equal(deps.readCalls, 0);
});

test("admin GET authenticated returns gallery", async () => {
  const deps = createAdminDeps();
  const response = await handleGetAdminGallery(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { gallery: SAMPLE_GALLERY });
  assert.equal(deps.readCalls, 1);
});

test("admin GET store error returns generic 500 with no-store", async () => {
  const deps = createAdminDeps({
    async readGallery() {
      throw new Error("provider stack trace");
    },
  });
  const response = await handleGetAdminGallery(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assert.equal(body.error, "Impossible de recuperer la galerie dynamique.");
  assert.equal(text.includes("provider stack"), false);
});

test("responses do not mutate the store payload", async () => {
  const stored = SAMPLE_GALLERY.map((item) => ({ ...item }));
  const deps = createPublicDeps({
    async readGallery() {
      return stored;
    },
  });
  const response = await handleGetPublicGallery(deps);
  const body = (await readJson(response)) as { gallery: GalleryItemPayload[] };

  body.gallery[0].url = "https://mutated.example/";
  assert.equal(stored[0].url, SAMPLE_GALLERY[0].url);
});

test("Gallery.tsx uses public gallery and featured-video routes only", () => {
  const source = readFileSync(
    path.join(repoRoot, "components/sections/Gallery.tsx"),
    "utf8",
  );
  assert.equal(source.includes("/api/public/gallery"), true);
  assert.equal(source.includes("/api/public/featured-video"), true);
  assert.equal(source.includes("/api/admin/gallery"), false);
  assert.equal(source.includes("/api/admin/featured-video"), false);
});

test("no public component still uses admin gallery or featured-video", () => {
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
    assert.equal(source.includes("/api/admin/gallery"), false);
    assert.equal(source.includes("/api/admin/featured-video"), false);
  }
});

test("admin page still uses admin gallery and featured-video", () => {
  const source = readFileSync(path.join(repoRoot, "app/admin/page.tsx"), "utf8");
  assert.equal(source.includes("/api/admin/gallery"), true);
  assert.equal(source.includes("/api/admin/featured-video"), true);
  assert.equal(source.includes("/api/public/gallery"), false);
  assert.equal(source.includes("/api/public/featured-video"), false);
});

test("admin gallery route keeps POST and protects GET", () => {
  const source = readFileSync(
    path.join(repoRoot, "app/api/admin/gallery/route.ts"),
    "utf8",
  );
  assert.equal(source.includes("handleGetAdminGallery"), true);
  assert.equal(source.includes("export async function POST"), true);
  assert.equal(source.includes("writeEditableGallery"), true);
});
