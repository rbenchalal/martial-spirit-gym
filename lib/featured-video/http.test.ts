import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  handleGetAdminFeaturedVideo,
  handleGetPublicFeaturedVideo,
  type AdminFeaturedVideoGetDependencies,
  type FeaturedVideoPayload,
  type PublicFeaturedVideoGetDependencies,
} from "./http.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const SAMPLE_VIDEO: FeaturedVideoPayload = {
  url: "https://example.com/video.mp4",
  title: "Training",
  description: "Apercu des seances",
  type: "video",
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
  overrides: Partial<PublicFeaturedVideoGetDependencies> = {},
): PublicFeaturedVideoGetDependencies & { readCalls: number } {
  const counters = { readCalls: 0 };
  const readFeaturedVideo =
    overrides.readFeaturedVideo ?? (async () => ({ ...SAMPLE_VIDEO }));

  return {
    get readCalls() {
      return counters.readCalls;
    },
    async readFeaturedVideo() {
      counters.readCalls += 1;
      return readFeaturedVideo();
    },
  };
}

function createAdminDeps(
  overrides: Partial<AdminFeaturedVideoGetDependencies> = {},
): AdminFeaturedVideoGetDependencies & {
  authCalls: number;
  readCalls: number;
} {
  const counters = { authCalls: 0, readCalls: 0 };
  const requireAdmin = overrides.requireAdmin ?? (async () => true);
  const readFeaturedVideo =
    overrides.readFeaturedVideo ?? (async () => ({ ...SAMPLE_VIDEO }));

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
    async readFeaturedVideo() {
      counters.readCalls += 1;
      return readFeaturedVideo();
    },
  };
}

test("public GET returns featured video with no-store", async () => {
  const deps = createPublicDeps();
  const response = await handleGetPublicFeaturedVideo(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(body, { featuredVideo: SAMPLE_VIDEO });
  assert.equal(deps.readCalls, 1);
});

test("public GET returns null featured video", async () => {
  const deps = createPublicDeps({
    async readFeaturedVideo() {
      return null;
    },
  });
  const response = await handleGetPublicFeaturedVideo(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { featuredVideo: null });
});

test("public GET store error returns generic 500 with no-store", async () => {
  const deps = createPublicDeps({
    async readFeaturedVideo() {
      throw new Error("BLOB_READ_WRITE_TOKEN=super-secret-value");
    },
  });
  const response = await handleGetPublicFeaturedVideo(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.equal(body.error, "Impossible de recuperer la video en vedette.");
  assert.equal(text.includes("super-secret-value"), false);
});

test("admin GET without session returns 401 and never reads store", async () => {
  const deps = createAdminDeps({
    async requireAdmin() {
      return false;
    },
  });
  const response = await handleGetAdminFeaturedVideo(deps);
  const body = await readJson(response);

  assert.equal(response.status, 401);
  assertNoStore(response);
  assert.deepEqual(body, { error: "Non autorise." });
  assert.equal(deps.authCalls, 1);
  assert.equal(deps.readCalls, 0);
});

test("admin GET authenticated returns featured video", async () => {
  const deps = createAdminDeps();
  const response = await handleGetAdminFeaturedVideo(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { featuredVideo: SAMPLE_VIDEO });
  assert.equal(deps.readCalls, 1);
});

test("admin GET authenticated returns null featured video", async () => {
  const deps = createAdminDeps({
    async readFeaturedVideo() {
      return null;
    },
  });
  const response = await handleGetAdminFeaturedVideo(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { featuredVideo: null });
});

test("admin GET store error returns generic 500 with no-store", async () => {
  const deps = createAdminDeps({
    async readFeaturedVideo() {
      throw new Error("provider stack trace");
    },
  });
  const response = await handleGetAdminFeaturedVideo(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assert.equal(body.error, "Impossible de recuperer la video en vedette.");
  assert.equal(text.includes("provider stack"), false);
});

test("responses do not mutate the store payload", async () => {
  const stored = { ...SAMPLE_VIDEO };
  const deps = createPublicDeps({
    async readFeaturedVideo() {
      return stored;
    },
  });
  const response = await handleGetPublicFeaturedVideo(deps);
  const body = (await readJson(response)) as {
    featuredVideo: FeaturedVideoPayload;
  };

  body.featuredVideo.url = "https://mutated.example/";
  assert.equal(stored.url, SAMPLE_VIDEO.url);
});

test("admin featured-video route keeps POST and protects GET", () => {
  const source = readFileSync(
    path.join(repoRoot, "app/api/admin/featured-video/route.ts"),
    "utf8",
  );
  assert.equal(source.includes("handleGetAdminFeaturedVideo"), true);
  assert.equal(source.includes("export async function POST"), true);
  assert.equal(source.includes("writeEditableFeaturedVideo"), true);
});
