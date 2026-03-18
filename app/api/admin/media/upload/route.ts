import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_COOKIE_VALUE = "authenticated";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-m4v",
];

function sanitizeFilename(name: string) {
  return name.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
}

function buildAdminMediaPathname(pathname: string) {
  const normalized = pathname.replace(/^\/+/, "");
  const name = normalized.startsWith("admin-media/")
    ? normalized.slice("admin-media/".length)
    : normalized;

  return `admin-media/${sanitizeFilename(name)}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie !== SESSION_COOKIE_VALUE) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Requete upload invalide." }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const isImage = /\.(png|jpe?g|webp|gif|avif)$/i.test(pathname);
        const isVideo = /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(pathname);

        if (!isImage && !isVideo) {
          throw new Error("Seuls les fichiers image et video sont autorises.");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: true,
          pathname: buildAdminMediaPathname(pathname),
        };
      },
      onUploadCompleted: async () => {
        // No-op for now.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur pendant la preparation de l'upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
