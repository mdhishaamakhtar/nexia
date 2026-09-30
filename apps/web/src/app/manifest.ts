import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/shared/brand/mark";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexia",
    short_name: "Nexia",
    description: "Your personal digital slambook — capture friends, memories, and connections.",
    start_url: "/profiles",
    display: "standalone",
    background_color: BRAND_COLORS.page,
    theme_color: BRAND_COLORS.paper,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
