import { resolveApiBaseUrl } from "@/lib/api/resolve-api-base-url";
import { showcaseVehicleFocusImageClassName } from "@/lib/image/showcase-vehicle-focus-image";
import { isOpaqueCatalogPhotoSrc } from "@/lib/vehicles/vehicle-image";

function isSameOriginOrConfiguredApiBase(
  resolved: string,
  windowOrigin: string,
): boolean {
  try {
    const url = new URL(resolved, windowOrigin);
    if (url.origin === windowOrigin) {
      return true;
    }
    const apiBase = resolveApiBaseUrl();
    if (apiBase) {
      return url.origin === new URL(apiBase).origin;
    }
  } catch {
    return false;
  }
  return false;
}

/** html-to-image: same-origin imgs must not use anonymous CORS (drops session cookies). */
export function shareCardImageCrossOrigin(
  src: string | undefined,
  fetchUrl?: string,
): "anonymous" | undefined {
  const resolved = fetchUrl?.trim() || src?.trim();
  if (!resolved || resolved.startsWith("data:") || resolved.startsWith("blob:")) {
    return undefined;
  }
  if (resolved.startsWith("/")) {
    return undefined;
  }
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    if (isSameOriginOrConfiguredApiBase(resolved, origin)) {
      return undefined;
    }
  } catch {
    return "anonymous";
  }
  return "anonymous";
}

export function isShareCardCatalogCutout(src: string | undefined): boolean {
  return Boolean(src?.includes("/api/vehicle/catalog/"));
}

/** Transparent catalog cutout only — owner photos & silhouettes use showroom cover. */
export function isShareCardCutoutHero(src: string | undefined): boolean {
  const trimmed = src?.trim();
  if (!trimmed) return false;
  if (!isShareCardCatalogCutout(trimmed)) return false;
  return !isOpaqueCatalogPhotoSrc(trimmed);
}

export function shareCardHeroImageClassName(
  src: string | undefined,
  variant: "showcase" | "rank" = "showcase",
): string {
  if (variant === "rank") {
    return "absolute inset-0 h-full w-full object-cover object-[50%_48%] scale-[1.06]";
  }

  const focus = showcaseVehicleFocusImageClassName(src ?? "", "showroomHero");
  const opaqueScale = isOpaqueCatalogPhotoSrc(src) ? "scale-[1.07]" : "";
  return `absolute inset-0 h-full w-full ${focus} ${opaqueScale}`.trim();
}
