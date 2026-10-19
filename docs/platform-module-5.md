# Platform Module 5 — Capacitor & API base URL

## Overview

Native shells load the production web app inside a Capacitor WebView (`capacitor.config.ts`). Client code that calls `/api/*` must use an absolute origin when the WebView origin is not the Vercel deployment.

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Prefix for `apiFetch()` (e.g. `https://app.zeloxtag.de`). Empty on web = relative paths. |
| `NEXT_PUBLIC_SITE_URL` | Canonical public origin for links and OG trust badges. |
| `CAPACITOR_SERVER_URL` | URL loaded by the native WebView (defaults to production app). |

## API convention

Use [`apiFetch`](/src/lib/api/api-fetch.ts) instead of raw `fetch("/api/…")` in client code that must work in Capacitor:

```ts
import { apiFetch } from "@/lib/api/api-fetch";

const response = await apiFetch("/api/og/story-card?vehicleId=…", {
  headers: { Accept: "image/png" },
});
```

## Story share (Module 4)

Server route: `GET /api/og/story-card?vehicleId=<uuid>` (owner session). Renders 1080×1920 PNG via `next/og`. UI: **Share Build to Story** → `nativeBridge.shareContent({ files })`.

## Embedded social browsers

Instagram / TikTok in-app browsers show [`EmbeddedSocialBrowserBanner`](/src/components/platform/embedded-social-browser-banner.tsx) with a CTA to open the page in Safari/Chrome.

## Native workflow

```bash
npm run cap:sync
npm run cap:ios   # or cap:android
```

Set `NEXT_PUBLIC_API_BASE_URL` in the native build env before `next build` / sync so bundled client code targets the live API.
