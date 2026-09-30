export type StoryImageShareResult = "shared" | "aborted" | "unavailable";

export function isLikelyMobileShareDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function hasWebShareApi(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof window !== "undefined" &&
    window.isSecureContext
  );
}

/** Whether the browser reports it can hand off this image file. */
export function canShareStoryImageFile(file: File): boolean {
  if (!hasWebShareApi()) {
    return false;
  }
  if (typeof navigator.canShare !== "function") {
    return true;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function shouldAttemptFileShare(file: File): boolean {
  if (!hasWebShareApi()) {
    return false;
  }
  if (canShareStoryImageFile(file)) {
    return true;
  }
  // iOS/Android sometimes reject canShare() but still open the sheet on share().
  return isLikelyMobileShareDevice();
}

/**
 * Opens the OS share sheet with only the image file.
 * Omit title/text — on iOS, extra fields often block Instagram from accepting the file.
 */
export async function shareStoryImageFile(file: File): Promise<StoryImageShareResult> {
  if (!shouldAttemptFileShare(file)) {
    return "unavailable";
  }

  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "aborted";
    }
    return "unavailable";
  }
}

export function downloadStoryImageFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}
