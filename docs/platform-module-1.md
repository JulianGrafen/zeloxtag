# Platform Module 1 — Abstraction Layer

## Overview

`src/services/platform/` centralizes platform detection, billing, and native capabilities (haptics, camera, share). UI must use `usePlatformServices()` — never import Capacitor or RevenueCat directly in components.

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BILLING_NATIVE_ENABLED` | Set to `1` to allow RevenueCat purchases in Capacitor builds |
| `NEXT_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat public SDK key (iOS) |
| `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat public SDK key (Android) |
| `NEXT_PUBLIC_REVENUECAT_PACKAGE_MONTHLY` | Offering package id (default `monthly`) |
| `NEXT_PUBLIC_REVENUECAT_PACKAGE_YEARLY` | Offering package id (default `yearly`) |

Stripe env vars remain unchanged for web checkout.

## Runtime selection

- **Web** → `StripeBillingAdapter` + `WebNativeBridgeAdapter`
- **Capacitor native** → `RevenueCatBillingAdapter` + `CapacitorNativeBridgeAdapter`

Instagram/TikTok in-app browsers are detected (`isEmbeddedSocialWebView`) but still use Stripe checkout per product decision.

## Native workflow

```bash
npm run cap:sync
npm run cap:ios   # or cap:android
```

Capacitor loads the configured remote URL (`CAPACITOR_SERVER_URL` or production app origin).

## Restore purchases

- Web: Stripe Customer Portal via `billing.restorePurchases()`
- Native: RevenueCat SDK restore (server entitlement sync → see Module 1b)
