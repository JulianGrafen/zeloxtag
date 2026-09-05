import type { MetadataRoute } from "next";

import { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from "@/lib/pwa/constants";
import { DEFAULT_OG_DESCRIPTION } from "@/lib/seo/open-graph";

export { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR };

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZeloxTag",
    short_name: "ZeloxTag",
    description: DEFAULT_OG_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    lang: "de",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
