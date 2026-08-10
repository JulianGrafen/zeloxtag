import QRCode from "qrcode";

import { buildPublicProfileUrl } from "./formatters";

/** PNG data URI for embedding in @react-pdf/renderer `<Image />`. */
export async function generateExposeQrDataUri(
  publicSlug: string | null,
): Promise<string> {
  const url = buildPublicProfileUrl(publicSlug);
  return QRCode.toDataURL(url, {
    width: 256,
    margin: 1,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
}
