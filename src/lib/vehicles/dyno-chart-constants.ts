import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/documents/supabase-storage-url";

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

const OWNER_DYNO_CHART_PATH_RE =
  /^\/api\/vehicle\/dyno-chart\/[0-9a-f-]{36}(?:\?.*)?$/i;

/**
 * Map a stored dyno value to the guest-readable showcase URL.
 * Never expose owner-only `/api/vehicle/dyno-chart/*` or legacy file proxies.
 */
export function resolvePublicDynoChartHref(
  vehicleId: string,
  stored: string | null | undefined,
): { href: string | null; isImage: boolean } {
  const trimmed = stored?.trim();
  if (!trimmed) return { href: null, isImage: false };

  if (trimmed.startsWith("/demo/")) {
    return {
      href: trimmed,
      isImage: isDynoChartImageReference(trimmed),
    };
  }

  const publicPath = publicVehicleDynoChartPath(vehicleId);
  const storedPath = resolveStoredDynoChartPath(vehicleId, trimmed);
  const isImage = storedPath
    ? !storedPath.toLowerCase().endsWith(".pdf")
    : isDynoChartImageReference(trimmed);

  if (
    trimmed === publicPath ||
    trimmed.startsWith(`${publicPath}?`) ||
    OWNER_DYNO_CHART_PATH_RE.test(trimmed.split("#")[0] ?? trimmed) ||
    (trimmed.includes("/file?") && trimmed.includes("dyno-chart"))
  ) {
    return {
      href: publicPath,
      isImage,
    };
  }

  return {
    href: publicPath,
    isImage,
  };
}

function isDynoChartImageReference(reference: string): boolean {
  let probe = reference;
  if (reference.includes("/file?")) {
    try {
      const url = reference.startsWith("http")
        ? new URL(reference)
        : new URL(reference, "https://zeloxtag.test");
      const src = url.searchParams.get("src");
      if (src) probe = src;
    } catch {
      // keep probe as reference
    }
  }

  const lower = probe.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".pdf") || lower.includes("application/pdf")) {
    return false;
  }
  return /\.(jpe?g|png|webp|svg)$/.test(lower);
}

/** Owner / Schrauber preview — session proxy, works when the profile is private. */
export function ownerDynoChartDisplayPath(
  vehicleId: string,
  cacheBust?: string | number | null,
): string {
  const version =
    cacheBust == null || cacheBust === ""
      ? Date.now()
      : String(cacheBust);
  return `/api/vehicle/dyno-chart/${vehicleId}?v=${encodeURIComponent(version)}`;
}

/**
 * Resolve a stored dyno value (relative `{vehicleId}/dyno-chart.ext` or a
 * legacy public/authenticated Storage URL) to the object path.
 */
export function resolveStoredDynoChartPath(
  vehicleId: string,
  stored: string | null | undefined,
): string | null {
  const trimmed = stored?.trim();
  if (!trimmed || trimmed.includes("..")) return null;

  const withoutQuery = trimmed.split("?")[0] ?? trimmed;
  if (
    withoutQuery.startsWith(`${vehicleId}/`) &&
    isVehicleDynoChartStoragePath(withoutQuery)
  ) {
    return withoutQuery;
  }

  const fromUrl = storagePathFromPublicOrAuthenticatedUrl(
    trimmed,
    DOCUMENT_BUCKET,
  );
  if (
    fromUrl &&
    fromUrl.startsWith(`${vehicleId}/`) &&
    isVehicleDynoChartStoragePath(fromUrl)
  ) {
    return fromUrl;
  }
  return null;
}

export function resolveOwnerDynoChartViewUrl(
  vehicleId: string,
  stored: string | null | undefined,
): string | null {
  const trimmed = stored?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/demo/") || trimmed.startsWith("/api/")) {
    return trimmed;
  }
  return ownerDynoChartDisplayPath(vehicleId);
}

export { DOCUMENT_BUCKET as DYNO_CHART_BUCKET };
