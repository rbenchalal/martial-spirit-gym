import { readEditableGallery } from "@/lib/editable-gallery-store";
import { handleGetPublicGallery } from "@/lib/gallery/http";

export async function GET(): Promise<Response> {
  return handleGetPublicGallery({
    readGallery: () => readEditableGallery(),
  });
}
