import { readEditableContact } from "@/lib/editable-contact-store";
import { handleGetPublicContact } from "@/lib/contact/http";

export async function GET(): Promise<Response> {
  return handleGetPublicContact({
    readContact: () => readEditableContact(),
  });
}
