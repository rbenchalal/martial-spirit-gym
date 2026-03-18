import { NextResponse } from "next/server";
import {
  readEditableFeaturedVideo,
  writeEditableFeaturedVideo,
  type EditableFeaturedVideo,
} from "@/lib/editable-featured-video-store";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
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

function hasRequiredContent(value: EditableFeaturedVideo) {
  return (
    value.url.trim().length > 0 &&
    value.title.trim().length > 0 &&
    value.description.trim().length > 0
  );
}

export async function GET() {
  try {
    const featuredVideo = await readEditableFeaturedVideo();
    return NextResponse.json({
      featuredVideo,
    });
  } catch (error) {
    console.error("Failed to read featured video", error);
    return jsonError("Impossible de recuperer la video en vedette.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { featuredVideo?: unknown | null };
    const nextValue = body?.featuredVideo;

    if (nextValue !== null && nextValue !== undefined && !isValidFeaturedVideo(nextValue)) {
      return jsonError("Le format de la video en vedette est invalide.", 400);
    }

    if (nextValue && !hasRequiredContent(nextValue as EditableFeaturedVideo)) {
      return jsonError("La video en vedette doit inclure url, titre et description.", 400);
    }

    const featuredVideo = await writeEditableFeaturedVideo(
      nextValue ? (nextValue as EditableFeaturedVideo) : null,
    );

    return NextResponse.json({
      featuredVideo,
      message: featuredVideo
        ? "Video en vedette mise a jour."
        : "Video en vedette retiree.",
    });
  } catch (error) {
    console.error("Failed to write featured video", error);
    return jsonError("Impossible de mettre a jour la video en vedette.", 500);
  }
}
