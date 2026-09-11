export type ShowroomHeroKind = "none" | "silhouette" | "photo" | "dyno";

export function resolveShowroomHeroKind(
  heroImageSrc: string | null | undefined,
): ShowroomHeroKind {
  const src = heroImageSrc?.trim();
  if (!src) return "none";

  if (src.includes(".svg") || src.includes("dyno-chart")) {
    return "dyno";
  }
  if (src.includes("/api/vehicle/silhouette/")) {
    return "silhouette";
  }
  if (src.includes("/api/public/vehicle/") && src.includes("/file")) {
    return "photo";
  }
  return "photo";
}

/** Multi-layer spatial parallax (not flat dyno charts). */
export function showroomHeroUsesSpatialParallax(kind: ShowroomHeroKind): boolean {
  return kind === "silhouette" || kind === "photo";
}
