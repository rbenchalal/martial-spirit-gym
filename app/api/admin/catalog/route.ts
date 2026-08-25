import { requireAdminSession } from "@/lib/admin-session";
import {
  handleGetCatalog,
  handlePutCatalog,
} from "@/lib/catalog/admin-http";
import {
  readCatalogDocument,
  writeCatalogDocument,
} from "@/lib/catalog/store";

const dependencies = {
  authenticate: requireAdminSession,
  readCatalog: () => readCatalogDocument(),
  writeCatalog: (
    document: unknown,
    options: { expectedRevision: number | null },
  ) => writeCatalogDocument(document, options),
};

export async function GET(request: Request): Promise<Response> {
  return handleGetCatalog(request, dependencies);
}

export async function PUT(request: Request): Promise<Response> {
  return handlePutCatalog(request, dependencies);
}
