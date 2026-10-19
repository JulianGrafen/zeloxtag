export type AppPlatform = "web" | "ios" | "android";

export type PlatformSnapshot = {
  isNativeApp: boolean;
  platform: AppPlatform;
  isEmbeddedSocialWebView: boolean;
  canUseStripeCheckout: boolean;
};

export type PlatformRuntimeInput = {
  userAgent: string;
  isNativePlatform: boolean;
  nativePlatform: string;
};
