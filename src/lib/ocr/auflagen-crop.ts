import type { PixelCrop } from "react-image-crop";

import {
  parseAbeAuflagenNotes,
  type AbeAuflageEntry,
} from "@/lib/ocr/abe-auflagen-from-text";
import { normalizeAuflagenKuerzel } from "@/lib/ocr/auflagen-kuerzel-db";
import { cropImageToJpegFile } from "@/lib/ocr/crop-image";
import { loadImageFromFile } from "@/lib/utils/image-loader";

export type NormalizedAuflagenRegion = {
  code: string;
  top: number;
  left: number;
  bottom: number;
  right: number;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** LLM boxes around just the Kürzel number are too small for a paper snippet. */
export function isUsableAuflagenRegion(region: NormalizedAuflagenRegion): boolean {
  const width = region.right - region.left;
  const height = region.bottom - region.top;
  return width >= 0.35 && height >= 0.18 && width * height >= 0.1;
}

function fullBleedCrop(image: HTMLImageElement): PixelCrop {
  return {
    unit: "px",
    x: Math.round(image.naturalWidth * 0.02),
    y: Math.round(image.naturalHeight * 0.02),
    width: Math.max(1, Math.round(image.naturalWidth * 0.96)),
    height: Math.max(1, Math.round(image.naturalHeight * 0.96)),
  };
}

export function parseAuflagenRegions(raw: unknown): NormalizedAuflagenRegion[] {
  if (!Array.isArray(raw)) return [];

  const out: NormalizedAuflagenRegion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const code = normalizeAuflagenKuerzel(
      typeof record.code === "string" ? record.code : "",
    );
    if (!code) continue;

    const top = clamp01(Number(record.top));
    const left = clamp01(Number(record.left));
    const bottom = clamp01(Number(record.bottom));
    const right = clamp01(Number(record.right));
    if (bottom <= top || right <= left) continue;

    out.push({ code, top, left, bottom, right });
  }

  return out;
}

function normalizedRegionToPixelCrop(
  image: HTMLImageElement,
  region: NormalizedAuflagenRegion,
): PixelCrop {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const x = Math.round(region.left * width);
  const y = Math.round(region.top * height);
  const cropWidth = Math.max(1, Math.round((region.right - region.left) * width));
  const cropHeight = Math.max(1, Math.round((region.bottom - region.top) * height));

  return {
    unit: "px",
    x,
    y,
    width: Math.min(cropWidth, width - x),
    height: Math.min(cropHeight, height - y),
  };
}

/** Codes that should use the full photo (one Auflage per scan). */
export function resolveFullBleedAuflagenCodes(
  entries: readonly AbeAuflageEntry[],
  targetSet: ReadonlySet<string>,
  primaryTargetCode?: string | null,
): string[] {
  const primary = primaryTargetCode
    ? normalizeAuflagenKuerzel(primaryTargetCode)
    : "";
  if (primary && targetSet.has(primary)) {
    return [primary];
  }

  const matchedEntries = entries.filter((entry) =>
    targetSet.has(normalizeAuflagenKuerzel(entry.code)),
  );
  if (matchedEntries.length === 1) {
    return [normalizeAuflagenKuerzel(matchedEntries[0]!.code)];
  }

  if (entries.length === 1) {
    const only = normalizeAuflagenKuerzel(entries[0]!.code);
    if (targetSet.has(only)) return [only];
  }

  return [];
}

export async function cropAuflagenSnippetsFromPhoto(
  file: File,
  notes: string,
  targetCodes: readonly string[],
  regions: readonly NormalizedAuflagenRegion[] = [],
  primaryTargetCode?: string | null,
): Promise<Map<string, File>> {
  const image = await loadImageFromFile(file);
  const entries = parseAbeAuflagenNotes(notes, [...targetCodes], {
    strict: true,
  });
  const notedCodes = new Set(
    entries.map((entry) => normalizeAuflagenKuerzel(entry.code)).filter(Boolean),
  );
  const targetSet = new Set(
    targetCodes
      .map((code) => normalizeAuflagenKuerzel(code))
      .filter((code) => notedCodes.size === 0 || notedCodes.has(code)),
  );
  const crops = new Map<string, File>();

  async function addFullBleed(code: string): Promise<void> {
    const normalized = normalizeAuflagenKuerzel(code);
    if (!normalized || crops.has(normalized)) return;
    crops.set(
      normalized,
      await cropImageToJpegFile(
        image,
        fullBleedCrop(image),
        `auflage-${normalized}.jpg`,
      ),
    );
  }

  const fullBleedCodes = resolveFullBleedAuflagenCodes(
    entries,
    targetSet,
    primaryTargetCode,
  );
  if (fullBleedCodes.length > 0) {
    for (const code of fullBleedCodes) {
      await addFullBleed(code);
    }
    return crops;
  }

  for (const region of regions) {
    if (!targetSet.has(region.code)) continue;
    if (crops.has(region.code)) continue;
    if (!isUsableAuflagenRegion(region)) continue;

    const pixelCrop = normalizedRegionToPixelCrop(image, region);
    if (pixelCrop.width < 48 || pixelCrop.height < 48) continue;

    crops.set(
      region.code,
      await cropImageToJpegFile(
        image,
        pixelCrop,
        `auflage-${region.code}.jpg`,
      ),
    );
  }

  const missingCodes = [...targetSet].filter((code) => !crops.has(code));
  if (missingCodes.length === 0) return crops;

  for (const code of missingCodes) {
    await addFullBleed(code);
  }

  return crops;
}
