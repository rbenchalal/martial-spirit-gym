export type GalleryItemPayload = {
  url: string;
  type: "image" | "video";
  title: string;
  alt: string;
};

export type GalleryGetSuccessBody = {
  gallery: GalleryItemPayload[];
};

export type GalleryGetErrorBody = {
  error: string;
};

export type PublicGalleryGetDependencies = {
  readGallery: () => Promise<GalleryItemPayload[]>;
};

export type AdminGalleryGetDependencies = PublicGalleryGetDependencies & {
  requireAdmin: () => boolean | Promise<boolean>;
};

const CACHE_CONTROL_NO_STORE = "no-store";
const READ_ERROR_MESSAGE = "Impossible de recuperer la galerie dynamique.";
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

function gallerySuccessBody(gallery: GalleryItemPayload[]): GalleryGetSuccessBody {
  return {
    gallery: gallery.map((item) => ({
      url: item.url,
      type: item.type,
      title: item.title,
      alt: item.alt,
    })),
  };
}

/**
 * Shared GET serialization for public and admin gallery reads.
 * No KV, Blob or session imports — callers inject read/auth.
 */
async function handleGetGalleryRead(
  readGallery: () => Promise<GalleryItemPayload[]>,
): Promise<Response> {
  try {
    const gallery = await readGallery();
    return jsonResponse(200, gallerySuccessBody(gallery));
  } catch {
    return jsonResponse(500, {
      error: READ_ERROR_MESSAGE,
    } satisfies GalleryGetErrorBody);
  }
}

export async function handleGetPublicGallery(
  dependencies: PublicGalleryGetDependencies,
): Promise<Response> {
  return handleGetGalleryRead(dependencies.readGallery);
}

export async function handleGetAdminGallery(
  dependencies: AdminGalleryGetDependencies,
): Promise<Response> {
  let isAdmin: boolean;
  try {
    isAdmin = await dependencies.requireAdmin();
  } catch {
    return jsonResponse(500, {
      error: READ_ERROR_MESSAGE,
    } satisfies GalleryGetErrorBody);
  }

  if (!isAdmin) {
    return jsonResponse(401, {
      error: UNAUTHORIZED_MESSAGE,
    } satisfies GalleryGetErrorBody);
  }

  return handleGetGalleryRead(dependencies.readGallery);
}
