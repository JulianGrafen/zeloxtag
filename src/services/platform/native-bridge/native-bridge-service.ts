import type {
  CapturedImage,
  HapticStyle,
  ShareContentPayload,
  ShareContentResult,
} from "@/services/platform/native-bridge/types";

export interface INativeBridgeService {
  triggerHaptic(style: HapticStyle): Promise<void>;
  captureReceiptPhoto(): Promise<CapturedImage | null>;
  shareContent(payload: ShareContentPayload): Promise<ShareContentResult>;
}
