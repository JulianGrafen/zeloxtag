/** Inline hero bytes for html-to-image (avoids CORS / cookie issues on export). */
export async function promoteShareCardHeroToDataUrl(
  fetchUrl: string,
): Promise<string | null> {
  const trimmed = fetchUrl.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed || null;
  }

  try {
    const response = await fetch(trimmed, {
      credentials: "include",
      cache: "force-cache",
    });
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Failed to read hero image."));
      };
      reader.onerror = () =>
        reject(reader.error ?? new Error("Failed to read hero image."));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
