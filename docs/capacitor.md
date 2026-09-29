# ZeloxTag Capacitor (iOS + Android)

Native shells load the hosted Next.js app from **https://app.zeloxtag.de** (see [`capacitor.config.ts`](../capacitor.config.ts)). Server routes, Supabase auth, and cron stay on Vercel.

## Prerequisites

- Node.js + npm (repo root)
- **iOS:** Xcode 15+, CocoaPods (`brew install cocoapods`), Apple Developer account
- **Android:** Android Studio, JDK 17+
- Vercel env for Universal / App Links (see below)

## Scripts

```bash
npm run cap:sync      # copy web assets + update native projects
npm run cap:ios       # sync + open Xcode
npm run cap:android   # sync + open Android Studio
```

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `CAPACITOR_SERVER_URL` | Local shell dev | e.g. `http://192.168.x.x:3000` (`npm run dev` on LAN). Default: production URL baked at sync time. |
| `APPLE_TEAM_ID` | Vercel production | AASA at `/.well-known/apple-app-site-association` |
| `ANDROID_APP_LINK_SHA256` | Vercel production | Comma-separated SHA-256 cert fingerprints for `/.well-known/assetlinks.json` |

Bundle / package id: **`de.zeloxtag.app`**

### Android SHA-256

Debug keystore:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Use the **SHA256** line (colons optional in env).

## Universal Links (iOS)

1. Set `APPLE_TEAM_ID` on Vercel and deploy.
2. Verify: `curl -s https://app.zeloxtag.de/.well-known/apple-app-site-association`
3. Xcode target **App** → Signing & Capabilities → enable **Associated Domains** if not present (entitlements file: [`ios/App/App/App.entitlements`](../ios/App/App/App.entitlements) → `applinks:app.zeloxtag.de`).
4. Enable the capability on your Apple Developer app id for `de.zeloxtag.app`.

## App Links (Android)

1. Set `ANDROID_APP_LINK_SHA256` on Vercel (debug + release fingerprints as needed).
2. Intent filters: [`android/app/src/main/AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml)
3. After install, test: `adb shell am start -a android.intent.action.VIEW -d "https://app.zeloxtag.de/v/<uuid>"`

## Local LAN dev

```bash
CAPACITOR_SERVER_URL=http://192.168.x.x:3000 npm run cap:sync
```

- iOS: may need ATS exception for HTTP in debug (`Info.plist` — only for dev).
- Android: `android:usesCleartextTraffic` in debug manifest if needed.

## Release checklist

- [ ] Login, MFA, magic link (must stay `https://app.zeloxtag.de/...`)
- [ ] QR `/v/{uuid}` opens app via Universal / App Link
- [ ] Claim flow + camera scan one invoice
- [ ] App Store copy: owner app for QR vehicle dossier (not “website wrapper” only)

## Manual QA (short)

1. Install TestFlight / internal APK.
2. Cold start → dashboard or login loads from production.
3. Tap QR link → in-app route `/v/...`.
4. Sign in → scan Beleg → upload succeeds.
