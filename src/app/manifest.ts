import type { MetadataRoute } from "next";

import { DEFAULT_OG_DESCRIPTION } from "@/lib/seo/open-graph";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZeloxTag",
    short_name: "ZeloxTag",
    description: DEFAULT_OG_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ececea",
    theme_color: "#ececea",
    lang: "de",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
