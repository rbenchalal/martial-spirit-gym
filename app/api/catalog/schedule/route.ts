import { handleGetPublicSchedule } from "@/lib/catalog/public-schedule-http";
import { readCatalogDocument } from "@/lib/catalog/store";

const dependencies = {
  readCatalog: () => readCatalogDocument(),
};

export async function GET(): Promise<Response> {
  return handleGetPublicSchedule(dependencies);
}
