function waitForImageElement(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read image blob."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image blob."));
    reader.readAsDataURL(blob);
  });
}

/**
 * html-to-image refetches img sources without cookies by default.
 * Owner silhouette URLs (/api/vehicle/silhouette/…) need session cookies.
 */
export async function inlineShareCardImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(async (img) => {
      const rawSrc = img.currentSrc || img.getAttribute("src") || "";
      if (!rawSrc || rawSrc.startsWith("data:") || rawSrc.startsWith("blob:")) {
        return;
      }

      let absoluteUrl = rawSrc;
      try {
        absoluteUrl = new URL(rawSrc, window.location.origin).href;
      } catch {
        return;
      }

      try {
        const response = await fetch(absoluteUrl, {
          credentials: "include",
          mode: "cors",
        });
        if (!response.ok) {
          return;
        }
        const dataUrl = await blobToDataUrl(await response.blob());
        img.setAttribute("src", dataUrl);
        img.removeAttribute("crossorigin");
        await waitForImageElement(img);
      } catch {
        // Keep original src — export may still partially succeed.
      }
    }),
  );
}
