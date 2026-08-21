import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo/site-url";

const PUBLIC_PATHS = ["/", "/demo", "/impressum", "/datenschutz", "/agb"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: path === "/" ? origin : `${origin}${path}`,
    lastModified,
    changeFrequency: path === "/" || path === "/demo" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/demo" ? 0.8 : 0.4,
  }));
}
