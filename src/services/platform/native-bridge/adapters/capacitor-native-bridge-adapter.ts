"use client";

import type { INativeBridgeService } from "@/services/platform/native-bridge/native-bridge-service";
import type {
  CapturedImage,
  HapticStyle,
  ShareContentPayload,
  ShareContentResult,
} from "@/services/platform/native-bridge/types";

export class CapacitorNativeBridgeAdapter implements INativeBridgeService {
  async triggerHaptic(style: HapticStyle): Promise<void> {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      const impactStyle =
        style === "success"
          ? ImpactStyle.Heavy
          : style === "medium"
            ? ImpactStyle.Medium
            : ImpactStyle.Light;
      await Haptics.impact({ style: impactStyle });
    } catch {
      // Plugin unavailable — ignore.
    }
  }

  async triggerSelectionHaptic(): Promise<void> {
    try {
      const { Haptics } = await import("@capacitor/haptics");
      await Haptics.selectionChanged();
    } catch {
      // Plugin unavailable — ignore.
    }
  }

  async captureReceiptPhoto(): Promise<CapturedImage | null> {
    try {
      const { Camera, CameraResultType, CameraSource } = await import(
        "@capacitor/camera"
      );
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 90,
        allowEditing: false,
      });

      if (!photo.webPath) {
        return null;
      }

      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const mimeType = photo.format === "png" ? "image/png" : "image/jpeg";
      return {
        blob,
        mimeType,
        fileName: `receipt.${photo.format === "png" ? "png" : "jpg"}`,
      };
    } catch {
      return null;
    }
  }

  async shareContent(payload: ShareContentPayload): Promise<ShareContentResult> {
    try {
      const { Share } = await import("@capacitor/share");
      const files = payload.files ?? [];
      if (files.length > 0 && files[0]) {
        const file = files[0];
        const objectUrl = URL.createObjectURL(file);
        try {
          await Share.share({
            title: payload.title,
            text: payload.text,
            url: objectUrl,
            dialogTitle: payload.title ?? "Teilen",
          });
          return "shared";
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }

      await Share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: payload.title ?? "Teilen",
      });
      return "shared";
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) {
        return "cancelled";
      }
      return "unavailable";
    }
  }
}
