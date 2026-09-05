export type FeaturedVideoPayload = {
  url: string;
  title: string;
  description: string;
  type: "video";
};

export type FeaturedVideoGetSuccessBody = {
  featuredVideo: FeaturedVideoPayload | null;
};

export type FeaturedVideoGetErrorBody = {
  error: string;
};

export type PublicFeaturedVideoGetDependencies = {
  readFeaturedVideo: () => Promise<FeaturedVideoPayload | null>;
};

export type AdminFeaturedVideoGetDependencies = PublicFeaturedVideoGetDependencies & {
  requireAdmin: () => boolean | Promise<boolean>;
};

const CACHE_CONTROL_NO_STORE = "no-store";
const READ_ERROR_MESSAGE = "Impossible de recuperer la video en vedette.";
const UNAUTHORIZED_MESSAGE = "Non autorise.";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL_NO_STORE,
    },
  });
}

function featuredVideoSuccessBody(
  featuredVideo: FeaturedVideoPayload | null,
): FeaturedVideoGetSuccessBody {
  return {
    featuredVideo:
      featuredVideo === null
        ? null
        : {
            url: featuredVideo.url,
            title: featuredVideo.title,
            description: featuredVideo.description,
            type: "video",
          },
  };
}

/**
 * Shared GET serialization for public and admin featured-video reads.
 * No KV, Blob or session imports — callers inject read/auth.
 */
async function handleGetFeaturedVideoRead(
  readFeaturedVideo: () => Promise<FeaturedVideoPayload | null>,
): Promise<Response> {
  try {
    const featuredVideo = await readFeaturedVideo();
    return jsonResponse(200, featuredVideoSuccessBody(featuredVideo));
  } catch {
    return jsonResponse(500, {
      error: READ_ERROR_MESSAGE,
    } satisfies FeaturedVideoGetErrorBody);
  }
}

export async function handleGetPublicFeaturedVideo(
  dependencies: PublicFeaturedVideoGetDependencies,
): Promise<Response> {
  return handleGetFeaturedVideoRead(dependencies.readFeaturedVideo);
}

export async function handleGetAdminFeaturedVideo(
  dependencies: AdminFeaturedVideoGetDependencies,
): Promise<Response> {
  let isAdmin: boolean;
  try {
    isAdmin = await dependencies.requireAdmin();
  } catch {
    return jsonResponse(500, {
      error: READ_ERROR_MESSAGE,
    } satisfies FeaturedVideoGetErrorBody);
  }

  if (!isAdmin) {
    return jsonResponse(401, {
      error: UNAUTHORIZED_MESSAGE,
    } satisfies FeaturedVideoGetErrorBody);
  }

  return handleGetFeaturedVideoRead(dependencies.readFeaturedVideo);
}
