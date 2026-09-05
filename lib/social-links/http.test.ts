import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  handleGetAdminSocialLinks,
  handleGetPublicSocialLinks,
  type AdminSocialLinksGetDependencies,
  type PublicSocialLinksGetDependencies,
  type SocialLinkPayload,
} from "./http.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const SAMPLE_LINKS: SocialLinkPayload[] = [
  {
    platform: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/example/",
    ariaLabel: "Ouvrir Instagram",
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
  overrides: Partial<PublicSocialLinksGetDependencies> = {},
): PublicSocialLinksGetDependencies & { readCalls: number } {
  const counters = { readCalls: 0 };
  const readSocialLinks =
    overrides.readSocialLinks ??
    (async () => SAMPLE_LINKS.map((link) => ({ ...link })));

  return {
    get readCalls() {
      return counters.readCalls;
    },
    async readSocialLinks() {
      counters.readCalls += 1;
      return readSocialLinks();
    },
  };
}

function createAdminDeps(
  overrides: Partial<AdminSocialLinksGetDependencies> = {},
): AdminSocialLinksGetDependencies & { authCalls: number; readCalls: number } {
  const counters = { authCalls: 0, readCalls: 0 };
  const requireAdmin = overrides.requireAdmin ?? (async () => true);
  const readSocialLinks =
    overrides.readSocialLinks ??
    (async () => SAMPLE_LINKS.map((link) => ({ ...link })));

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
    async readSocialLinks() {
      counters.readCalls += 1;
      return readSocialLinks();
    },
  };
}

test("public GET returns social links with no-store", async () => {
  const deps = createPublicDeps();
  const response = await handleGetPublicSocialLinks(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(body, { socialLinks: SAMPLE_LINKS });
  assert.equal(deps.readCalls, 1);
});

test("public GET returns null social links", async () => {
  const deps = createPublicDeps({
    async readSocialLinks() {
      return null;
    },
  });
  const response = await handleGetPublicSocialLinks(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { socialLinks: null });
});

test("public GET store error returns generic 500 with no-store", async () => {
  const deps = createPublicDeps({
    async readSocialLinks() {
      throw new Error("KV_REST_API_TOKEN=super-secret-value");
    },
  });
  const response = await handleGetPublicSocialLinks(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.equal(body.error, "Impossible de recuperer les reseaux sociaux.");
  assert.equal(text.includes("super-secret-value"), false);
  assert.equal(text.includes("KV_REST_API_TOKEN"), false);
});

test("admin GET without session returns 401 and never reads store", async () => {
  const deps = createAdminDeps({
    async requireAdmin() {
      return false;
    },
  });
  const response = await handleGetAdminSocialLinks(deps);
  const body = await readJson(response);

  assert.equal(response.status, 401);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(body, { error: "Non autorise." });
  assert.equal(deps.authCalls, 1);
  assert.equal(deps.readCalls, 0);
});

test("admin GET authenticated returns social links", async () => {
  const deps = createAdminDeps();
  const response = await handleGetAdminSocialLinks(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { socialLinks: SAMPLE_LINKS });
  assert.equal(deps.authCalls, 1);
  assert.equal(deps.readCalls, 1);
});

test("admin GET authenticated returns null social links", async () => {
  const deps = createAdminDeps({
    async readSocialLinks() {
      return null;
    },
  });
  const response = await handleGetAdminSocialLinks(deps);
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.deepEqual(body, { socialLinks: null });
});

test("admin GET store error returns generic 500 with no-store", async () => {
  const deps = createAdminDeps({
    async readSocialLinks() {
      throw new Error("provider stack trace");
    },
  });
  const response = await handleGetAdminSocialLinks(deps);
  const text = await response.text();
  const body = JSON.parse(text) as { error: string };

  assert.equal(response.status, 500);
  assertNoStore(response);
  assert.equal(body.error, "Impossible de recuperer les reseaux sociaux.");
  assert.equal(text.includes("provider stack"), false);
});

test("responses do not mutate the store payload", async () => {
  const stored = SAMPLE_LINKS.map((link) => ({ ...link }));
  const deps = createPublicDeps({
    async readSocialLinks() {
      return stored;
    },
  });
  const response = await handleGetPublicSocialLinks(deps);
  const body = (await readJson(response)) as {
    socialLinks: SocialLinkPayload[];
  };

  body.socialLinks[0].href = "https://mutated.example/";
  assert.equal(stored[0].href, SAMPLE_LINKS[0].href);
});

test("public consumers use /api/public/social-links only", () => {
  const files = [
    "components/sections/Contact.tsx",
    "components/layout/Footer.tsx",
  ];

  for (const relative of files) {
    const source = readFileSync(path.join(repoRoot, relative), "utf8");
    assert.equal(
      source.includes("/api/public/social-links"),
      true,
      `${relative} must fetch /api/public/social-links`,
    );
    assert.equal(
      source.includes("/api/admin/social-links"),
      false,
      `${relative} must not fetch /api/admin/social-links`,
    );
  }
});

test("no public component still uses /api/admin/social-links", () => {
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
      source.includes("/api/admin/social-links"),
      false,
      `${relative} still references /api/admin/social-links`,
    );
  }
});

test("admin page still uses /api/admin/social-links", () => {
  const source = readFileSync(path.join(repoRoot, "app/admin/page.tsx"), "utf8");
  assert.equal(source.includes("/api/admin/social-links"), true);
  assert.equal(source.includes("/api/public/social-links"), false);
});

test("admin social-links route keeps POST and protects GET", () => {
  const source = readFileSync(
    path.join(repoRoot, "app/api/admin/social-links/route.ts"),
    "utf8",
  );
  assert.equal(source.includes("handleGetAdminSocialLinks"), true);
  assert.equal(source.includes("export async function POST"), true);
  assert.equal(source.includes("writeEditableSocialLinks"), true);
});
