import type { Metadata } from "next";

import { getSiteUrl } from "./site-url";

export const DEFAULT_OG_DESCRIPTION =
  "Digitale Fahrzeugakte per QR-Code — Rechnungen, ABE, TÜV und Service sicher verwalten.";

export const SHOWCASE_OG_DESCRIPTION =
  "Öffentliches Fahrzeugprofil — Specs, Galerie und Umbauten.";

type OpenGraphInput = {
  title: string;
  description: string;
  /** Path only, e.g. `/demo` */
  path?: string;
  /** Absolute path to OG image route, e.g. `/opengraph-image` */
  imagePath?: string;
};

export function buildOpenGraph(
  input: OpenGraphInput,
): NonNullable<Metadata["openGraph"]> {
  const origin = getSiteUrl();
  const pageUrl = input.path ? `${origin}${input.path}` : origin;
  const imagePath = input.imagePath ?? "/opengraph-image";
  const imageUrl = imagePath.startsWith("http")
    ? imagePath
    : `${origin}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;

  return {
    title: input.title,
    description: input.description,
    url: pageUrl,
    siteName: "ZeloxTag",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: input.title,
      },
    ],
  };
}

export function buildTwitterCard(input: {
  title: string;
  description: string;
  imagePath?: string;
}): NonNullable<Metadata["twitter"]> {
  const origin = getSiteUrl();
  const imagePath = input.imagePath ?? "/opengraph-image";
  const imageUrl = `${origin}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;

  return {
    card: "summary_large_image",
    title: input.title,
    description: input.description,
    images: [imageUrl],
  };
}

export function pageSocialMetadata(input: OpenGraphInput): Pick<
  Metadata,
  "openGraph" | "twitter"
> {
  return {
    openGraph: buildOpenGraph(input),
    twitter: buildTwitterCard(input),
  };
}
