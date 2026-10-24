"use client";

import { downloadStoryImageFile } from "@/lib/share/share-story-image-file";
import { playWebHapticTap } from "@/lib/ui/web-haptics";

import type { INativeBridgeService } from "@/services/platform/native-bridge/native-bridge-service";
import { captureReceiptPhotoViaFileInput } from "@/services/platform/native-bridge/web-capture-receipt-photo";
import type {
  HapticStyle,
  ShareContentPayload,
  ShareContentResult,
} from "@/services/platform/native-bridge/types";

export class WebNativeBridgeAdapter implements INativeBridgeService {
  async triggerHaptic(_style: HapticStyle): Promise<void> {
    playWebHapticTap();
  }

  async triggerSelectionHaptic(): Promise<void> {
    playWebHapticTap();
  }

  async captureReceiptPhoto() {
    return captureReceiptPhotoViaFileInput();
  }

  async shareContent(payload: ShareContentPayload): Promise<ShareContentResult> {
    if (typeof navigator === "undefined") {
      return "unavailable";
    }

    const files = payload.files ?? [];
    const hasShare =
      typeof navigator.share === "function" &&
      typeof window !== "undefined" &&
      window.isSecureContext;

    if (hasShare) {
      try {
        if (files.length > 0) {
          const canShareFiles =
            typeof navigator.canShare !== "function" ||
            navigator.canShare({ files });
          if (canShareFiles) {
            await navigator.share({ files });
            return "shared";
          }
        }

        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        return "shared";
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return "cancelled";
        }
      }
    }

    const file = files[0];
    if (file) {
      downloadStoryImageFile(file);
      return "copied";
    }

    if (payload.url && typeof navigator.clipboard?.writeText === "function") {
      try {
        await navigator.clipboard.writeText(payload.url);
        return "copied";
      } catch {
        return "unavailable";
      }
    }

    return "unavailable";
  }
}
