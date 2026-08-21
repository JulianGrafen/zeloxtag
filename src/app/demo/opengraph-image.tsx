import { ImageResponse } from "next/og";

import { OgImageTemplate } from "@/lib/seo/og-image-template";

export const alt = "ZeloxTag Demo — BMW E36 328i";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function DemoOpenGraphImage() {
  return new ImageResponse(
    (
      <OgImageTemplate
        kicker="Demo"
        title="BMW E36 328i — digitale Akte"
        subtitle="Öffentliche Demo: Belege, ABE, TÜV und Service-Historie."
      />
    ),
    size,
  );
}
