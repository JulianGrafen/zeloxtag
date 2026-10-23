import { toPng } from "html-to-image";

import { inlineShareCardImages } from "@/lib/share/inline-share-card-images";

import {
  SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO,
  SHAREABLE_SPEC_CARD_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_WIDTH_PX,
} from "@/components/shareable-spec-card/constants";

/**
 * WebKit (Safari, every iOS browser, WKWebView) paints <img> inside the SVG
 * foreignObject only after the image was decoded by an earlier render, so the
 * first html-to-image pass comes back without the vehicle photo.
 */
const WEBKIT_RENDER_PASSES = 3;

export function isWebKitRenderer(userAgent?: string): boolean {
  const ua =
    userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /AppleWebKit/i.test(ua) && !/Chrome\/|Chromium\/|Edg\//i.test(ua);
}

async function decodeImages(root: HTMLElement): Promise<void> {
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map((img) =>
      typeof img.decode === "function" ? img.decode().catch(() => undefined) : undefined,
    ),
  );
}

function imageReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
}

async function waitForImages(
  root: HTMLElement,
  timeoutMs = 12_000,
  options?: { requireHero?: boolean },
): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) {
    if (options?.requireHero) {
      throw new Error("Fahrzeugbild konnte nicht geladen werden.");
    }
    return;
  }

  const deadline = Date.now() + timeoutMs;

  await Promise.all(
    images.map(async (img) => {
      const isHero = img.hasAttribute("data-share-card-hero");
      while (!imageReady(img)) {
        if (Date.now() >= deadline) {
          if (isHero && options?.requireHero) {
            throw new Error("Fahrzeugbild konnte nicht geladen werden.");
          }
          return;
        }
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          window.setTimeout(done, 120);
        });
      }
    }),
  );
}

async function waitForFonts(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
}

/** html-to-image clones DOM; framer-motion can leave radar shapes at opacity 0. */
function prepareShareCardExportClone(root: HTMLElement): void {
  root.querySelectorAll<SVGElement | HTMLElement>(
    "svg g, svg polygon, svg circle",
  ).forEach((node) => {
    node.style.opacity = "1";
  });
  root.querySelectorAll<HTMLElement>("[data-share-dna-block]").forEach((block) => {
    block.style.opacity = "1";
    block.style.visibility = "visible";
  });
  root.querySelectorAll<HTMLElement>("[data-share-instagram-handle]").forEach((row) => {
    row.style.opacity = "1";
    row.style.visibility = "visible";
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

export type CaptureShareCardPngFileOptions = {
  filename: string;
  pixelRatio?: number;
};

/**
 * Renders a 1080×1920 Story PNG from the live preview node (off-screen clone).
 */
export async function captureShareCardPngFile(
  node: HTMLElement,
  options: CaptureShareCardPngFileOptions,
): Promise<File> {
  const requireHero = Boolean(
    node.querySelector("img[data-share-card-hero]"),
  );
  const pixelRatio =
    options.pixelRatio ?? SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO;

  const mount = document.createElement("div");
  mount.setAttribute("aria-hidden", "true");
  mount.style.position = "fixed";
  mount.style.left = "0";
  mount.style.top = "0";
  mount.style.zIndex = "-1";
  mount.style.pointerEvents = "none";

  const clone = node.cloneNode(true) as HTMLElement;
  mount.appendChild(clone);
  document.body.appendChild(mount);

  try {
    await waitForFonts();
    await waitForImages(node, 12_000, { requireHero });
    prepareShareCardExportClone(clone);
    await inlineShareCardImages(clone);
    await waitForImages(clone, 12_000, { requireHero });
    await decodeImages(clone);

    const renderOptions = {
      width: SHAREABLE_SPEC_CARD_WIDTH_PX,
      height: SHAREABLE_SPEC_CARD_HEIGHT_PX,
      pixelRatio,
      cacheBust: false,
      skipFonts: false,
      fetchRequestInit: { credentials: "include" as RequestCredentials },
    };

    const renderPasses = isWebKitRenderer() ? WEBKIT_RENDER_PASSES : 1;
    let dataUrl = "";
    for (let pass = 0; pass < renderPasses; pass += 1) {
      dataUrl = await toPng(clone, renderOptions);
    }

    const blob = dataUrlToBlob(dataUrl);
    return new File([blob], options.filename, { type: "image/png" });
  } finally {
    mount.remove();
  }
}
