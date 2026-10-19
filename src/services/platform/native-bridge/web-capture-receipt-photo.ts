import type { CapturedImage } from "@/services/platform/native-bridge/types";

function readFileAsBlob(file: File): Promise<Blob> {
  return Promise.resolve(file);
}

/**
 * Opens a one-shot camera/gallery picker on web (Beleg-Scan entry point).
 * Must run in a user gesture when possible.
 */
export function captureReceiptPhotoViaFileInput(): Promise<CapturedImage | null> {
  if (typeof document === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.display = "none";

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      cleanup();
      if (!file) {
        resolve(null);
        return;
      }
      void readFileAsBlob(file).then((blob) => {
        resolve({
          blob,
          mimeType: file.type || "image/jpeg",
          fileName: file.name || "receipt.jpg",
        });
      });
    });

    input.addEventListener("cancel", () => {
      cleanup();
      resolve(null);
    });

    document.body.appendChild(input);
    input.click();
  });
}
