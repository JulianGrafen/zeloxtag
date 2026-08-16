import { DOCUMENT_BUCKET } from "@/lib/documents/constants";

export const DYNO_CHART_FILE_STEM = "dyno-chart" as const;

export const DYNO_CHART_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
] as const;

export type DynoChartExtension = (typeof DYNO_CHART_EXTENSIONS)[number];

const MIME_TO_EXT: Record<string, DynoChartExtension> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const EXT_TO_CONTENT_TYPE: Record<DynoChartExtension, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const DYNO_CHART_PATH_RE = /\/dyno-chart\.(pdf|jpe?g|png|webp)$/i;

export function dynoChartExtensionForMime(mime: string): DynoChartExtension {
  return MIME_TO_EXT[mime.toLowerCase().trim()] ?? "jpg";
}

/** Canonical object name — one dyno chart per vehicle (PDF or image). */
export function vehicleDynoChartObjectPath(
  vehicleId: string,
  mime = "application/pdf",
): string {
  return `${vehicleId}/${DYNO_CHART_FILE_STEM}.${dynoChartExtensionForMime(mime)}`;
}

export function vehicleDynoChartCandidatePaths(vehicleId: string): string[] {
  return DYNO_CHART_EXTENSIONS.map(
    (ext) => `${vehicleId}/${DYNO_CHART_FILE_STEM}.${ext}`,
  );
}

export function isVehicleDynoChartStoragePath(storagePath: string): boolean {
  return DYNO_CHART_PATH_RE.test(storagePath);
}

export function dynoChartContentTypeFromPath(storagePath: string): string {
  const match = storagePath.toLowerCase().match(/\.([a-z]+)$/);
  const ext = (match?.[1] ?? "pdf") as DynoChartExtension;
  return EXT_TO_CONTENT_TYPE[ext] ?? "application/octet-stream";
}

/** Guest-readable dyno file on the public showcase. */
export function publicVehicleDynoChartPath(vehicleId: string): string {
  return `/api/public/vehicle/${vehicleId}/dyno-chart`;
}

export { DOCUMENT_BUCKET as DYNO_CHART_BUCKET };
