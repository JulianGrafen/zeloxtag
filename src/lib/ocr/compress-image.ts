/**
 * Client-side image compression before OCR upload (cost + payload control).
 * Browser-only — uses Canvas. Skips non-image files.
 */

const DEFAULT_MAX_EDGE = 1280;
const DEFAULT_QUALITY = 0.72;

export type CompressImageOptions = {
  maxEdge?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
};

export async function compressImageForOcr(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("OCR accepts images only (JPEG, PNG, WebP).");
  }

  // HEIC often cannot be drawn to canvas in browsers — send as-is.
  if (file.type === "image/heic" || file.type === "image/heif") {
    return file;
  }

  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const outputType = options.mimeType ?? "image/jpeg";

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas unavailable for image compression.");
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error("Image compression failed."));
            return;
          }
          resolve(result);
        },
        outputType,
        quality,
      );
    });

    // Keep original if compression somehow grew the payload.
    if (blob.size >= file.size && scale === 1) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "invoice";
    const extension = outputType === "image/webp" ? "webp" : "jpg";

    return new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
