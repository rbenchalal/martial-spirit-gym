import { requireAdminSession } from "@/lib/admin-session";
import { handleGetAdminPublicDocuments } from "@/lib/public-documents/admin-http";
import { readPublicDocumentsState } from "@/lib/public-documents/store";

export async function GET(request: Request): Promise<Response> {
  return handleGetAdminPublicDocuments({
    requireAdmin: async () => requireAdminSession(request) === null,
    readState: () => readPublicDocumentsState(),
  });
}
