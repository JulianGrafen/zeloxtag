import { toPng } from "html-to-image";

import {
  SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO,
  SHAREABLE_SPEC_CARD_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_WIDTH_PX,
} from "@/components/shareable-spec-card/constants";

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
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
    await waitForImages(clone);
    prepareShareCardExportClone(clone);

    const dataUrl = await toPng(clone, {
      width: SHAREABLE_SPEC_CARD_WIDTH_PX,
      height: SHAREABLE_SPEC_CARD_HEIGHT_PX,
      pixelRatio,
      cacheBust: true,
      skipFonts: false,
    });

    const blob = dataUrlToBlob(dataUrl);
    return new File([blob], options.filename, { type: "image/png" });
  } finally {
    mount.remove();
  }
}
