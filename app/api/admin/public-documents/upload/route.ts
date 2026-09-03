import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { requireAdminSession } from "@/lib/admin-session";
import {
  readPublicDocumentsState,
  writePublicDocumentsState,
} from "@/lib/public-documents/store";
import { handleUploadAdminPublicDocument } from "@/lib/public-documents/upload-handler";

export async function POST(request: Request): Promise<Response> {
  return handleUploadAdminPublicDocument(request, {
    requireAdmin: async () => requireAdminSession(request) === null,
    readState: () => readPublicDocumentsState(),
    writeState: (state, options) => writePublicDocumentsState(state, options),
    putPdf: async (pathname, bytes) => {
      const result = await put(pathname, Buffer.from(bytes), {
        access: "public",
        contentType: "application/pdf",
        addRandomSuffix: false,
      });
      return {
        url: result.url,
        pathname: result.pathname,
      };
    },
    createIdentifier: () => randomUUID(),
    now: () => new Date(),
  });
}
