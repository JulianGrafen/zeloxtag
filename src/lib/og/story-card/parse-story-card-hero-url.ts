const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedStoryCardHeroUrl =
  | { kind: "silhouette"; vehicleId: string }
  | { kind: "publicFile"; vehicleId: string; src: string }
  | { kind: "remote"; url: string };

export function parseStoryCardHeroAbsoluteUrl(
  absoluteUrl: string | null | undefined,
): ParsedStoryCardHeroUrl | null {
  const trimmed = absoluteUrl?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const silhouetteMatch = parsed.pathname.match(
      /^\/api\/vehicle\/silhouette\/([^/]+)$/i,
    );
    const silhouetteId = silhouetteMatch?.[1]?.trim() ?? "";
    if (silhouetteId && UUID_RE.test(silhouetteId)) {
      return { kind: "silhouette", vehicleId: silhouetteId };
    }

    const publicFileMatch = parsed.pathname.match(
      /^\/api\/public\/vehicle\/([^/]+)\/file$/i,
    );
    const publicVehicleId = publicFileMatch?.[1]?.trim() ?? "";
    const src = parsed.searchParams.get("src")?.trim() ?? "";
    if (publicVehicleId && UUID_RE.test(publicVehicleId) && src) {
      return { kind: "publicFile", vehicleId: publicVehicleId, src };
    }
  } catch {
    return { kind: "remote", url: trimmed };
  }

  return { kind: "remote", url: trimmed };
}
