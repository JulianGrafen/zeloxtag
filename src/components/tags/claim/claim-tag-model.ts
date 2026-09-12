export const CLAIM_TAG_GLB_PATH = "/models/zelox-tag.glb";

export function claimTagScanUrl(tagUuid: string): string {
  const id = tagUuid.trim();
  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}/v/${encodeURIComponent(id)}`;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const base = site && !site.includes("localhost") ? site : "https://app.zeloxtag.de";
  return `${base}/v/${encodeURIComponent(id)}`;
}

export function isTagFrontMaterial(materialName: string): boolean {
  if (/tag_back|back_plain|_back/i.test(materialName)) return false;
  return /tripo|front|face/i.test(materialName);
}

export async function claimTagGlbIsAvailable(): Promise<boolean> {
  try {
    const res = await fetch(CLAIM_TAG_GLB_PATH, { method: "GET", cache: "force-cache" });
    return res.ok;
  } catch {
    return false;
  }
}
