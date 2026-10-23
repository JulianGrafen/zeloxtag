import { toShareCardImageFetchUrl } from "@/lib/share/share-card-hero-image-url";

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

function isHeroShareCardImage(img: HTMLImageElement): boolean {
  return img.hasAttribute("data-share-card-hero");
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

      const absoluteUrl = toShareCardImageFetchUrl(rawSrc);
      if (!absoluteUrl) {
        return;
      }

      const isHero = isHeroShareCardImage(img);

      try {
        const sameOrigin =
          new URL(absoluteUrl, window.location.origin).origin ===
          window.location.origin;
        const response = await fetch(absoluteUrl, {
          credentials: "include",
          mode: sameOrigin ? "same-origin" : "cors",
        });
        if (!response.ok) {
          if (isHero) {
            throw new Error("Fahrzeugbild konnte nicht geladen werden.");
          }
          return;
        }
        const dataUrl = await blobToDataUrl(await response.blob());
        img.setAttribute("src", dataUrl);
        img.removeAttribute("crossorigin");
        await waitForImageElement(img);
        if (isHero && img.naturalWidth === 0) {
          throw new Error("Fahrzeugbild konnte nicht geladen werden.");
        }
      } catch (error) {
        if (isHero) {
          throw error instanceof Error
            ? error
            : new Error("Fahrzeugbild konnte nicht geladen werden.");
        }
      }
    }),
  );
}
