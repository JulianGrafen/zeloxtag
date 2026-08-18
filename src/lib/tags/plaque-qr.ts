import QRCode from "qrcode";

const TAG_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PLAQUE_QR_OPTIONS = {
  margin: 2,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#0a0a0a", light: "#ffffff" },
};

export function isPlaqueTagUuid(uuid: string): boolean {
  return TAG_UUID_RE.test(uuid.trim());
}

export function plaqueScanUrl(origin: string, uuid: string): string {
  const base = origin.trim().replace(/\/$/, "");
  const id = uuid.trim();
  if (!base || !isPlaqueTagUuid(id)) {
    throw new Error("Ungültige Scan-URL für die Plaque.");
  }
  return `${base}/v/${id}`;
}

export function plaqueSvgFilename(uuid: string): string {
  return `zeloxtag-${uuid.trim()}.svg`;
}

export function plaquePngFilename(uuid: string): string {
  return `zeloxtag-${uuid.trim()}.png`;
}

export async function renderPlaqueQrSvg(scanUrl: string): Promise<string> {
  return QRCode.toString(scanUrl, {
    type: "svg",
    ...PLAQUE_QR_OPTIONS,
  });
}

export async function renderPlaqueQrPngDataUrl(scanUrl: string): Promise<string> {
  return QRCode.toDataURL(scanUrl, {
    width: 1024,
    ...PLAQUE_QR_OPTIONS,
  });
}
