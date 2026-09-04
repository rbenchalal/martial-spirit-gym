import { requireAdminSession } from "@/lib/admin-session";
import {
  handleGetAdminPublicTariffs,
  handlePutAdminPublicTariffs,
} from "@/lib/tarifs/admin-http";
import {
  readManagedPublicTariffsDocument,
  writeManagedPublicTariffsDocument,
} from "@/lib/tarifs/managed-store";

export async function GET(request: Request): Promise<Response> {
  return handleGetAdminPublicTariffs({
    requireAdmin: async () => requireAdminSession(request) === null,
    readDocument: () => readManagedPublicTariffsDocument(),
  });
}

export async function PUT(request: Request): Promise<Response> {
  return handlePutAdminPublicTariffs(request, {
    requireAdmin: async () => requireAdminSession(request) === null,
    writeDocument: (document, options) =>
      writeManagedPublicTariffsDocument(document, options),
    now: () => new Date(),
  });
}
