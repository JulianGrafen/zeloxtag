export type { AppPlatform, PlatformRuntimeInput, PlatformSnapshot } from "@/services/platform/types";
export {
  detectEmbeddedSocialWebView,
  detectPlatformSnapshot,
  PlatformService,
} from "@/services/platform/platform-service";
export type {
  BillingPlanType,
  BillingPurchaseContext,
  BillingRestoreResult,
  BillingResult,
} from "@/services/platform/billing/billing-types";
export type { IBillingService } from "@/services/platform/billing/billing-service";
export {
  mapPlanTypeToProInterval,
  mapProIntervalToPlanType,
} from "@/services/platform/billing/plan-type";
export type { INativeBridgeService } from "@/services/platform/native-bridge/native-bridge-service";
export type {
  CapturedImage,
  HapticStyle,
  ShareContentPayload,
  ShareContentResult,
} from "@/services/platform/native-bridge/types";
export {
  createPlatformServices,
  readPlatformRuntimeInput,
  type PlatformServices,
} from "@/services/platform/create-platform-services";
export {
  PlatformServicesProvider,
  usePlatformServices,
} from "@/services/platform/context/platform-services-context";
