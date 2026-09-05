import { readEditableConditioning } from "@/lib/editable-conditioning-store";
import { handleGetPublicConditioning } from "@/lib/conditioning/http";

export async function GET(): Promise<Response> {
  return handleGetPublicConditioning({
    readConditioning: () => readEditableConditioning(),
  });
}
