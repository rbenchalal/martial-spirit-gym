import { readEditableSocialLinks } from "@/lib/editable-social-links-store";
import { handleGetPublicSocialLinks } from "@/lib/social-links/http";

export async function GET(): Promise<Response> {
  return handleGetPublicSocialLinks({
    readSocialLinks: () => readEditableSocialLinks(),
  });
}
