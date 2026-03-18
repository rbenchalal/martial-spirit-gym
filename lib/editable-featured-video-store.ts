import { kv } from "@vercel/kv";

export type EditableFeaturedVideo = {
  url: string;
  title: string;
  description: string;
  type: "video";
};

const EDITABLE_FEATURED_VIDEO_KV_KEY = "admin:featured-video";

function normalizeFeaturedVideo(value: EditableFeaturedVideo): EditableFeaturedVideo {
  return {
    url: value.url.trim(),
    title: value.title.trim(),
    description: value.description.trim(),
    type: "video",
  };
}

function isValidFeaturedVideo(value: unknown): value is EditableFeaturedVideo {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditableFeaturedVideo;
  return (
    typeof candidate.url === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    candidate.type === "video"
  );
}

// Lecture de la video en vedette dynamique depuis KV/Redis.
export async function readEditableFeaturedVideo(): Promise<EditableFeaturedVideo | null> {
  const stored = await kv.get<unknown>(EDITABLE_FEATURED_VIDEO_KV_KEY);
  if (!stored || !isValidFeaturedVideo(stored)) {
    return null;
  }

  return normalizeFeaturedVideo({ ...stored });
}

// Ecriture de la video en vedette dynamique dans KV/Redis.
export async function writeEditableFeaturedVideo(
  nextValue: EditableFeaturedVideo | null,
): Promise<EditableFeaturedVideo | null> {
  if (!nextValue) {
    await kv.del(EDITABLE_FEATURED_VIDEO_KV_KEY);
    return null;
  }

  const normalized = normalizeFeaturedVideo({ ...nextValue });
  await kv.set(EDITABLE_FEATURED_VIDEO_KV_KEY, normalized);
  return normalized;
}
