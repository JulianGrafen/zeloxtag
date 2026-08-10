import type { PixelCrop } from "react-image-crop";

import {
  parseAbeAuflagenNotes,
  type AbeAuflageEntry,
} from "@/lib/ocr/abe-auflagen-from-text";
import { normalizeAuflagenKuerzel } from "@/lib/ocr/auflagen-kuerzel-db";
import { cropImageToJpegFile } from "@/lib/ocr/crop-image";

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

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    image.src = url;
  });
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

/** Fallback when the model returns no boxes — split by text weight top-to-bottom. */
export function estimateProportionalAuflagenCrops(
  image: HTMLImageElement,
  entries: readonly AbeAuflageEntry[],
): Map<string, PixelCrop> {
  const out = new Map<string, PixelCrop>();
  if (entries.length === 0) return out;

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const marginX = Math.round(width * 0.03);
  const marginY = Math.round(height * 0.02);
  const weights = entries.map((entry) =>
    Math.max(12, entry.text.length + entry.code.length * 4),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  let y = marginY;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!;
    const sliceHeight = Math.max(
      24,
      Math.round((weights[index]! / totalWeight) * (height - marginY * 2)),
    );
    const cropHeight = Math.min(sliceHeight, height - marginY - y);
    out.set(normalizeAuflagenKuerzel(entry.code), {
      unit: "px",
      x: marginX,
      y,
      width: Math.max(1, width - marginX * 2),
      height: Math.max(1, cropHeight),
    });
    y += cropHeight;
  }

  return out;
}

export async function cropAuflagenSnippetsFromPhoto(
  file: File,
  notes: string,
  targetCodes: readonly string[],
  regions: readonly NormalizedAuflagenRegion[] = [],
): Promise<Map<string, File>> {
  const image = await loadImageFromFile(file);
  const entries = parseAbeAuflagenNotes(notes, [...targetCodes]);
  const targetSet = new Set(targetCodes.map(normalizeAuflagenKuerzel));
  const crops = new Map<string, File>();

  for (const region of regions) {
    if (!targetSet.has(region.code)) continue;
    if (crops.has(region.code)) continue;

    const pixelCrop = normalizedRegionToPixelCrop(image, region);
    if (pixelCrop.width < 8 || pixelCrop.height < 8) continue;

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

  const fallbackEntries = entries.filter((entry) =>
    missingCodes.includes(normalizeAuflagenKuerzel(entry.code)),
  );
  const proportional = estimateProportionalAuflagenCrops(
    image,
    fallbackEntries.length > 0 ? fallbackEntries : entries,
  );

  for (const code of missingCodes) {
    const crop = proportional.get(code);
    if (!crop || crop.width < 8 || crop.height < 8) continue;
    crops.set(
      code,
      await cropImageToJpegFile(image, crop, `auflage-${code}.jpg`),
    );
  }

  if (crops.size === 0 && entries.length === 1) {
    const only = normalizeAuflagenKuerzel(entries[0]!.code);
    if (targetSet.has(only)) {
      crops.set(
        only,
        await cropImageToJpegFile(
          image,
          {
            unit: "px",
            x: Math.round(image.naturalWidth * 0.03),
            y: Math.round(image.naturalHeight * 0.03),
            width: Math.round(image.naturalWidth * 0.94),
            height: Math.round(image.naturalHeight * 0.94),
          },
          `auflage-${only}.jpg`,
        ),
      );
    }
  }

  return crops;
}
