import { handleGetPublicDocument } from "@/lib/public-documents/public-http";
import { readPublicDocumentsState } from "@/lib/public-documents/store";

export async function GET(request: Request): Promise<Response> {
  return handleGetPublicDocument(request, "terms-and-conditions", {
    readState: () => readPublicDocumentsState(),
  });
}
