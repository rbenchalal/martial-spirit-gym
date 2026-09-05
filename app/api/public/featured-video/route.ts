import { readEditableFeaturedVideo } from "@/lib/editable-featured-video-store";
import { handleGetPublicFeaturedVideo } from "@/lib/featured-video/http";

export async function GET(): Promise<Response> {
  return handleGetPublicFeaturedVideo({
    readFeaturedVideo: () => readEditableFeaturedVideo(),
  });
}
