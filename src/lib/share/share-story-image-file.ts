export type StoryImageShareResult = "shared" | "aborted" | "unavailable";

/** Whether the browser can hand off an image file (e.g. to Instagram Stories). */
export function canShareStoryImageFile(file: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
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

/**
 * Opens the OS share sheet with only the image file.
 * Omit title/text — on iOS, extra fields often block Instagram from accepting the file.
 */
export async function shareStoryImageFile(file: File): Promise<StoryImageShareResult> {
  if (!canShareStoryImageFile(file)) {
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

export function isLikelyMobileShareDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
