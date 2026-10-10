/** html-to-image: same-origin imgs must not use anonymous CORS (drops session cookies). */
export function shareCardImageCrossOrigin(
  src: string | undefined,
): "anonymous" | undefined {
  const trimmed = src?.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return undefined;
  }
  if (trimmed.startsWith("/")) {
    return undefined;
  }
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    if (new URL(trimmed, origin).origin === origin) {
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
