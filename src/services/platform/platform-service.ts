import type {
  AppPlatform,
  PlatformRuntimeInput,
  PlatformSnapshot,
} from "@/services/platform/types";

const EMBEDDED_SOCIAL_UA =
  /Instagram|FB_IAB|FBAV|FBAN|Line\/|BytedanceWebview|TikTok|musical_ly/i;

/** Pure UA check — shared with share flows and billing analytics. */
export function detectEmbeddedSocialWebView(userAgent: string): boolean {
  return EMBEDDED_SOCIAL_UA.test(userAgent);
}

function resolveAppPlatform(input: PlatformRuntimeInput): AppPlatform {
  if (!input.isNativePlatform) {
    return "web";
  }
  if (input.nativePlatform === "ios") {
    return "ios";
  }
  if (input.nativePlatform === "android") {
    return "android";
  }
  return "web";
}

export function detectPlatformSnapshot(
  input: PlatformRuntimeInput,
): PlatformSnapshot {
  const isNativeApp = input.isNativePlatform;
  const platform = resolveAppPlatform(input);
  const isEmbeddedSocialWebView =
    !isNativeApp && detectEmbeddedSocialWebView(input.userAgent);

  return {
    isNativeApp,
    platform,
    isEmbeddedSocialWebView,
    canUseStripeCheckout: !isNativeApp,
  };
}

export class PlatformService {
  readonly snapshot: PlatformSnapshot;

  constructor(snapshot: PlatformSnapshot) {
    this.snapshot = snapshot;
  }

  get isNativeApp(): boolean {
    return this.snapshot.isNativeApp;
  }

  get platform(): AppPlatform {
    return this.snapshot.platform;
  }

  get isEmbeddedSocialWebView(): boolean {
    return this.snapshot.isEmbeddedSocialWebView;
  }

  get canUseStripeCheckout(): boolean {
    return this.snapshot.canUseStripeCheckout;
  }
}
