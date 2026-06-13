import { createSocialImage, socialImageAlt, socialImageSize } from "@/shared/lib/social-image";

export const alt = socialImageAlt;
export const size = socialImageSize;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return createSocialImage();
}
