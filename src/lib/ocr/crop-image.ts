import type { PixelCrop } from "react-image-crop";

/**
 * Render a pixel crop from an HTMLImageElement to a JPEG File.
 */
export async function cropImageToJpegFile(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName = `abe-crop-${Date.now()}.jpg`,
  quality = 0.92,
): Promise<File> {
  if (crop.width < 2 || crop.height < 2) {
    throw new Error("Ausschnitt ist zu klein.");
  }

  const displayWidth = image.width || image.naturalWidth;
  const displayHeight = image.height || image.naturalHeight;
  const scaleX = displayWidth > 0 ? image.naturalWidth / displayWidth : 1;
  const scaleY = displayHeight > 0 ? image.naturalHeight / displayHeight : 1;

  const width = Math.max(1, Math.round(crop.width * scaleX));
  const height = Math.max(1, Math.round(crop.height * scaleY));
  const sx = Math.max(0, Math.round(crop.x * scaleX));
  const sy = Math.max(0, Math.round(crop.y * scaleY));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar.");

  ctx.drawImage(image, sx, sy, width, height, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Ausschnitt konnte nicht gespeichert werden.")),
      "image/jpeg",
      quality,
    );
  });

  canvas.width = 0;
  canvas.height = 0;

  return new File([blob], fileName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
