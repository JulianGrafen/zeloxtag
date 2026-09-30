const JPEG_QUALITY = 0.92;

/** Instagram / Facebook in-app browsers usually block Web Share with files. */
export function isEmbeddedSocialInAppBrowser(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Instagram|FB_IAB|FBAV|FBAN|Line\//i.test(navigator.userAgent);
}

function jpegFilenameFromPng(name: string): string {
  return name.replace(/\.png$/i, ".jpg");
}

/**
 * iOS + Instagram reliably accept JPEG in the system share sheet; PNG often falls back to download.
 */
export async function createStoryJpegForNativeShare(
  pngFile: File,
): Promise<File> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return pngFile;
  }

  const bitmap = await createImageBitmap(pngFile);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return pngFile;
  }

  context.fillStyle = "#0a0a0a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/jpeg", JPEG_QUALITY);
  });

  if (!blob) {
    return pngFile;
  }

  return new File([blob], jpegFilenameFromPng(pngFile.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
