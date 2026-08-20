/**
 * Load image files into HTMLImageElement for canvas pipelines.
 */

export type LoadImageFromFileOptions = {
  /**
   * Apply JPEG/HEIC EXIF orientation when decoding.
   * Default false — avoids double-rotation after browser-image-compression or
   * when uploading high-resolution files whose pixels are already upright.
   */
  applyExifOrientation?: boolean;
};

export async function loadImageFromFile(
  file: File,
  options: LoadImageFromFileOptions = {},
): Promise<HTMLImageElement> {
  const applyExifOrientation = options.applyExifOrientation ?? false;

  const looksLikeImage =
    file.type.startsWith("image/") ||
    file.type === "" ||
    /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name);

  if (!looksLikeImage) {
    throw new Error("Nur Bilddateien werden unterstützt.");
  }

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: applyExifOrientation ? "from-image" : "none",
      });
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bitmap.close();
        throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
      }
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("Bild konnte nicht geladen werden."));
        image.src = canvas.toDataURL("image/jpeg", 0.92);
      });
      return image;
    } catch {
      // Fall through to <img> object URL path.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Bild konnte nicht geladen werden. Bitte JPEG oder PNG verwenden.",
        ),
      );
    };
    image.src = url;
  });
}

type SizedImageSource =
  | HTMLImageElement
  | HTMLCanvasElement
  | ImageBitmap
  | OffscreenCanvas;

function sourceDimensions(image: SizedImageSource): {
  width: number;
  height: number;
} {
  if (image instanceof HTMLImageElement) {
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  }
  return { width: image.width, height: image.height };
}

/** Downscale large camera images before interactive crop for smoother dragging. */
export function drawImageToCanvas(
  image: SizedImageSource,
  maxWidth = 2048,
): HTMLCanvasElement {
  const { width: sourceWidth, height: sourceHeight } = sourceDimensions(image);

  const scale = Math.min(1, maxWidth / Math.max(1, sourceWidth));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}
