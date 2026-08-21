import { ImageResponse } from "next/og";

import { OgImageTemplate } from "@/lib/seo/og-image-template";
import { DEFAULT_OG_DESCRIPTION } from "@/lib/seo/open-graph";

export const alt = "ZeloxTag — digitale Fahrzeugakte";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <OgImageTemplate
        title="Digitale Fahrzeugakte per QR-Scan"
        subtitle={DEFAULT_OG_DESCRIPTION}
      />
    ),
    size,
  );
}
